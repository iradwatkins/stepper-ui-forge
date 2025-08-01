import { supabase } from '@/integrations/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import { SeatData } from '@/types/seating'

export class EventSeatingService {
  /**
   * Save seating configuration for an event
   */
  static async saveEventSeating(
    eventId: string,
    venueLayoutId: string,
    seats: SeatData[],
    ticketTypes: any[]
  ) {
    try {
      // First, create or get the seating chart for this event
      const { data: seatingChart, error: chartError } = await supabase
        .from('seating_charts')
        .insert({
          venue_id: venueLayoutId,
          event_id: eventId,
          name: 'Main Hall',
          description: 'Premium event seating layout',
          chart_data: {
            seats: seats,
            totalSeats: seats.length,
            layout: 'premium'
          },
          total_seats: seats.length,
          is_active: true
        })
        .select()
        .single()

      if (chartError) throw chartError

      // Create seat categories from ticket types
      const categoryMap = new Map<string, string>()
      
      for (const ticketType of ticketTypes) {
        const { data: category, error: categoryError } = await supabase
          .from('seat_categories')
          .insert({
            seating_chart_id: seatingChart.id,
            name: ticketType.name,
            description: ticketType.description,
            color_code: ticketType.color || '#3B82F6',
            base_price: ticketType.price,
            is_premium: ticketType.isPremium || false,
            is_accessible: ticketType.isAccessible || false,
            sort_order: ticketType.sortOrder || 0
          })
          .select()
          .single()

        if (categoryError) throw categoryError
        categoryMap.set(ticketType.id, category.id)
      }

      // Insert individual seats
      const seatInserts = seats.map(seat => {
        // Determine category based on seat data
        const categoryId = seat.categoryId ? categoryMap.get(seat.categoryId) : null

        return {
          id: uuidv4(),
          seating_chart_id: seatingChart.id,
          seat_category_id: categoryId,
          section: seat.section || 'Main',
          row_label: seat.row || '',
          seat_number: String(seat.seatNumber || seat.id),
          seat_identifier: seat.label || `Seat-${seat.id}`,
          x_position: seat.x,
          y_position: seat.y,
          base_price: seat.price || 0,
          current_price: seat.price || 0,
          is_available: true,
          is_accessible: seat.isAccessible || false,
          is_premium: seat.isPremium || false,
          metadata: {
            tableId: seat.tableId,
            tableType: seat.tableType,
            tableCapacity: seat.tableCapacity,
            groupSize: seat.groupSize,
            originalId: seat.id
          }
        }
      })

      const { error: seatsError } = await supabase
        .from('seats')
        .insert(seatInserts)

      if (seatsError) throw seatsError

      return {
        success: true,
        seatingChartId: seatingChart.id,
        seatCount: seats.length
      }
    } catch (error) {
      console.error('Error saving event seating:', error)
      throw error
    }
  }

  /**
   * Load seating configuration for an event
   */
  static async loadEventSeating(eventId: string) {
    try {
      // Get the seating chart
      const { data: seatingChart, error: chartError } = await supabase
        .from('seating_charts')
        .select(`
          *,
          seat_categories (*)
        `)
        .eq('event_id', eventId)
        .eq('is_active', true)
        .single()

      if (chartError) throw chartError

      // Get all seats with their categories
      const { data: seats, error: seatsError } = await supabase
        .from('seats')
        .select(`
          *,
          seat_categories (*)
        `)
        .eq('seating_chart_id', seatingChart.id)
        .order('section', { ascending: true })
        .order('row_label', { ascending: true })
        .order('seat_number', { ascending: true })

      if (seatsError) throw seatsError

      // Convert back to SeatData format
      const seatData: SeatData[] = seats.map(seat => ({
        id: seat.metadata?.originalId || seat.id,
        x: seat.x_position,
        y: seat.y_position,
        label: seat.seat_identifier,
        categoryId: seat.seat_category_id,
        categoryName: seat.seat_categories?.name,
        color: seat.seat_categories?.color_code || '#3B82F6',
        price: seat.current_price,
        section: seat.section,
        row: seat.row_label,
        seatNumber: parseInt(seat.seat_number) || 0,
        isAccessible: seat.is_accessible,
        isPremium: seat.is_premium,
        tableId: seat.metadata?.tableId,
        tableType: seat.metadata?.tableType,
        tableCapacity: seat.metadata?.tableCapacity,
        groupSize: seat.metadata?.groupSize
      }))

      return {
        seatingChart,
        seats: seatData,
        categories: seatingChart.seat_categories
      }
    } catch (error) {
      console.error('Error loading event seating:', error)
      throw error
    }
  }

  /**
   * Check seat availability for an event
   */
  static async checkSeatAvailability(eventId: string, seatIds: string[]) {
    try {
      const { data, error } = await supabase
        .rpc('get_available_seats', {
          event_id_param: eventId,
          seating_chart_id_param: null // Will be determined by event_id
        })

      if (error) throw error

      const availableIds = new Set(data.map((seat: any) => seat.seat_id))
      return seatIds.filter(id => availableIds.has(id))
    } catch (error) {
      console.error('Error checking seat availability:', error)
      throw error
    }
  }
}