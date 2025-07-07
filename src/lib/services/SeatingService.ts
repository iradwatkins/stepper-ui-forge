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
      let query = supabase
        .from('seating_charts')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;

      if (error) {
        // Handle missing table gracefully
        if (error.code === '42P01') {
          console.warn('Seating charts table not available, returning empty array');
          return [];
        }
        console.error('Error fetching seating charts:', error);
        throw error;
      }

      return data || [];
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
    const { data, error } = await supabase
      .from('seating_charts')
      .insert(chart)
      .select()
      .single();

    if (error) {
      console.error('Error creating seating chart:', error);
      throw error;
    }

    return data;
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
    const { data, error } = await supabase
      .rpc('hold_seats', {
        seat_ids: seatIds,
        event_id_param: eventId,
        session_id_param: sessionId,
        hold_duration_minutes: options.holdDurationMinutes || 15,
        customer_email_param: options.customerEmail || null
      });

    if (error) {
      console.error('Error holding seats:', error);
      throw error;
    }

    return data;
  }

  async releaseSeatHolds(options: {
    holdIds?: string[];
    sessionId?: string;
    eventId?: string;
  }): Promise<number> {
    const { data, error } = await supabase
      .rpc('release_seat_holds', {
        hold_ids: options.holdIds || null,
        session_id_param: options.sessionId || null,
        event_id_param: options.eventId || null
      });

    if (error) {
      console.error('Error releasing seat holds:', error);
      throw error;
    }

    return data || 0;
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
    const { data, error } = await supabase
      .from('seat_categories')
      .select('*')
      .eq('seating_chart_id', seatingChartId)
      .order('sort_order');

    if (error) {
      console.error('Error fetching seat categories:', error);
      throw error;
    }

    return data || [];
  }

  // Generate a session ID for seat holds
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const seatingService = SeatingService.getInstance();