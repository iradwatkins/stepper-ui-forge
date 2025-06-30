import { supabase } from '../supabase'

// Type definitions for seating management
export interface Venue {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  description?: string
  capacity?: number
  venue_type: 'theater' | 'arena' | 'stadium' | 'conference' | 'general'
  layout_data?: any
  created_at: string
  updated_at: string
  created_by?: string
}

export interface SeatingChart {
  id: string
  venue_id: string
  event_id?: string
  name: string
  description?: string
  chart_data: any // SVG/JSON layout data
  image_url?: string
  version: number
  is_active: boolean
  total_seats: number
  created_at: string
  updated_at: string
  created_by?: string
}

export interface SeatCategory {
  id: string
  seating_chart_id: string
  name: string
  description?: string
  color_code: string
  base_price: number
  price_modifier: number
  is_accessible: boolean
  is_premium: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Seat {
  id: string
  seating_chart_id: string
  seat_category_id?: string
  section?: string
  row_label?: string
  seat_number?: string
  seat_identifier: string
  x_position?: number
  y_position?: number
  rotation?: number
  base_price: number
  current_price?: number
  is_available: boolean
  is_accessible: boolean
  is_premium: boolean
  notes?: string
  metadata?: any
  created_at: string
  updated_at: string
}

export interface SeatHold {
  id: string
  seat_id: string
  event_id: string
  session_id: string
  customer_email?: string
  held_at: string
  expires_at: string
  hold_duration_minutes: number
  status: 'active' | 'expired' | 'completed' | 'cancelled' | 'extended'
  hold_reason: string
  metadata?: any
  created_at: string
  updated_at: string
}

export interface SeatPurchase {
  id: string
  seat_id: string
  event_id: string
  order_id?: string
  ticket_id?: string
  customer_email: string
  customer_name: string
  purchase_price: number
  fees: number
  total_paid: number
  purchased_at: string
  payment_method?: string
  confirmation_code?: string
  created_at: string
  updated_at: string
}

export interface AvailableSeat {
  seat_id: string
  seat_identifier: string
  section?: string
  row_label?: string
  seat_number?: string
  x_position?: number
  y_position?: number
  current_price?: number
  category_name?: string
  category_color?: string
  is_accessible: boolean
  is_premium: boolean
}

export interface BestAvailableSeat extends AvailableSeat {
  distance_score: number
}

export interface SeatAvailabilitySummary {
  seating_chart_id: string
  chart_name: string
  event_id: string
  event_title: string
  total_seats: number
  available_seats: number
  sold_seats: number
  held_seats: number
  total_revenue: number
}

export interface SeatingChartData {
  layout: any // SVG or JSON layout
  seats: Array<{
    identifier: string
    section?: string
    row?: string
    number?: string
    x: number
    y: number
    category?: string
    price?: number
  }>
  categories: Array<{
    name: string
    color: string
    price: number
    isAccessible?: boolean
    isPremium?: boolean
  }>
}

export interface SeatHoldRequest {
  seatIds: string[]
  eventId: string
  sessionId: string
  holdDurationMinutes?: number
  customerEmail?: string
}

export interface SeatHoldResult {
  success: boolean
  holdId?: string
  error?: string
  unavailableSeats?: string[]
}

export class SeatingService {
  private static SESSION_ID_KEY = 'seating_session_id'
  private static DEFAULT_HOLD_MINUTES = 15

  /**
   * Get or create a session ID for tracking seat holds
   */
  static getSessionId(): string {
    if (typeof window === 'undefined') {
      return `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    let sessionId = sessionStorage.getItem(this.SESSION_ID_KEY)
    if (!sessionId) {
      sessionId = `seating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem(this.SESSION_ID_KEY, sessionId)
    }
    return sessionId
  }

  // ========== Venue Management ==========

  /**
   * Create a new venue
   */
  static async createVenue(venue: Omit<Venue, 'id' | 'created_at' | 'updated_at'>): Promise<Venue> {
    const { data, error } = await supabase
      .from('venues')
      .insert([venue])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create venue: ${error.message}`)
    }

    return data
  }

  /**
   * Get venue by ID
   */
  static async getVenue(venueId: string): Promise<Venue | null> {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to get venue: ${error.message}`)
    }

    return data
  }

  /**
   * List all venues
   */
  static async listVenues(): Promise<Venue[]> {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name')

    if (error) {
      throw new Error(`Failed to list venues: ${error.message}`)
    }

    return data || []
  }

  /**
   * Update venue
   */
  static async updateVenue(venueId: string, updates: Partial<Venue>): Promise<Venue> {
    const { data, error } = await supabase
      .from('venues')
      .update(updates)
      .eq('id', venueId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update venue: ${error.message}`)
    }

    return data
  }

  // ========== Seating Chart Management ==========

  /**
   * Upload and create a seating chart
   */
  static async uploadSeatingChart(
    seatingChart: Omit<SeatingChart, 'id' | 'created_at' | 'updated_at' | 'version'>
  ): Promise<SeatingChart> {
    const { data, error } = await supabase
      .from('seating_charts')
      .insert([{ ...seatingChart, version: 1 }])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to upload seating chart: ${error.message}`)
    }

    return data
  }

  /**
   * Get seating chart by ID
   */
  static async getSeatingChart(chartId: string): Promise<SeatingChart | null> {
    const { data, error } = await supabase
      .from('seating_charts')
      .select('*')
      .eq('id', chartId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get seating chart: ${error.message}`)
    }

    return data
  }

  /**
   * Get seating chart for an event
   */
  static async getSeatingChartForEvent(eventId: string): Promise<SeatingChart | null> {
    const { data, error } = await supabase
      .from('seating_charts')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get seating chart for event: ${error.message}`)
    }

    return data
  }

  /**
   * List seating charts for a venue
   */
  static async listSeatingChartsForVenue(venueId: string): Promise<SeatingChart[]> {
    const { data, error } = await supabase
      .from('seating_charts')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to list seating charts: ${error.message}`)
    }

    return data || []
  }

  // ========== Seat Category Management ==========

  /**
   * Create seat categories for a seating chart
   */
  static async createSeatCategories(
    categories: Omit<SeatCategory, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<SeatCategory[]> {
    const { data, error } = await supabase
      .from('seat_categories')
      .insert(categories)
      .select()

    if (error) {
      throw new Error(`Failed to create seat categories: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get seat categories for a seating chart
   */
  static async getSeatCategories(seatingChartId: string): Promise<SeatCategory[]> {
    const { data, error } = await supabase
      .from('seat_categories')
      .select('*')
      .eq('seating_chart_id', seatingChartId)
      .order('sort_order')

    if (error) {
      throw new Error(`Failed to get seat categories: ${error.message}`)
    }

    return data || []
  }

  // ========== Seat Management ==========

  /**
   * Create seats for a seating chart
   */
  static async createSeats(
    seats: Omit<Seat, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<Seat[]> {
    // Process seats in batches to avoid query limits
    const batchSize = 500
    const allSeats: Seat[] = []

    for (let i = 0; i < seats.length; i += batchSize) {
      const batch = seats.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('seats')
        .insert(batch)
        .select()

      if (error) {
        throw new Error(`Failed to create seats: ${error.message}`)
      }

      allSeats.push(...(data || []))
    }

    return allSeats
  }

  /**
   * Get available seats for an event
   */
  static async getAvailableSeats(
    eventId: string,
    seatingChartId: string
  ): Promise<AvailableSeat[]> {
    const { data, error } = await supabase.rpc('get_available_seats', {
      event_id_param: eventId,
      seating_chart_id_param: seatingChartId
    })

    if (error) {
      throw new Error(`Failed to get available seats: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get best available seats
   */
  static async getBestAvailableSeats(
    eventId: string,
    seatingChartId: string,
    quantity: number,
    options: {
      preferTogether?: boolean
      maxPrice?: number
      sectionPreference?: string
    } = {}
  ): Promise<BestAvailableSeat[]> {
    const { data, error } = await supabase.rpc('get_best_available_seats', {
      event_id_param: eventId,
      seating_chart_id_param: seatingChartId,
      quantity_param: quantity,
      prefer_together: options.preferTogether ?? true,
      max_price: options.maxPrice || null,
      section_preference: options.sectionPreference || null
    })

    if (error) {
      throw new Error(`Failed to get best available seats: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get seat details
   */
  static async getSeat(seatId: string): Promise<Seat | null> {
    const { data, error } = await supabase
      .from('seats')
      .select('*')
      .eq('id', seatId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get seat: ${error.message}`)
    }

    return data
  }

  // ========== Seat Hold Management ==========

  /**
   * Hold seats during checkout
   */
  static async holdSeats(request: SeatHoldRequest): Promise<SeatHoldResult> {
    try {
      const { data: holdId, error } = await supabase.rpc('hold_seats', {
        seat_ids: request.seatIds,
        event_id_param: request.eventId,
        session_id_param: request.sessionId,
        hold_duration_minutes: request.holdDurationMinutes || this.DEFAULT_HOLD_MINUTES,
        customer_email_param: request.customerEmail || null
      })

      if (error) {
        // Parse unavailable seats from error message
        if (error.message.includes('Seats unavailable:')) {
          const unavailableSeats = error.message
            .split('Seats unavailable: ')[1]
            ?.split(', ') || []
          
          return {
            success: false,
            error: 'Some seats are no longer available',
            unavailableSeats
          }
        }

        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        holdId
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Release seat holds
   */
  static async releaseSeatHolds(
    options: {
      holdIds?: string[]
      sessionId?: string
      eventId?: string
    } = {}
  ): Promise<number> {
    try {
      const { data: affectedRows, error } = await supabase.rpc('release_seat_holds', {
        hold_ids: options.holdIds || null,
        session_id_param: options.sessionId || null,
        event_id_param: options.eventId || null
      })

      if (error) {
        throw new Error(`Failed to release seat holds: ${error.message}`)
      }

      return affectedRows || 0
    } catch (error) {
      console.error('Error releasing seat holds:', error)
      return 0
    }
  }

  /**
   * Complete seat purchase (convert holds to purchases)
   */
  static async completeSeatPurchase(
    sessionId: string,
    eventId: string,
    orderId: string,
    customerEmail: string,
    customerName: string,
    paymentMethod: string
  ): Promise<string[]> {
    const { data: purchaseIds, error } = await supabase.rpc('complete_seat_purchase', {
      session_id_param: sessionId,
      event_id_param: eventId,
      order_id_param: orderId,
      customer_email_param: customerEmail,
      customer_name_param: customerName,
      payment_method_param: paymentMethod
    })

    if (error) {
      throw new Error(`Failed to complete seat purchase: ${error.message}`)
    }

    return purchaseIds || []
  }

  /**
   * Get active seat holds for a session
   */
  static async getSessionSeatHolds(sessionId: string, eventId?: string): Promise<SeatHold[]> {
    let query = supabase
      .from('seat_holds')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get session seat holds: ${error.message}`)
    }

    return data || []
  }

  /**
   * Extend seat hold expiration
   */
  static async extendSeatHold(
    holdId: string,
    additionalMinutes: number = 15
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('seat_holds')
        .update({
          expires_at: new Date(Date.now() + additionalMinutes * 60 * 1000).toISOString(),
          hold_duration_minutes: additionalMinutes,
          status: 'extended',
          updated_at: new Date().toISOString()
        })
        .eq('id', holdId)
        .eq('status', 'active')

      return !error
    } catch (error) {
      console.error('Error extending seat hold:', error)
      return false
    }
  }

  // ========== Utilities ==========

  /**
   * Clean up expired seat holds
   */
  static async cleanupExpiredSeatHolds(): Promise<number> {
    try {
      const { data: affectedRows, error } = await supabase.rpc('cleanup_expired_seat_holds')

      if (error) {
        throw new Error(`Failed to cleanup expired seat holds: ${error.message}`)
      }

      return affectedRows || 0
    } catch (error) {
      console.error('Error cleaning up expired seat holds:', error)
      return 0
    }
  }

  /**
   * Get seat availability summary for an event
   */
  static async getSeatAvailabilitySummary(eventId: string): Promise<SeatAvailabilitySummary | null> {
    const { data, error } = await supabase
      .from('seat_availability_summary')
      .select('*')
      .eq('event_id', eventId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get seat availability summary: ${error.message}`)
    }

    return data
  }

  /**
   * Get seat purchases for an event
   */
  static async getSeatPurchases(eventId: string): Promise<SeatPurchase[]> {
    const { data, error } = await supabase
      .from('seat_purchases')
      .select('*')
      .eq('event_id', eventId)
      .order('purchased_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get seat purchases: ${error.message}`)
    }

    return data || []
  }

  /**
   * Process seating chart data and create seats/categories
   */
  static async processSeatingChartData(
    seatingChartId: string,
    chartData: SeatingChartData
  ): Promise<{ seats: Seat[]; categories: SeatCategory[] }> {
    // Create seat categories first
    const categories = await this.createSeatCategories(
      chartData.categories.map((cat, index) => ({
        seating_chart_id: seatingChartId,
        name: cat.name,
        color_code: cat.color,
        base_price: cat.price,
        is_accessible: cat.isAccessible || false,
        is_premium: cat.isPremium || false,
        sort_order: index
      }))
    )

    // Create a map of category names to IDs
    const categoryMap = new Map(categories.map(cat => [cat.name, cat.id]))

    // Create seats
    const seats = await this.createSeats(
      chartData.seats.map(seat => ({
        seating_chart_id: seatingChartId,
        seat_category_id: seat.category ? categoryMap.get(seat.category) : undefined,
        section: seat.section,
        row_label: seat.row,
        seat_number: seat.number,
        seat_identifier: seat.identifier,
        x_position: seat.x,
        y_position: seat.y,
        base_price: seat.price || 0,
        current_price: seat.price || 0,
        is_available: true,
        is_accessible: false,
        is_premium: false
      }))
    )

    return { seats, categories }
  }
}