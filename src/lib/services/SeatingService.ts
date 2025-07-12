import { supabase } from '@/integrations/supabase/client';

export interface Venue {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  description?: string;
  capacity?: number;
  venue_type: 'theater' | 'arena' | 'stadium' | 'conference' | 'general';
  layout_data?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface SeatingChart {
  id: string;
  venue_id: string;
  event_id?: string;
  name: string;
  description?: string;
  chart_data: any;
  image_url?: string;
  version: number;
  is_active: boolean;
  total_seats: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface SeatCategory {
  id: string;
  seating_chart_id: string;
  name: string;
  description?: string;
  color_code: string;
  base_price: number;
  price_modifier: number;
  is_accessible: boolean;
  is_premium: boolean;
  sort_order: number;
}

export interface Seat {
  id: string;
  seating_chart_id: string;
  seat_category_id?: string;
  section?: string;
  row_label?: string;
  seat_number?: string;
  seat_identifier: string;
  x_position?: number;
  y_position?: number;
  rotation: number;
  base_price: number;
  current_price?: number;
  is_available: boolean;
  is_accessible: boolean;
  is_premium: boolean;
  notes?: string;
  metadata?: any;
}

export interface SeatHold {
  id: string;
  seat_id: string;
  event_id: string;
  session_id: string;
  customer_email?: string;
  held_at: string;
  expires_at: string;
  hold_duration_minutes: number;
  status: 'active' | 'expired' | 'completed' | 'cancelled' | 'extended';
  hold_reason: string;
  metadata?: any;
}

export interface AvailableSeat {
  seat_id: string;
  seat_identifier: string;
  section?: string;
  row_label?: string;
  seat_number?: string;
  x_position?: number;
  y_position?: number;
  current_price?: number;
  category_name?: string;
  category_color?: string;
  is_accessible: boolean;
  is_premium: boolean;
}

export class SeatingService {
  private static instance: SeatingService;

  private constructor() {}

  static getInstance(): SeatingService {
    if (!SeatingService.instance) {
      SeatingService.instance = new SeatingService();
    }
    return SeatingService.instance;
  }

  // Venue Management
  async getVenues(): Promise<Venue[]> {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching venues:', error);
      throw error;
    }

    return data || [];
  }

  async getVenue(id: string): Promise<Venue | null> {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching venue:', error);
      return null;
    }

    return data;
  }

  async createVenue(venue: Omit<Venue, 'id' | 'created_at' | 'updated_at'>): Promise<Venue> {
    const { data, error } = await supabase
      .from('venues')
      .insert(venue)
      .select()
      .single();

    if (error) {
      console.error('Error creating venue:', error);
      throw error;
    }

    return data;
  }

  // Seating Chart Management
  async getSeatingCharts(eventId?: string): Promise<SeatingChart[]> {
    try {
      if (!eventId) {
        return [];
      }

      // Get event data which contains seating chart in description field
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('event_type', 'premium')
        .single();

      if (error || !event) {
        console.warn('Event not found or not premium type');
        return [];
      }

      // Check if seating data is stored in description field
      const description = event.description;
      const seatingDataMatch = description?.match(/\[SEATING_DATA:(.*?)\]$/);
      
      if (seatingDataMatch) {
        try {
          const seatingData = JSON.parse(seatingDataMatch[1]);
          // Convert stored data to SeatingChart format
          const seatingChart: SeatingChart = {
            id: `chart-${event.id}`,
            venue_id: event.id,
            event_id: event.id,
            name: seatingData.name || 'Main Seating Chart',
            description: seatingData.description,
            chart_data: seatingData.chart_data,
            image_url: seatingData.image_url,
            version: 1,
            is_active: true,
            total_seats: seatingData.total_seats || 0,
            created_at: event.created_at,
            updated_at: event.updated_at,
            created_by: event.owner_id
          };
          return [seatingChart];
        } catch (parseError) {
          console.error('Error parsing seating data:', parseError);
        }
      }

      return [];
    } catch (error) {
      console.error('Error loading seating charts:', error);
      return [];
    }
  }

  async getSeatingChart(id: string): Promise<SeatingChart | null> {
    const { data, error } = await supabase
      .from('seating_charts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching seating chart:', error);
      return null;
    }

    return data;
  }

  async createSeatingChart(chart: Omit<SeatingChart, 'id' | 'created_at' | 'updated_at'>): Promise<SeatingChart> {
    try {
      if (!chart.event_id) {
        throw new Error('Event ID is required to create seating chart');
      }

      // Get current event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', chart.event_id)
        .single();

      if (eventError || !event) {
        throw new Error('Event not found');
      }

      // Store seating chart in description field
      const seatingData = {
        name: chart.name,
        description: chart.description,
        chart_data: chart.chart_data,
        image_url: chart.image_url,
        total_seats: chart.total_seats
      };

      // Update event description with seating data
      const enhancedDescription = event.description + `\n\n[SEATING_DATA:${JSON.stringify(seatingData)}]`;
      
      const { data: updatedEvent, error: updateError } = await supabase
        .from('events')
        .update({ description: enhancedDescription })
        .eq('id', chart.event_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Return created chart
      const createdChart: SeatingChart = {
        id: `chart-${chart.event_id}`,
        ...chart,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return createdChart;
    } catch (error) {
      console.error('Error creating seating chart:', error);
      throw error;
    }
  }

  // Seat Management
  async getAvailableSeats(eventId: string, seatingChartId: string): Promise<AvailableSeat[]> {
    const { data, error } = await supabase
      .rpc('get_available_seats', {
        event_id_param: eventId,
        seating_chart_id_param: seatingChartId
      });

    if (error) {
      console.error('Error fetching available seats:', error);
      throw error;
    }

    return data || [];
  }

  async getBestAvailableSeats(
    eventId: string,
    seatingChartId: string,
    quantity: number,
    options: {
      preferTogether?: boolean;
      maxPrice?: number;
      sectionPreference?: string;
    } = {}
  ): Promise<AvailableSeat[]> {
    const { data, error } = await supabase
      .rpc('get_best_available_seats', {
        event_id_param: eventId,
        seating_chart_id_param: seatingChartId,
        quantity_param: quantity,
        prefer_together: options.preferTogether ?? true,
        max_price: options.maxPrice || null,
        section_preference: options.sectionPreference || null
      });

    if (error) {
      console.error('Error fetching best available seats:', error);
      throw error;
    }

    return data || [];
  }

  // Seat Hold Management
  async holdSeats(
    seatIds: string[],
    eventId: string,
    sessionId: string,
    options: {
      holdDurationMinutes?: number;
      customerEmail?: string;
    } = {}
  ): Promise<string> {
    try {
      // Try RPC first for premium functionality
      const { data, error } = await supabase
        .rpc('hold_seats', {
          seat_ids: seatIds,
          event_id_param: eventId,
          session_id_param: sessionId,
          hold_duration_minutes: options.holdDurationMinutes || 15,
          customer_email_param: options.customerEmail || null
        });

      if (!error && data) {
        return data;
      }

      // Fallback: Update event display_price field with hold data
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('display_price')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const displayPrice = event.display_price as any;
      if (!displayPrice?.seatingChart) {
        throw new Error('No seating chart found for event');
      }

      // Add holds to the seating chart data
      const expiresAt = new Date(Date.now() + (options.holdDurationMinutes || 15) * 60000);
      const holdId = `hold_${sessionId}_${Date.now()}`;
      
      const updatedDisplayPrice = {
        ...displayPrice,
        seatingChart: {
          ...displayPrice.seatingChart,
          holds: {
            ...displayPrice.seatingChart.holds,
            [holdId]: {
              seatIds,
              sessionId,
              customerEmail: options.customerEmail,
              expiresAt: expiresAt.toISOString(),
              status: 'active'
            }
          }
        }
      };

      // Update event with hold data
      const { error: updateError } = await supabase
        .from('events')
        .update({ display_price: updatedDisplayPrice })
        .eq('id', eventId);

      if (updateError) throw updateError;

      return holdId;
    } catch (error) {
      console.error('Error holding seats:', error);
      throw error;
    }
  }

  async releaseSeatHolds(options: {
    holdIds?: string[];
    sessionId?: string;
    eventId?: string;
  }): Promise<number> {
    try {
      // Try RPC first
      const { data, error } = await supabase
        .rpc('release_seat_holds', {
          hold_ids: options.holdIds || null,
          session_id_param: options.sessionId || null,
          event_id_param: options.eventId || null
        });

      if (!error && data !== null) {
        return data;
      }

      // Fallback: Update display_price field
      if (!options.eventId) {
        throw new Error('Event ID required for hold release');
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('display_price')
        .eq('id', options.eventId)
        .single();

      if (eventError) throw eventError;

      const displayPrice = event.display_price as any;
      if (!displayPrice?.seatingChart?.holds) {
        return 0; // No holds to release
      }

      const holds = displayPrice.seatingChart.holds;
      let releasedCount = 0;

      // Filter out holds by session or specific hold IDs
      const updatedHolds: any = {};
      for (const [holdId, hold] of Object.entries(holds)) {
        const holdData = hold as any;
        
        const shouldRelease = 
          (options.sessionId && holdData.sessionId === options.sessionId) ||
          (options.holdIds && options.holdIds.includes(holdId)) ||
          (new Date(holdData.expiresAt) < new Date()); // Expired holds

        if (shouldRelease) {
          releasedCount += holdData.seatIds?.length || 0;
        } else {
          updatedHolds[holdId] = hold;
        }
      }

      // Update event with released holds
      const updatedDisplayPrice = {
        ...displayPrice,
        seatingChart: {
          ...displayPrice.seatingChart,
          holds: updatedHolds
        }
      };

      const { error: updateError } = await supabase
        .from('events')
        .update({ display_price: updatedDisplayPrice })
        .eq('id', options.eventId);

      if (updateError) throw updateError;

      return releasedCount;
    } catch (error) {
      console.error('Error releasing seat holds:', error);
      throw error;
    }
  }

  async completeSeatPurchase(
    sessionId: string,
    eventId: string,
    orderId: string,
    customerEmail: string,
    customerName: string,
    paymentMethod: string
  ): Promise<string[]> {
    const { data, error } = await supabase
      .rpc('complete_seat_purchase', {
        session_id_param: sessionId,
        event_id_param: eventId,
        order_id_param: orderId,
        customer_email_param: customerEmail,
        customer_name_param: customerName,
        payment_method_param: paymentMethod
      });

    if (error) {
      console.error('Error completing seat purchase:', error);
      throw error;
    }

    return data || [];
  }

  // Real-time seat availability with hold integration
  async getRealtimeSeatAvailability(eventId: string, sessionId?: string): Promise<{
    available: string[];
    held: string[];
    sold: string[];
    userHolds: string[];
  }> {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('display_price')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      const displayPrice = event.display_price as any;
      const seatingChart = displayPrice?.seatingChart;
      
      if (!seatingChart) {
        return { available: [], held: [], sold: [], userHolds: [] };
      }

      const allSeatIds = seatingChart.chart_data?.seats?.map((seat: any) => seat.id) || [];
      const holds = seatingChart.holds || {};
      const now = new Date();

      // Clean up expired holds first
      const activeHolds: any = {};
      const heldSeatIds = new Set<string>();
      const userHeldSeatIds = new Set<string>();

      for (const [holdId, hold] of Object.entries(holds)) {
        const holdData = hold as any;
        if (new Date(holdData.expiresAt) > now && holdData.status === 'active') {
          activeHolds[holdId] = hold;
          holdData.seatIds.forEach((seatId: string) => {
            heldSeatIds.add(seatId);
            if (sessionId && holdData.sessionId === sessionId) {
              userHeldSeatIds.add(seatId);
            }
          });
        }
      }

      // Update holds if any expired
      if (Object.keys(activeHolds).length !== Object.keys(holds).length) {
        const updatedDisplayPrice = {
          ...displayPrice,
          seatingChart: {
            ...seatingChart,
            holds: activeHolds
          }
        };

        await supabase
          .from('events')
          .update({ display_price: updatedDisplayPrice })
          .eq('id', eventId);
      }

      // Get sold seats from tickets table (if available)
      const { data: soldTickets } = await supabase
        .from('tickets')
        .select('seat_details')
        .eq('event_id', eventId)
        .eq('status', 'confirmed');

      const soldSeatIds = new Set<string>();
      soldTickets?.forEach(ticket => {
        if (ticket.seat_details?.seatId) {
          soldSeatIds.add(ticket.seat_details.seatId);
        }
      });

      // Calculate availability
      const available = allSeatIds.filter((seatId: string) => 
        !heldSeatIds.has(seatId) && !soldSeatIds.has(seatId)
      );
      
      const held = Array.from(heldSeatIds).filter(seatId => !userHeldSeatIds.has(seatId));
      const sold = Array.from(soldSeatIds);
      const userHolds = Array.from(userHeldSeatIds);

      return { available, held, sold, userHolds };
    } catch (error) {
      console.error('Error getting realtime seat availability:', error);
      return { available: [], held: [], sold: [], userHolds: [] };
    }
  }

  // Utility Methods
  async cleanupExpiredHolds(): Promise<number> {
    const { data, error } = await supabase
      .rpc('cleanup_expired_seat_holds');

    if (error) {
      console.error('Error cleaning up expired holds:', error);
      throw error;
    }

    return data || 0;
  }

  async getSeatAvailabilitySummary(eventId?: string) {
    let query = supabase
      .from('seat_availability_summary')
      .select('*');

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching seat availability summary:', error);
      throw error;
    }

    return data || [];
  }

  // Seat Category Management
  async createSeatCategory(category: Omit<SeatCategory, 'id'>): Promise<SeatCategory> {
    const { data, error } = await supabase
      .from('seat_categories')
      .insert(category)
      .select()
      .single();

    if (error) {
      console.error('Error creating seat category:', error);
      throw error;
    }

    return data;
  }

  async getSeatCategories(seatingChartId: string): Promise<SeatCategory[]> {
    try {
      // Extract event ID from chart ID (format: chart-{eventId})
      const eventId = seatingChartId.replace('chart-', '');
      
      // Get event to retrieve seating data from description
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error || !event) {
        return [];
      }

      const description = event.description;
      const seatingDataMatch = description?.match(/\[SEATING_DATA:(.*?)\]$/);
      
      if (!seatingDataMatch) {
        return [];
      }

      try {
        const seatingData = JSON.parse(seatingDataMatch[1]);
        if (!seatingData?.chart_data?.sections) {
          return [];
        }

        // Convert sections to SeatCategory format
        const categories: SeatCategory[] = seatingData.chart_data.sections.map((section: any, index: number) => ({
          id: section.id,
          seating_chart_id: seatingChartId,
          name: section.name,
          description: section.description || `${section.name} seating area`,
          color_code: section.color,
          base_price: section.price,
          price_modifier: 1.0,
          is_accessible: section.isAccessible || false,
          is_premium: section.isPremium || false,
          sort_order: index
        }));

        return categories;
      } catch (parseError) {
        console.error('Error parsing seating data for categories:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error fetching seat categories:', error);
      return [];
    }
  }

  // Generate a session ID for seat holds
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

export const seatingService = SeatingService.getInstance();