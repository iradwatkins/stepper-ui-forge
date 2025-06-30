import { supabase } from '../supabase'
import { InventoryService } from './InventoryService'
import { OrderService, OrderItem } from './OrderService'
import { TicketService } from './TicketService'
import { EmailService } from './EmailService'

export interface CartItem {
  ticket_type_id: string
  quantity: number
  price: number
  ticket_type_name?: string
}

export interface CustomerInfo {
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export interface PaymentInfo {
  method: 'stripe' | 'cash_app' | 'cash'
  stripe_payment_intent_id?: string
  cash_app_payment_id?: string
  cash_verification_code?: string
  amount: number
}

export interface AtomicOrderResult {
  success: boolean
  orderId?: string
  ticketIds?: string[]
  error?: string
  errorCode?: 'INSUFFICIENT_INVENTORY' | 'RESERVATION_FAILED' | 'PAYMENT_FAILED' | 'ORDER_CREATION_FAILED'
  availabilityErrors?: Array<{
    ticketTypeId: string
    requested: number
    available: number
  }>
}

export class AtomicOrderService {
  /**
   * Create an order with atomic inventory management
   * This is the main entry point for all ticket purchases
   */
  static async createAtomicOrder(
    customer: CustomerInfo,
    payment: PaymentInfo,
    cartItems: CartItem[]
  ): Promise<AtomicOrderResult> {
    let reservationIds: string[] = []
    
    try {
      // Step 1: Validate cart items have positive quantities
      if (!cartItems.length || cartItems.some(item => item.quantity <= 0)) {
        return {
          success: false,
          error: 'Invalid cart items',
          errorCode: 'ORDER_CREATION_FAILED'
        }
      }

      // Step 2: Check availability for all items
      const availabilityRequests = cartItems.map(item => ({
        ticketTypeId: item.ticket_type_id,
        quantity: item.quantity
      }))

      const availabilityResults = await InventoryService.checkAvailability(availabilityRequests)
      const unavailableItems = availabilityResults.filter(result => !result.available)

      if (unavailableItems.length > 0) {
        return {
          success: false,
          error: 'Some tickets are no longer available',
          errorCode: 'INSUFFICIENT_INVENTORY',
          availabilityErrors: unavailableItems.map(item => ({
            ticketTypeId: item.ticketTypeId,
            requested: item.requestedQuantity,
            available: item.availableQuantity
          }))
        }
      }

      // Step 3: Create reservations for all items
      const reservationResult = await InventoryService.createMultipleReservations(
        availabilityRequests,
        15 // 15 minute hold
      )

      if (!reservationResult.success || !reservationResult.reservationIds) {
        return {
          success: false,
          error: reservationResult.error || 'Failed to reserve tickets',
          errorCode: 'RESERVATION_FAILED'
        }
      }

      reservationIds = reservationResult.reservationIds

      // Step 4: Create the order using existing OrderService
      const orderItems: OrderItem[] = cartItems.map(item => ({
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.quantity * item.price
      }))

      const orderResult = await OrderService.createOrder({
        customer,
        payment,
        cartItems: orderItems
      })

      if (!orderResult.success || !orderResult.orderId) {
        // Release reservations if order creation failed
        await this.releaseReservations(reservationIds)
        
        return {
          success: false,
          error: orderResult.error || 'Failed to create order',
          errorCode: 'ORDER_CREATION_FAILED'
        }
      }

      // Step 5: Complete reservations (convert to sales) atomically
      const completionResults = await Promise.all(
        reservationIds.map(id => InventoryService.completeReservation(id))
      )

      const failedCompletions = completionResults.filter(result => !result)
      
      if (failedCompletions.length > 0) {
        // This is a critical error - order was created but inventory wasn't updated
        console.error('CRITICAL ERROR: Order created but reservations not completed', {
          orderId: orderResult.orderId,
          reservationIds,
          failedCompletions: failedCompletions.length
        })

        // Try to release remaining reservations
        await this.releaseReservations(reservationIds)

        // TODO: Add alerting/monitoring for this critical path
        return {
          success: false,
          error: 'Critical error during order completion. Please contact support.',
          errorCode: 'ORDER_CREATION_FAILED'
        }
      }

      // Step 6: Generate tickets using existing TicketService
      const ticketResult = await TicketService.generateTickets(
        orderResult.orderId,
        orderItems
      )

      if (!ticketResult.success) {
        console.error('Error generating tickets for completed order', {
          orderId: orderResult.orderId,
          error: ticketResult.error
        })
        
        // Order and inventory are committed, but tickets failed to generate
        // This is not a critical error - tickets can be regenerated later
      }

      // Step 7: Send confirmation email
      try {
        await EmailService.sendOrderConfirmation(
          customer.email,
          orderResult.orderId,
          ticketResult.ticketIds || []
        )
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError)
        // Don't fail the order for email errors
      }

      return {
        success: true,
        orderId: orderResult.orderId,
        ticketIds: ticketResult.ticketIds
      }

    } catch (error) {
      console.error('Error creating atomic order:', error)
      
      // Release any reservations that were created
      if (reservationIds.length > 0) {
        await this.releaseReservations(reservationIds)
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'ORDER_CREATION_FAILED'
      }
    }
  }

  /**
   * Pre-validate a cart before checkout
   */
  static async validateCart(cartItems: CartItem[]): Promise<{
    valid: boolean
    errors: Array<{
      ticketTypeId: string
      error: string
      requested: number
      available: number
    }>
  }> {
    if (!cartItems.length) {
      return { valid: true, errors: [] }
    }

    const availabilityRequests = cartItems.map(item => ({
      ticketTypeId: item.ticket_type_id,
      quantity: item.quantity
    }))

    const availabilityResults = await InventoryService.checkAvailability(availabilityRequests)
    const errors = availabilityResults
      .filter(result => !result.available)
      .map(result => ({
        ticketTypeId: result.ticketTypeId,
        error: `Only ${result.availableQuantity} tickets available, but ${result.requestedQuantity} requested`,
        requested: result.requestedQuantity,
        available: result.availableQuantity
      }))

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Create a reservation for a cart (for holding during checkout)
   */
  static async reserveCart(
    cartItems: CartItem[],
    holdMinutes: number = 15
  ): Promise<{
    success: boolean
    reservationIds?: string[]
    error?: string
    expiresAt?: Date
  }> {
    const availabilityRequests = cartItems.map(item => ({
      ticketTypeId: item.ticket_type_id,
      quantity: item.quantity
    }))

    const result = await InventoryService.createMultipleReservations(
      availabilityRequests,
      holdMinutes
    )

    if (result.success && result.reservationIds) {
      return {
        success: true,
        reservationIds: result.reservationIds,
        expiresAt: new Date(Date.now() + holdMinutes * 60 * 1000)
      }
    }

    return {
      success: false,
      error: result.error
    }
  }

  /**
   * Complete a reserved order (when payment is successful)
   */
  static async completeReservedOrder(
    reservationIds: string[],
    customer: CustomerInfo,
    payment: PaymentInfo
  ): Promise<AtomicOrderResult> {
    try {
      // Step 1: Validate all reservations are still active
      const validationResults = await Promise.all(
        reservationIds.map(id => InventoryService.isReservationValid(id))
      )

      if (validationResults.some(valid => !valid)) {
        return {
          success: false,
          error: 'One or more reservations have expired',
          errorCode: 'RESERVATION_FAILED'
        }
      }

      // Step 2: Get reservation details to create order items
      const reservations = await Promise.all(
        reservationIds.map(id => InventoryService.getReservation(id))
      )

      const validReservations = reservations.filter(r => r !== null)
      
      if (validReservations.length !== reservationIds.length) {
        return {
          success: false,
          error: 'Failed to retrieve reservation details',
          errorCode: 'RESERVATION_FAILED'
        }
      }

      // Step 3: Get ticket type details for pricing
      const ticketTypes = await Promise.all(
        validReservations.map(r => 
          InventoryService.getTicketTypeWithAvailability(r!.ticket_type_id)
        )
      )

      // Step 4: Create order items
      const orderItems: OrderItem[] = validReservations.map((reservation, index) => {
        const ticketType = ticketTypes[index]
        return {
          ticket_type_id: reservation!.ticket_type_id,
          quantity: reservation!.quantity,
          unit_price: ticketType?.price || 0,
          total_price: reservation!.quantity * (ticketType?.price || 0)
        }
      })

      // Step 5: Create order
      const orderResult = await OrderService.createOrder({
        customer,
        payment,
        cartItems: orderItems
      })

      if (!orderResult.success || !orderResult.orderId) {
        return {
          success: false,
          error: orderResult.error || 'Failed to create order',
          errorCode: 'ORDER_CREATION_FAILED'
        }
      }

      // Step 6: Complete all reservations
      const completionResults = await Promise.all(
        reservationIds.map(id => InventoryService.completeReservation(id))
      )

      const failedCompletions = completionResults.filter(result => !result)
      
      if (failedCompletions.length > 0) {
        console.error('CRITICAL ERROR: Order created but reservations not completed', {
          orderId: orderResult.orderId,
          reservationIds,
          failedCompletions: failedCompletions.length
        })

        return {
          success: false,
          error: 'Critical error during order completion',
          errorCode: 'ORDER_CREATION_FAILED'
        }
      }

      // Step 7: Generate tickets
      const ticketResult = await TicketService.generateTickets(
        orderResult.orderId,
        orderItems
      )

      return {
        success: true,
        orderId: orderResult.orderId,
        ticketIds: ticketResult.ticketIds
      }

    } catch (error) {
      console.error('Error completing reserved order:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ORDER_CREATION_FAILED'
      }
    }
  }

  /**
   * Helper method to release multiple reservations
   */
  private static async releaseReservations(reservationIds: string[]): Promise<void> {
    await Promise.all(
      reservationIds.map(id => InventoryService.releaseReservation(id))
    )
  }

  /**
   * Get real-time availability for multiple ticket types
   */
  static async getBatchAvailability(ticketTypeIds: string[]): Promise<Map<string, number>> {
    const availabilityMap = new Map<string, number>()

    const results = await Promise.all(
      ticketTypeIds.map(async (id) => ({
        id,
        availability: await InventoryService.getAvailableQuantity(id)
      }))
    )

    results.forEach(result => {
      availabilityMap.set(result.id, result.availability)
    })

    return availabilityMap
  }

  /**
   * Extend reservation expiry (for slow checkout processes)
   */
  static async extendReservations(
    reservationIds: string[],
    additionalMinutes: number = 15
  ): Promise<{ success: boolean; extended: number; failed: number }> {
    const results = await Promise.all(
      reservationIds.map(id => InventoryService.extendReservation(id, additionalMinutes))
    )

    const extended = results.filter(result => result).length
    const failed = results.length - extended

    return {
      success: failed === 0,
      extended,
      failed
    }
  }
}