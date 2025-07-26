/**
 * Adapter for VenueService Seat Interface
 * 
 * Converts between DomainSeat and the simple Seat interface used in VenueService.ts
 */

import { DomainSeat, SeatAdapter } from '../SeatDomain';

// Import the existing interface from VenueService
interface VenueServiceSeat {
  id: string;
  x: number;
  y: number;
  seatNumber: string;
  priceCategory: string;
  isADA: boolean;
  price: number;
}

export class VenueServiceSeatAdapter implements SeatAdapter<VenueServiceSeat> {
  /**
   * Convert from unified domain model to VenueService format
   */
  fromDomain(domainSeat: DomainSeat): VenueServiceSeat {
    return {
      id: domainSeat.id,
      x: domainSeat.coordinates.x,
      y: domainSeat.coordinates.y,
      seatNumber: domainSeat.seatNumber,
      priceCategory: domainSeat.pricing.category,
      isADA: domainSeat.features.isADA,
      price: domainSeat.pricing.currentPrice ?? domainSeat.pricing.basePrice,
    };
  }

  /**
   * Convert from VenueService format to unified domain model
   */
  toDomain(venueServiceSeat: VenueServiceSeat): DomainSeat {
    return {
      id: venueServiceSeat.id,
      identifier: venueServiceSeat.seatNumber,
      coordinates: {
        x: venueServiceSeat.x,
        y: venueServiceSeat.y,
      },
      seatNumber: venueServiceSeat.seatNumber,
      pricing: {
        basePrice: venueServiceSeat.price,
        currentPrice: venueServiceSeat.price,
        category: venueServiceSeat.priceCategory,
        categoryColor: this.getCategoryColor(venueServiceSeat.priceCategory),
      },
      status: 'available',
      availability: {
        isAvailable: true,
      },
      features: {
        isADA: venueServiceSeat.isADA,
        isPremium: false,
      },
    };
  }

  /**
   * Validate that the venue service seat has required fields
   */
  validateConversion(venueServiceSeat: VenueServiceSeat): boolean {
    return !!(
      venueServiceSeat.id &&
      typeof venueServiceSeat.x === 'number' &&
      typeof venueServiceSeat.y === 'number' &&
      venueServiceSeat.seatNumber &&
      venueServiceSeat.priceCategory &&
      typeof venueServiceSeat.price === 'number' &&
      typeof venueServiceSeat.isADA === 'boolean'
    );
  }

  /**
   * Map price category to color (fallback for missing color data)
   */
  private getCategoryColor(category: string): string {
    const colorMap: Record<string, string> = {
      'VIP': '#FFD700',
      'Premium': '#8B5CF6',
      'Standard': '#3B82F6',
      'Economy': '#10B981',
      'General': '#6B7280',
    };
    
    return colorMap[category] || '#6B7280'; // Default gray
  }

  /**
   * Convert array of seats
   */
  fromDomainArray(domainSeats: DomainSeat[]): VenueServiceSeat[] {
    return domainSeats.map(seat => this.fromDomain(seat));
  }

  /**
   * Convert array of seats to domain
   */
  toDomainArray(venueServiceSeats: VenueServiceSeat[]): DomainSeat[] {
    return venueServiceSeats
      .filter(seat => this.validateConversion(seat))
      .map(seat => this.toDomain(seat));
  }
}

// Export singleton instance
export const venueServiceSeatAdapter = new VenueServiceSeatAdapter();