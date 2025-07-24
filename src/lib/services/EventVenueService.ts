import { supabase } from '@/lib/supabase';
import { VenueService } from './VenueService';

export interface EventVenueData {
  venueLayoutId: string;
  venueLayout: any;
  seatOverrides?: {
    priceOverrides: Record<string, number>;
    availabilityOverrides: Record<string, boolean>;
    categoryPriceMultipliers: Record<string, number>;
  };
  mergedSeats: any[];
  mergedCategories: any[];
}

export class EventVenueService {
  /**
   * Load venue data for an event and merge with event-specific overrides
   */
  static async loadEventVenueData(eventId: string): Promise<EventVenueData | null> {
    try {
      // First, get the event to check if it has a venue_layout_id
      // Try to get the new fields, but handle gracefully if they don't exist
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return null;
      }

      // Try to get venue_layout_id and seat_overrides if they exist
      // This prevents errors if the columns don't exist in production yet
      try {
        const { data: eventWithVenue, error: venueError } = await supabase
          .from('events')
          .select('venue_layout_id, seat_overrides')
          .eq('id', eventId)
          .single();

        if (!venueError && eventWithVenue && eventWithVenue.venue_layout_id) {
          event.venue_layout_id = eventWithVenue.venue_layout_id;
          event.seat_overrides = eventWithVenue.seat_overrides;
        } else {
          // Columns don't exist or no venue_layout_id
          return null;
        }
      } catch (e) {
        // Columns don't exist in the database
        console.log('Venue layout columns not available in database');
        return null;
      }

      if (!event.venue_layout_id) {
        return null;
      }

      // Load the venue layout
      const venueLayout = await VenueService.getVenueById(event.venue_layout_id);
      if (!venueLayout) {
        console.error('Venue layout not found:', event.venue_layout_id);
        return null;
      }

      // Convert VenueLayout to the expected format
      const venueData = {
        id: venueLayout.id,
        name: venueLayout.name,
        description: venueLayout.description,
        image_url: venueLayout.imageUrl,
        layout_data: {
          venueType: venueLayout.venueType,
          imageUrl: venueLayout.imageUrl,
          capacity: venueLayout.capacity,
          priceCategories: venueLayout.priceCategories,
          seats: venueLayout.seats,
          isTemplate: venueLayout.isTemplate,
          tags: venueLayout.tags
        }
      };

      // Merge venue data with event-specific overrides
      const seatOverrides = event.seat_overrides || {};
      const mergedCategories = this.mergeCategoriesWithOverrides(
        venueLayout.priceCategories || [],
        seatOverrides
      );
      const mergedSeats = this.mergeSeatsWithOverrides(
        venueLayout.seats || [],
        seatOverrides,
        mergedCategories
      );

      return {
        venueLayoutId: event.venue_layout_id,
        venueLayout: venueData,
        seatOverrides,
        mergedSeats,
        mergedCategories
      };
    } catch (error) {
      console.error('Error loading event venue data:', error);
      return null;
    }
  }

  /**
   * Merge seat data with event-specific overrides
   */
  private static mergeSeatsWithOverrides(seats: any[], overrides: any, categories: any[]): any[] {
    const priceOverrides = overrides.priceOverrides || {};
    const availabilityOverrides = overrides.availabilityOverrides || {};

    return seats.map(seat => {
      // Find the category for this seat
      const category = categories.find(c => c.id === seat.priceCategory);
      
      // Map VenueService seat format to CustomerSeatingChart format
      const mergedSeat = {
        id: seat.id,
        x: seat.x,
        y: seat.y,
        seatNumber: seat.seatNumber,
        section: seat.section || 'General',
        row: seat.row || '',
        price: seat.price,
        category: seat.priceCategory,
        categoryColor: category?.color || '#6B7280',
        isADA: seat.isADA || false,
        isPremium: seat.isPremium || false,
        status: 'available',
        tableType: seat.tableType,
        tableCapacity: seat.tableCapacity,
        amenities: seat.amenities
      };

      // Apply price override if exists
      if (priceOverrides[seat.id] !== undefined) {
        mergedSeat.price = priceOverrides[seat.id];
      }

      // Apply availability override if exists
      if (availabilityOverrides[seat.id] !== undefined) {
        mergedSeat.status = availabilityOverrides[seat.id] ? 'available' : 'sold';
      }

      return mergedSeat;
    });
  }

  /**
   * Merge category data with event-specific multipliers
   */
  private static mergeCategoriesWithOverrides(categories: any[], overrides: any): any[] {
    const categoryMultipliers = overrides.categoryPriceMultipliers || {};

    return categories.map(category => {
      // Map to CustomerSeatingChart PriceCategory format
      const mergedCategory = {
        id: category.id,
        name: category.name,
        color: category.color,
        basePrice: category.price || category.basePrice || 0,
        description: category.description || `${category.name} seating`
      };

      // Apply price multiplier if exists
      if (categoryMultipliers[category.id] !== undefined) {
        mergedCategory.basePrice = mergedCategory.basePrice * categoryMultipliers[category.id];
      }

      return mergedCategory;
    });
  }

  /**
   * Save event-specific overrides
   */
  static async saveEventOverrides(
    eventId: string,
    overrides: {
      priceOverrides?: Record<string, number>;
      availabilityOverrides?: Record<string, boolean>;
      categoryPriceMultipliers?: Record<string, number>;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('events')
        .update({ seat_overrides: overrides })
        .eq('id', eventId);

      if (error) {
        console.error('Error saving event overrides:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveEventOverrides:', error);
      return false;
    }
  }

  /**
   * Get available seats for an event (considering sold seats and holds)
   */
  static async getAvailableSeats(eventId: string): Promise<any[]> {
    try {
      // Get venue data
      const venueData = await this.loadEventVenueData(eventId);
      if (!venueData) {
        return [];
      }

      // Get sold seats from tickets table
      const { data: soldTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('seat_id')
        .eq('event_id', eventId)
        .in('status', ['active', 'used']);

      if (ticketsError) {
        console.error('Error fetching sold tickets:', ticketsError);
        return venueData.mergedSeats;
      }

      // Get active seat holds
      const { data: activeHolds, error: holdsError } = await supabase
        .from('seat_holds')
        .select('seat_id')
        .eq('event_id', eventId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString());

      if (holdsError) {
        console.error('Error fetching seat holds:', holdsError);
      }

      const soldSeatIds = new Set(soldTickets?.map(t => t.seat_id).filter(Boolean) || []);
      const heldSeatIds = new Set(activeHolds?.map(h => h.seat_id).filter(Boolean) || []);

      // Mark sold and held seats appropriately
      return venueData.mergedSeats.map(seat => {
        let status = seat.status || 'available';
        
        if (soldSeatIds.has(seat.id)) {
          status = 'sold';
        } else if (heldSeatIds.has(seat.id)) {
          status = 'held';
        }
        
        return {
          ...seat,
          status
        };
      });
    } catch (error) {
      console.error('Error getting available seats:', error);
      return [];
    }
  }
}