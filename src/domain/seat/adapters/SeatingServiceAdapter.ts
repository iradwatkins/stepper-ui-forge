/**
 * Adapter for SeatingService Seat Interface
 * 
 * Converts between DomainSeat and the database Seat interface used in SeatingService.ts
 */

import { DomainSeat, SeatAdapter } from '../SeatDomain';

// Import the existing interface from SeatingService
interface SeatingServiceSeat {
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

export class SeatingServiceSeatAdapter implements SeatAdapter<SeatingServiceSeat> {
  /**
   * Convert from unified domain model to SeatingService format
   */
  fromDomain(domainSeat: DomainSeat): SeatingServiceSeat {
    return {
      id: domainSeat.id,
      seating_chart_id: '', // Will be set by the service
      seat_category_id: domainSeat.pricing.category,
      section: domainSeat.section,
      row_label: domainSeat.row,
      seat_number: domainSeat.seatNumber,
      seat_identifier: domainSeat.identifier,
      x_position: domainSeat.coordinates.x,
      y_position: domainSeat.coordinates.y,
      rotation: domainSeat.coordinates.rotation ?? 0,
      base_price: domainSeat.pricing.basePrice,
      current_price: domainSeat.pricing.currentPrice,
      is_available: domainSeat.availability.isAvailable,
      is_accessible: domainSeat.features.isADA,
      is_premium: domainSeat.features.isPremium,
      notes: domainSeat.metadata?.notes,
      metadata: {
        ...domainSeat.metadata?.customProperties,
        amenities: domainSeat.features.amenities,
        viewQuality: domainSeat.features.viewQuality,
        tableId: domainSeat.grouping?.tableId,
        tableType: domainSeat.grouping?.tableType,
        tableCapacity: domainSeat.grouping?.tableCapacity,
        groupSize: domainSeat.grouping?.groupSize,
        status: domainSeat.status,
        holdExpiry: domainSeat.availability.holdExpiry?.toISOString(),
        sessionId: domainSeat.availability.sessionId,
      },
    };
  }

  /**
   * Convert from SeatingService format to unified domain model
   */
  toDomain(seatingServiceSeat: SeatingServiceSeat): DomainSeat {
    const metadata = seatingServiceSeat.metadata || {};
    
    return {
      id: seatingServiceSeat.id,
      identifier: seatingServiceSeat.seat_identifier,
      coordinates: {
        x: seatingServiceSeat.x_position ?? 0,
        y: seatingServiceSeat.y_position ?? 0,
        rotation: seatingServiceSeat.rotation,
      },
      section: seatingServiceSeat.section,
      row: seatingServiceSeat.row_label,
      seatNumber: seatingServiceSeat.seat_number ?? seatingServiceSeat.seat_identifier,
      pricing: {
        basePrice: seatingServiceSeat.base_price,
        currentPrice: seatingServiceSeat.current_price,
        category: seatingServiceSeat.seat_category_id ?? 'General',
        categoryColor: this.getCategoryColor(seatingServiceSeat.seat_category_id),
      },
      status: this.mapStatus(metadata.status, seatingServiceSeat.is_available),
      availability: {
        isAvailable: seatingServiceSeat.is_available,
        holdExpiry: metadata.holdExpiry ? new Date(metadata.holdExpiry) : undefined,
        sessionId: metadata.sessionId,
      },
      features: {
        isADA: seatingServiceSeat.is_accessible,
        isPremium: seatingServiceSeat.is_premium,
        amenities: metadata.amenities,
        viewQuality: metadata.viewQuality,
      },
      grouping: metadata.tableId ? {
        tableId: metadata.tableId,
        tableType: metadata.tableType,
        tableCapacity: metadata.tableCapacity,
        groupSize: metadata.groupSize,
      } : undefined,
      metadata: {
        notes: seatingServiceSeat.notes,
        customProperties: this.extractCustomProperties(metadata),
      },
    };
  }

  /**
   * Validate that the seating service seat has required fields
   */
  validateConversion(seatingServiceSeat: SeatingServiceSeat): boolean {
    return !!(
      seatingServiceSeat.id &&
      seatingServiceSeat.seat_identifier &&
      typeof seatingServiceSeat.base_price === 'number' &&
      typeof seatingServiceSeat.is_available === 'boolean' &&
      typeof seatingServiceSeat.is_accessible === 'boolean' &&
      typeof seatingServiceSeat.is_premium === 'boolean'
    );
  }

  /**
   * Map database status to domain status
   */
  private mapStatus(metadataStatus: any, isAvailable: boolean): DomainSeat['status'] {
    if (metadataStatus && ['available', 'selected', 'sold', 'reserved', 'held'].includes(metadataStatus)) {
      return metadataStatus;
    }
    
    return isAvailable ? 'available' : 'sold';
  }

  /**
   * Get category color (fallback for missing color data)
   */
  private getCategoryColor(categoryId?: string): string {
    if (!categoryId) return '#6B7280';
    
    const colorMap: Record<string, string> = {
      'vip': '#FFD700',
      'premium': '#8B5CF6',
      'standard': '#3B82F6',
      'economy': '#10B981',
      'general': '#6B7280',
    };
    
    return colorMap[categoryId.toLowerCase()] || '#6B7280';
  }

  /**
   * Extract custom properties from metadata, excluding known fields
   */
  private extractCustomProperties(metadata: any): Record<string, any> {
    const knownFields = [
      'amenities', 'viewQuality', 'tableId', 'tableType', 
      'tableCapacity', 'groupSize', 'status', 'holdExpiry', 'sessionId'
    ];
    
    const customProps: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (!knownFields.includes(key)) {
        customProps[key] = value;
      }
    }
    
    return customProps;
  }

  /**
   * Convert array of seats
   */
  fromDomainArray(domainSeats: DomainSeat[]): SeatingServiceSeat[] {
    return domainSeats.map(seat => this.fromDomain(seat));
  }

  /**
   * Convert array of seats to domain
   */
  toDomainArray(seatingServiceSeats: SeatingServiceSeat[]): DomainSeat[] {
    return seatingServiceSeats
      .filter(seat => this.validateConversion(seat))
      .map(seat => this.toDomain(seat));
  }
}

// Export singleton instance
export const seatingServiceSeatAdapter = new SeatingServiceSeatAdapter();