/**
 * Seat Adapter Facade
 * 
 * Provides a single entry point for all seat data transformations.
 * This facade simplifies the adapter pattern usage throughout the application.
 */

import { DomainSeat, SeatDomainService } from './SeatDomain';
import { venueServiceSeatAdapter } from './adapters/VenueServiceAdapter';
import { seatingServiceSeatAdapter } from './adapters/SeatingServiceAdapter';
import { seatDataAdapter } from './adapters/SeatDataAdapter';
import { SeatData } from '@/types/seating';

// Re-export types for convenience
export type { DomainSeat } from './SeatDomain';
export type { SeatData } from '@/types/seating';

/**
 * Unified facade for all seat transformations
 */
export class SeatAdapterFacade {
  // ===== VENUE SERVICE TRANSFORMATIONS =====
  
  /**
   * Convert VenueService seats to UI format
   */
  static venueToUI(venueSeats: any[]): SeatData[] {
    const domainSeats = venueServiceSeatAdapter.toDomainArray(venueSeats);
    return seatDataAdapter.fromDomainArray(domainSeats);
  }

  /**
   * Convert UI seats to VenueService format
   */
  static uiToVenue(uiSeats: SeatData[]): any[] {
    const domainSeats = seatDataAdapter.toDomainArray(uiSeats);
    return venueServiceSeatAdapter.fromDomainArray(domainSeats);
  }

  // ===== SEATING SERVICE TRANSFORMATIONS =====
  
  /**
   * Convert SeatingService seats to UI format
   */
  static seatingServiceToUI(seatingSeats: any[]): SeatData[] {
    const domainSeats = seatingServiceSeatAdapter.toDomainArray(seatingSeats);
    return seatDataAdapter.fromDomainArray(domainSeats);
  }

  /**
   * Convert UI seats to SeatingService format
   */
  static uiToSeatingService(uiSeats: SeatData[]): any[] {
    const domainSeats = seatDataAdapter.toDomainArray(uiSeats);
    return seatingServiceSeatAdapter.fromDomainArray(domainSeats);
  }

  // ===== VENUE ↔ SEATING SERVICE TRANSFORMATIONS =====
  
  /**
   * Convert VenueService seats to SeatingService format
   */
  static venueToSeatingService(venueSeats: any[]): any[] {
    const domainSeats = venueServiceSeatAdapter.toDomainArray(venueSeats);
    return seatingServiceSeatAdapter.fromDomainArray(domainSeats);
  }

  /**
   * Convert SeatingService seats to VenueService format
   */
  static seatingServiceToVenue(seatingSeats: any[]): any[] {
    const domainSeats = seatingServiceSeatAdapter.toDomainArray(seatingSeats);
    return venueServiceSeatAdapter.fromDomainArray(domainSeats);
  }

  // ===== DOMAIN MODEL UTILITIES =====
  
  /**
   * Validate and clean seat data from any source
   */
  static validateAndCleanSeats(seats: any[], sourceType: 'venue' | 'seating' | 'ui'): SeatData[] {
    try {
      let domainSeats: DomainSeat[];
      
      switch (sourceType) {
        case 'venue':
          domainSeats = venueServiceSeatAdapter.toDomainArray(seats);
          break;
        case 'seating':
          domainSeats = seatingServiceSeatAdapter.toDomainArray(seats);
          break;
        case 'ui':
          domainSeats = seatDataAdapter.toDomainArray(seats);
          break;
        default:
          throw new Error(`Unknown source type: ${sourceType}`);
      }
      
      return seatDataAdapter.fromDomainArray(domainSeats);
    } catch (error) {
      console.error(`Failed to validate and clean seats from ${sourceType}:`, error);
      return [];
    }
  }

  /**
   * Find seats by criteria across any format
   */
  static findSeats(
    seats: SeatData[],
    criteria: {
      status?: SeatData['status'];
      section?: string;
      priceRange?: { min: number; max: number };
      isADA?: boolean;
      isPremium?: boolean;
      isAvailable?: boolean;
    }
  ): SeatData[] {
    const domainSeats = seatDataAdapter.toDomainArray(seats);
    const foundSeats = SeatDomainService.findSeats(domainSeats, criteria);
    return seatDataAdapter.fromDomainArray(foundSeats);
  }

  /**
   * Calculate total price for selected seats
   */
  static calculateTotalPrice(
    seats: SeatData[],
    selectedSeatIds: string[],
    modifiers?: {
      dynamicPricing?: number;
      discounts?: number;
    }
  ): number {
    const domainSeats = seatDataAdapter.toDomainArray(seats);
    const selectedSeats = domainSeats.filter(seat => selectedSeatIds.includes(seat.id));
    
    return selectedSeats.reduce((total, seat) => {
      return total + SeatDomainService.calculatePrice(seat, modifiers);
    }, 0);
  }

  /**
   * Find adjacent seats for group booking
   */
  static findAdjacentSeats(seats: SeatData[], groupSize: number): SeatData[][] {
    return seatDataAdapter.findAvailableAdjacentSeats(seats, groupSize);
  }

  /**
   * Update seat statuses with validation
   */
  static updateSeatStatuses(
    seats: SeatData[],
    updates: Array<{ seatId: string; status: SeatData['status']; holdExpiry?: Date }>
  ): SeatData[] {
    return seats.map(seat => {
      const update = updates.find(u => u.seatId === seat.id);
      if (!update) return seat;

      return {
        ...seat,
        status: update.status,
        holdExpiry: update.holdExpiry,
      };
    });
  }

  /**
   * Get seat availability statistics
   */
  static getSeatStatistics(seats: SeatData[]): {
    total: number;
    available: number;
    selected: number;
    sold: number;
    held: number;
    reserved: number;
    totalRevenue: number;
    averagePrice: number;
  } {
    const stats = {
      total: seats.length,
      available: 0,
      selected: 0,
      sold: 0,
      held: 0,
      reserved: 0,
      totalRevenue: 0,
      averagePrice: 0,
    };

    seats.forEach(seat => {
      stats[seat.status]++;
      if (seat.status === 'sold') {
        stats.totalRevenue += seat.price;
      }
    });

    stats.averagePrice = stats.total > 0 ? 
      seats.reduce((sum, seat) => sum + seat.price, 0) / stats.total : 0;

    return stats;
  }
}

// Export adapters for direct use if needed
export {
  venueServiceSeatAdapter,
  seatingServiceSeatAdapter,
  seatDataAdapter,
  SeatDomainService,
};