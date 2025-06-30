import { supabase } from '@/integrations/supabase/client'
import { CartItem } from '@/contexts/CartContext'
import { FeeReconciliationService } from './FeeReconciliationService'

// Type assertion for supabase client to work with our database
const db = supabase as any

// Define types based on our database schema
interface Order {
  id: string
  event_id: string
  customer_email: string
  customer_name: string | null
  customer_phone: string | null
  total_amount: number
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  order_status: 'pending' | 'processing' | 'awaiting_cash_payment' | 'cash_confirmed' | 'completed' | 'cancelled' | 'refunded'
  payment_intent_id: string | null
  payment_method: string | null
  created_at: string
  updated_at: string
}

interface OrderInsert {
  id?: string
  event_id: string
  customer_email: string
  customer_name?: string | null
  customer_phone?: string | null
  total_amount: number
  payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
  order_status?: 'pending' | 'processing' | 'awaiting_cash_payment' | 'cash_confirmed' | 'completed' | 'cancelled' | 'refunded'
  payment_intent_id?: string | null
  payment_method?: string | null
  created_at?: string
  updated_at?: string
}

interface OrderItem {
  id: string
  order_id: string
  ticket_type_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

interface OrderItemInsert {
  id?: string
  order_id: string
  ticket_type_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at?: string
}

export interface CustomerInfo {
  email: string
  name?: string
  phone?: string
}

export interface PaymentInfo {
  paymentIntentId?: string
  paymentMethod: string
  totalAmount: number
  status?: 'awaiting_cash_payment' | 'completed' | 'pending'
}

export interface CreateOrderRequest {
  customer: CustomerInfo
  payment: PaymentInfo
  cartItems: CartItem[]
}

export interface CreateOrderResponse {
  order: Order
  orderItems: OrderItem[]
  success: boolean
  error?: string
}

export class OrderService {
  /**
   * Create an order and order items from cart data after successful payment
   */
  static async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      // Validate input
      if (!request.cartItems || request.cartItems.length === 0) {
        throw new Error('Cart items are required to create an order')
      }

      if (!request.customer.email) {
        throw new Error('Customer email is required')
      }

      // Group cart items by event (orders are per-event in our schema)
      const itemsByEvent = request.cartItems.reduce((acc, item) => {
        if (!acc[item.eventId]) {
          acc[item.eventId] = []
        }
        acc[item.eventId].push(item)
        return acc
      }, {} as Record<string, CartItem[]>)

      // For now, we'll create one order per event (this could be optimized)
      const allOrders: Order[] = []
      const allOrderItems: OrderItem[] = []

      for (const [eventId, eventItems] of Object.entries(itemsByEvent)) {
        // Calculate total for this event
        const eventTotal = eventItems.reduce((sum, item) => {
          return sum + (item.price * item.quantity)
        }, 0)

        // Create order record
        const orderData: OrderInsert = {
          event_id: eventId,
          customer_email: request.customer.email,
          customer_name: request.customer.name || null,
          customer_phone: request.customer.phone || null,
          total_amount: eventTotal,
          payment_status: request.payment.paymentMethod === 'cash' ? 'pending' : 'completed',
          order_status: request.payment.status === 'awaiting_cash_payment' ? 'awaiting_cash_payment' : 'completed',
          payment_intent_id: request.payment.paymentIntentId || null,
          payment_method: request.payment.paymentMethod,
        }

        const { data: order, error: orderError } = await db
          .from('orders')
          .insert(orderData)
          .select()
          .single()

        if (orderError || !order) {
          throw new Error(`Failed to create order: ${orderError?.message}`)
        }

        allOrders.push(order)

        // Create order items for this order
        const orderItemsData: OrderItemInsert[] = eventItems.map(item => ({
          order_id: order.id,
          ticket_type_id: item.ticketTypeId,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        }))

        const { data: orderItems, error: itemsError } = await db
          .from('order_items')
          .insert(orderItemsData)
          .select()

        if (itemsError || !orderItems) {
          throw new Error(`Failed to create order items: ${itemsError?.message}`)
        }

        allOrderItems.push(...orderItems)

        // Handle fee reconciliation for online payments
        if (request.payment.paymentMethod !== 'cash' && allOrders[0]) {
          try {
            // Get the organizer ID from the event
            const { data: eventData, error: eventError } = await db
              .from('events')
              .select('owner_id')
              .eq('id', eventId)
              .single();

            if (!eventError && eventData) {
              // Process fee reconciliation for this online payment
              const feeDeduction = await FeeReconciliationService.processOnlinePaymentFeeDeduction(
                eventData.owner_id,
                allOrders[0].id,
                eventTotal
              );

              console.log('Fee reconciliation processed:', {
                organizerId: eventData.owner_id,
                orderId: allOrders[0].id,
                originalFee: feeDeduction.originalFee,
                additionalCashFeeDeducted: feeDeduction.additionalCashFeeDeducted,
                totalFeeDeducted: feeDeduction.totalFeeDeducted,
                remainingCashFeesOwed: feeDeduction.remainingCashFeesOwed
              });
            }
          } catch (feeError) {
            // Don't fail the order creation if fee reconciliation fails
            console.warn('Fee reconciliation failed but order creation succeeded:', feeError);
          }
        }
      }

      // For simplicity, return the first order (most common case is single event)
      // In a multi-event scenario, you might want to return all orders
      return {
        order: allOrders[0],
        orderItems: allOrderItems,
        success: true,
      }

    } catch (error) {
      console.error('OrderService.createOrder failed:', error)
      return {
        order: {} as Order,
        orderItems: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Get orders for a specific customer
   */
  static async getOrdersByCustomer(customerEmail: string): Promise<Order[]> {
    try {
      const { data: orders, error } = await db
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            ticket_types (
              name,
              description,
              event_id,
              events (
                title,
                date,
                time,
                location
              )
            )
          )
        `)
        .eq('customer_email', customerEmail)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch orders: ${error.message}`)
      }

      return orders || []
    } catch (error) {
      console.error('OrderService.getOrdersByCustomer failed:', error)
      return []
    }
  }

  /**
   * Get a specific order by ID
   */
  static async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const { data: order, error } = await db
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            ticket_types (
              name,
              description,
              event_id,
              events (
                title,
                date,
                time,
                location
              )
            )
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch order: ${error.message}`)
      }

      return order
    } catch (error) {
      console.error('OrderService.getOrderById failed:', error)
      return null
    }
  }

  /**
   * Update order payment status
   */
  static async updateOrderStatus(
    orderId: string, 
    status: 'pending' | 'completed' | 'failed' | 'refunded'
  ): Promise<boolean> {
    try {
      const { error } = await db
        .from('orders')
        .update({ 
          payment_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (error) {
        throw new Error(`Failed to update order status: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('OrderService.updateOrderStatus failed:', error)
      return false
    }
  }

  /**
   * Get order statistics for an event (useful for event organizers)
   */
  static async getEventOrderStats(eventId: string) {
    try {
      const { data: stats, error } = await db
        .from('orders')
        .select(`
          id,
          total_amount,
          payment_status,
          created_at,
          order_items (
            quantity,
            ticket_types (
              name
            )
          )
        `)
        .eq('event_id', eventId)

      if (error) {
        throw new Error(`Failed to fetch order stats: ${error.message}`)
      }

      // Calculate summary statistics
      const totalOrders = stats?.length || 0
      const completedOrders = stats?.filter(order => order.payment_status === 'completed') || []
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_amount, 0)
      const totalTicketsSold = completedOrders.reduce((sum, order) => {
        return sum + (order.order_items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0)
      }, 0)

      return {
        totalOrders,
        completedOrders: completedOrders.length,
        totalRevenue,
        totalTicketsSold,
        orders: stats || [],
      }
    } catch (error) {
      console.error('OrderService.getEventOrderStats failed:', error)
      return {
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        totalTicketsSold: 0,
        orders: [],
      }
    }
  }
}