import { supabase } from '../supabase'

export interface TicketReservation {
  id: string
  ticket_type_id: string
  session_id: string
  quantity: number
  reserved_at: string
  expires_at: string
  status: 'active' | 'expired' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface TicketTypeWithAvailability {
  id: string
  event_id: string
  name: string
  description: string
  price: number
  quantity: number
  sold_quantity: number
  available_quantity: number
  version: number
  created_at: string
  updated_at: string
}

export interface AvailabilityCheckResult {
  available: boolean
  availableQuantity: number
  requestedQuantity: number
  ticketTypeId: string
}

export interface ReservationResult {
  success: boolean
  reservationId?: string
  error?: string
  availableQuantity?: number
}

export class InventoryService {
  private static SESSION_ID_KEY = 'inventory_session_id'
  private static DEFAULT_HOLD_MINUTES = 15

  /**
   * Get or create a session ID for tracking reservations
   */
  static getSessionId(): string {
    if (typeof window === 'undefined') {
      return `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    let sessionId = sessionStorage.getItem(this.SESSION_ID_KEY)
    if (!sessionId) {
      sessionId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem(this.SESSION_ID_KEY, sessionId)
    }
    return sessionId
  }

  /**
   * Get available quantity for a ticket type (real-time)
   */
  static async getAvailableQuantity(ticketTypeId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_available_quantity', {
        ticket_type_id_param: ticketTypeId
      })

      if (error) {
        console.error('Error getting available quantity:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Error getting available quantity:', error)
      return 0
    }
  }

  /**
   * Get ticket type with real-time availability
   */
  static async getTicketTypeWithAvailability(ticketTypeId: string): Promise<TicketTypeWithAvailability | null> {
    try {
      const { data, error } = await supabase.rpc('get_ticket_type_with_availability', {
        ticket_type_id_param: ticketTypeId
      })

      if (error) {
        console.error('Error getting ticket type with availability:', error)
        return null
      }

      return data?.[0] || null
    } catch (error) {
      console.error('Error getting ticket type with availability:', error)
      return null
    }
  }

  /**
   * Check availability for multiple ticket types
   */
  static async checkAvailability(
    requests: { ticketTypeId: string; quantity: number }[]
  ): Promise<AvailabilityCheckResult[]> {
    const results: AvailabilityCheckResult[] = []

    for (const request of requests) {
      const availableQuantity = await this.getAvailableQuantity(request.ticketTypeId)
      
      results.push({
        available: availableQuantity >= request.quantity,
        availableQuantity,
        requestedQuantity: request.quantity,
        ticketTypeId: request.ticketTypeId
      })
    }

    return results
  }

  /**
   * Create a ticket reservation (temporary hold)
   */
  static async createReservation(
    ticketTypeId: string,
    quantity: number,
    holdMinutes: number = this.DEFAULT_HOLD_MINUTES
  ): Promise<ReservationResult> {
    try {
      const sessionId = this.getSessionId()

      const { data: reservationId, error } = await supabase.rpc('create_ticket_reservation', {
        ticket_type_id_param: ticketTypeId,
        session_id_param: sessionId,
        quantity_param: quantity,
        hold_duration_minutes: holdMinutes
      })

      if (error) {
        console.error('Error creating reservation:', error)
        
        // Check if it's an availability error
        if (error.message.includes('Not enough tickets available')) {
          const availableQuantity = await this.getAvailableQuantity(ticketTypeId)
          return {
            success: false,
            error: error.message,
            availableQuantity
          }
        }

        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        reservationId
      }
    } catch (error) {
      console.error('Error creating reservation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Create multiple reservations atomically
   */
  static async createMultipleReservations(
    requests: { ticketTypeId: string; quantity: number }[],
    holdMinutes: number = this.DEFAULT_HOLD_MINUTES
  ): Promise<{ success: boolean; reservationIds?: string[]; error?: string; failedRequests?: { ticketTypeId: string; quantity: number; error?: string }[] }> {
    const reservationIds: string[] = []
    const failedRequests: { ticketTypeId: string; quantity: number; error?: string }[] = []

    try {
      // Attempt to create all reservations
      for (const request of requests) {
        const result = await this.createReservation(
          request.ticketTypeId,
          request.quantity,
          holdMinutes
        )

        if (result.success && result.reservationId) {
          reservationIds.push(result.reservationId)
        } else {
          failedRequests.push({
            ticketTypeId: request.ticketTypeId,
            quantity: request.quantity,
            error: result.error
          })
        }
      }

      // If any reservations failed, release the successful ones
      if (failedRequests.length > 0) {
        await Promise.all(
          reservationIds.map(id => this.releaseReservation(id))
        )

        return {
          success: false,
          error: `Failed to reserve tickets: ${failedRequests.map(f => f.error).join(', ')}`,
          failedRequests
        }
      }

      return {
        success: true,
        reservationIds
      }
    } catch (error) {
      // Release any successful reservations
      await Promise.all(
        reservationIds.map(id => this.releaseReservation(id))
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        failedRequests
      }
    }
  }

  /**
   * Release a ticket reservation
   */
  static async releaseReservation(reservationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('release_ticket_reservation', {
        reservation_id_param: reservationId
      })

      if (error) {
        console.error('Error releasing reservation:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Error releasing reservation:', error)
      return false
    }
  }

  /**
   * Complete a reservation (convert to sale)
   */
  static async completeReservation(reservationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('complete_ticket_reservation', {
        reservation_id_param: reservationId
      })

      if (error) {
        console.error('Error completing reservation:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Error completing reservation:', error)
      return false
    }
  }

  /**
   * Get active reservations for current session
   */
  static async getSessionReservations(): Promise<TicketReservation[]> {
    try {
      const sessionId = this.getSessionId()

      const { data, error } = await supabase
        .from('ticket_reservations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())

      if (error) {
        console.error('Error getting session reservations:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error getting session reservations:', error)
      return []
    }
  }

  /**
   * Clean up expired reservations (should be called periodically)
   */
  static async cleanupExpiredReservations(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_reservations')

      if (error) {
        console.error('Error cleaning up expired reservations:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error)
      return 0
    }
  }

  /**
   * Extend reservation expiry time
   */
  static async extendReservation(
    reservationId: string,
    additionalMinutes: number = 15
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ticket_reservations')
        .update({
          expires_at: new Date(Date.now() + additionalMinutes * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reservationId)
        .eq('status', 'active')

      if (error) {
        console.error('Error extending reservation:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error extending reservation:', error)
      return false
    }
  }

  /**
   * Get reservation details
   */
  static async getReservation(reservationId: string): Promise<TicketReservation | null> {
    try {
      const { data, error } = await supabase
        .from('ticket_reservations')
        .select('*')
        .eq('id', reservationId)
        .single()

      if (error) {
        console.error('Error getting reservation:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error getting reservation:', error)
      return null
    }
  }

  /**
   * Check if a reservation is still valid
   */
  static async isReservationValid(reservationId: string): Promise<boolean> {
    const reservation = await this.getReservation(reservationId)
    
    if (!reservation || reservation.status !== 'active') {
      return false
    }

    return new Date(reservation.expires_at) > new Date()
  }

  /**
   * Release all reservations for current session
   */
  static async releaseSessionReservations(): Promise<number> {
    try {
      const sessionId = this.getSessionId()

      const { error, count } = await supabase
        .from('ticket_reservations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('status', 'active')

      if (error) {
        console.error('Error releasing session reservations:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error releasing session reservations:', error)
      return 0
    }
  }

  /**
   * Safe increment of sold quantity with availability check
   */
  static async incrementSoldQuantitySafe(
    ticketTypeId: string,
    quantity: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('increment_sold_quantity_safe', {
        ticket_type_id_param: ticketTypeId,
        quantity_to_add: quantity
      })

      if (error) {
        console.error('Error incrementing sold quantity:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true
      }
    } catch (error) {
      console.error('Error incrementing sold quantity:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}