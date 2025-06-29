import { supabase, isSupabaseReady } from './supabase'
import { Event, EventInsert, EventUpdate, EventWithStats, TicketType, TicketTypeInsert } from '@/types/database'

interface EventAnalytics {
  totalTicketsSold: number
  totalRevenue: number
  salesByDate: Record<string, number>
  ticketTypeBreakdown: Array<{
    name: string
    sold: number
    revenue: number
  }>
}

interface DashboardStats {
  total_events: number
  published_events: number
  draft_events: number
  completed_events: number
  total_tickets_sold: number
  total_revenue: number
  total_attendees: number
  recent_events: EventWithStats[]
}

export class EventsService {
  static async getUserEvents(userId: string): Promise<EventWithStats[]> {
    if (!isSupabaseReady) {
      console.warn('Supabase not configured - returning empty events array')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          ticket_types (
            id,
            name,
            price,
            quantity,
            sold_quantity
          )
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user events:', error)
        throw error
      }

      // Calculate stats for each event
      const eventsWithStats: EventWithStats[] = data.map(event => {
        const ticketTypes = event.ticket_types as TicketType[]
        const tickets_sold = ticketTypes?.reduce((sum, tt) => sum + tt.sold_quantity, 0) || 0
        const total_revenue = ticketTypes?.reduce((sum, tt) => sum + (tt.price * tt.sold_quantity), 0) || 0

        return {
          ...event,
          ticket_types: ticketTypes,
          tickets_sold,
          total_revenue,
          attendee_count: tickets_sold
        }
      })

      return eventsWithStats
    } catch (error) {
      console.error('Error in getUserEvents:', error)
      throw error
    }
  }

  static async getPublicEvents(limit = 20, offset = 0): Promise<EventWithStats[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          ticket_types (
            id,
            name,
            price,
            quantity,
            sold_quantity
          ),
          profiles!events_owner_id_fkey (
            full_name,
            organization
          )
        `)
        .eq('is_public', true)
        .eq('status', 'published')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching public events:', error)
        throw error
      }

      const eventsWithStats: EventWithStats[] = data.map(event => {
        const ticketTypes = event.ticket_types as TicketType[]
        const tickets_sold = ticketTypes?.reduce((sum, tt) => sum + tt.sold_quantity, 0) || 0
        const total_revenue = ticketTypes?.reduce((sum, tt) => sum + (tt.price * tt.sold_quantity), 0) || 0

        return {
          ...event,
          ticket_types: ticketTypes,
          tickets_sold,
          total_revenue,
          attendee_count: tickets_sold
        }
      })

      return eventsWithStats
    } catch (error) {
      console.error('Error in getPublicEvents:', error)
      throw error
    }
  }

  static async getEvent(eventId: string): Promise<EventWithStats | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          ticket_types (
            id,
            name,
            description,
            price,
            quantity,
            sold_quantity,
            max_per_person,
            sale_start,
            sale_end,
            is_active
          ),
          profiles!events_owner_id_fkey (
            full_name,
            organization,
            bio
          )
        `)
        .eq('id', eventId)
        .single()

      if (error) {
        console.error('Error fetching event:', error)
        return null
      }

      const ticketTypes = data.ticket_types as TicketType[]
      const tickets_sold = ticketTypes?.reduce((sum, tt) => sum + tt.sold_quantity, 0) || 0
      const total_revenue = ticketTypes?.reduce((sum, tt) => sum + (tt.price * tt.sold_quantity), 0) || 0

      return {
        ...data,
        ticket_types: ticketTypes,
        tickets_sold,
        total_revenue,
        attendee_count: tickets_sold
      }
    } catch (error) {
      console.error('Error in getEvent:', error)
      return null
    }
  }

  static async createEvent(eventData: EventInsert): Promise<Event | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single()

      if (error) {
        console.error('Error creating event:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createEvent:', error)
      throw error
    }
  }

  static async updateEvent(eventId: string, updates: EventUpdate): Promise<Event | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single()

      if (error) {
        console.error('Error updating event:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateEvent:', error)
      throw error
    }
  }

  static async deleteEvent(eventId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) {
        console.error('Error deleting event:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteEvent:', error)
      throw error
    }
  }

  static async duplicateEvent(eventId: string, userId: string): Promise<Event | null> {
    try {
      // Get the original event
      const original = await this.getEvent(eventId)
      if (!original) {
        throw new Error('Event not found')
      }

      // Create new event data
      const newEventData: EventInsert = {
        owner_id: userId,
        title: `${original.title} (Copy)`,
        description: original.description,
        organization_name: original.organization_name,
        date: original.date,
        time: original.time,
        location: original.location,
        categories: original.categories,
        event_type: original.event_type,
        status: 'draft', // Always create as draft
        images: original.images,
        is_public: false, // Default to private
        max_attendees: original.max_attendees,
        registration_deadline: original.registration_deadline
      }

      // Create the new event
      const newEvent = await this.createEvent(newEventData)
      if (!newEvent) {
        throw new Error('Failed to create duplicate event')
      }

      // Duplicate ticket types if any
      if (original.ticket_types && original.ticket_types.length > 0) {
        for (const ticketType of original.ticket_types) {
          const newTicketTypeData: TicketTypeInsert = {
            event_id: newEvent.id,
            name: ticketType.name,
            description: ticketType.description,
            price: ticketType.price,
            quantity: ticketType.quantity,
            max_per_person: ticketType.max_per_person,
            sale_start: ticketType.sale_start,
            sale_end: ticketType.sale_end,
            is_active: ticketType.is_active
          }

          await this.createTicketType(newTicketTypeData)
        }
      }

      return newEvent
    } catch (error) {
      console.error('Error in duplicateEvent:', error)
      throw error
    }
  }

  static async createTicketType(ticketTypeData: TicketTypeInsert): Promise<TicketType | null> {
    try {
      const { data, error } = await supabase
        .from('ticket_types')
        .insert(ticketTypeData)
        .select()
        .single()

      if (error) {
        console.error('Error creating ticket type:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createTicketType:', error)
      throw error
    }
  }

  static async getEventAnalytics(eventId: string): Promise<EventAnalytics> {
    try {
      // Get basic event stats
      const event = await this.getEvent(eventId)
      if (!event) {
        throw new Error('Event not found')
      }

      // Get ticket sales over time
      const { data: salesData, error: salesError } = await supabase
        .from('tickets')
        .select('created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      if (salesError) {
        console.error('Error fetching sales data:', salesError)
      }

      // Group sales by date
      const salesByDate = salesData?.reduce((acc, ticket) => {
        const date = new Date(ticket.created_at).toDateString()
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return {
        totalTicketsSold: event.tickets_sold || 0,
        totalRevenue: event.total_revenue || 0,
        salesByDate: salesByDate,
        ticketTypeBreakdown: (event.ticket_types || []).map(tt => ({
          name: tt.name,
          sold: tt.sold_quantity || 0,
          revenue: (tt.sold_quantity || 0) * (tt.price || 0)
        }))
      }
    } catch (error) {
      console.error('Error in getEventAnalytics:', error)
      throw error
    }
  }

  static async publishEvent(eventId: string): Promise<Event | null> {
    return this.updateEvent(eventId, { status: 'published', is_public: true })
  }

  static async unpublishEvent(eventId: string): Promise<Event | null> {
    return this.updateEvent(eventId, { status: 'draft', is_public: false })
  }

  static async archiveEvent(eventId: string): Promise<Event | null> {
    return this.updateEvent(eventId, { status: 'completed' })
  }

  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      const events = await this.getUserEvents(userId)
      
      const stats = {
        total_events: events.length,
        published_events: events.filter(e => e.status === 'published').length,
        draft_events: events.filter(e => e.status === 'draft').length,
        completed_events: events.filter(e => e.status === 'completed').length,
        total_tickets_sold: events.reduce((sum, e) => sum + (e.tickets_sold || 0), 0),
        total_revenue: events.reduce((sum, e) => sum + (e.total_revenue || 0), 0),
        total_attendees: events.reduce((sum, e) => sum + (e.attendee_count || 0), 0),
        recent_events: events.slice(0, 5)
      }

      return stats
    } catch (error) {
      console.error('Error in getDashboardStats:', error)
      throw error
    }
  }
}