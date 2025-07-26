/**
 * Adapter for SeatData Interface (UI Components)
 * 
 * Converts between DomainSeat and the SeatData interface used in UI components
 */

import { DomainSeat, SeatAdapter } from '../SeatDomain';
import { SeatData } from '@/types/seating';

export class SeatDataAdapter implements SeatAdapter<SeatData> {
  /**
   * Convert from unified domain model to SeatData format
   */
  fromDomain(domainSeat: DomainSeat): SeatData {
    return {
      id: domainSeat.id,
      x: domainSeat.coordinates.x,
      y: domainSeat.coordinates.y,
      seatNumber: domainSeat.seatNumber,
      row: domainSeat.row,
      section: domainSeat.section,
      price: domainSeat.pricing.currentPrice ?? domainSeat.pricing.basePrice,
      category: domainSeat.pricing.category,
      categoryColor: domainSeat.pricing.categoryColor,
      isADA: domainSeat.features.isADA,
      status: domainSeat.status,
      holdExpiry: domainSeat.availability.holdExpiry,
      amenities: domainSeat.features.amenities,
      viewQuality: domainSeat.features.viewQuality,
      tableId: domainSeat.grouping?.tableId,
      groupSize: domainSeat.grouping?.groupSize,
      tableType: domainSeat.grouping?.tableType,
      tableCapacity: domainSeat.grouping?.tableCapacity,
      isPremium: domainSeat.features.isPremium,
    };
  }

  /**
   * Convert from SeatData format to unified domain model
   */
  toDomain(seatData: SeatData): DomainSeat {
    return {
      id: seatData.id,
      identifier: seatData.seatNumber,
      coordinates: {
        x: seatData.x,
        y: seatData.y,
      },
      seatNumber: seatData.seatNumber,
      row: seatData.row,
      section: seatData.section,
      pricing: {
        basePrice: seatData.price,
        currentPrice: seatData.price,
        category: seatData.category,
        categoryColor: seatData.categoryColor,
      },
      status: seatData.status,
      availability: {
        isAvailable: seatData.status === 'available',
        holdExpiry: seatData.holdExpiry,
      },
      features: {
        isADA: seatData.isADA,
        isPremium: seatData.isPremium ?? false,
        amenities: seatData.amenities,
        viewQuality: seatData.viewQuality,
      },
      grouping: seatData.tableId ? {
        tableId: seatData.tableId,
        tableType: seatData.tableType,
        tableCapacity: seatData.tableCapacity,
        groupSize: seatData.groupSize,
      } : undefined,
    };
  }

  /**
   * Validate that the SeatData has required fields
   */
  validateConversion(seatData: SeatData): boolean {
    return !!(
      seatData.id &&
      typeof seatData.x === 'number' &&
      typeof seatData.y === 'number' &&
      seatData.seatNumber &&
      typeof seatData.price === 'number' &&
      seatData.category &&
      seatData.categoryColor &&
      typeof seatData.isADA === 'boolean' &&
      seatData.status &&
      ['available', 'selected', 'sold', 'reserved', 'held'].includes(seatData.status)
    );
  }

  /**
   * Convert array of seats
   */
  fromDomainArray(domainSeats: DomainSeat[]): SeatData[] {
    return domainSeats.map(seat => this.fromDomain(seat));
  }

  /**
   * Convert array of seats to domain
   */
  toDomainArray(seatDataArray: SeatData[]): DomainSeat[] {
    return seatDataArray
      .filter(seat => this.validateConversion(seat))
      .map(seat => this.toDomain(seat));
  }

  /**
   * Update seat status in SeatData format
   */
  updateSeatStatus(seatData: SeatData, newStatus: SeatData['status']): SeatData {
    return {
      ...seatData,
      status: newStatus,
    };
  }

  /**
   * Update multiple seats' status
   */
  updateMultipleSeatStatus(
    seatDataArray: SeatData[], 
    seatIds: string[], 
    newStatus: SeatData['status']
  ): SeatData[] {
    return seatDataArray.map(seat => 
      seatIds.includes(seat.id) 
        ? this.updateSeatStatus(seat, newStatus)
        : seat
    );
  }

  /**
   * Find available seats for group selection
   */
  findAvailableAdjacentSeats(
    seatDataArray: SeatData[], 
    groupSize: number,
    preferences?: {
      section?: string;
      maxPrice?: number;
      requireADA?: boolean;
    }
  ): SeatData[][] {
    const availableSeats = seatDataArray.filter(seat => {
      if (seat.status !== 'available') return false;
      if (preferences?.section && seat.section !== preferences.section) return false;
      if (preferences?.maxPrice && seat.price > preferences.maxPrice) return false;
      if (preferences?.requireADA && !seat.isADA) return false;
      return true;
    });

    // Group by row and section for adjacency detection
    const seatGroups = new Map<string, SeatData[]>();
    availableSeats.forEach(seat => {
      const key = `${seat.section || 'default'}-${seat.row || 'default'}`;
      if (!seatGroups.has(key)) {
        seatGroups.set(key, []);
      }
      seatGroups.get(key)!.push(seat);
    });

    const adjacentGroups: SeatData[][] = [];

    // Find adjacent groups within each row
    seatGroups.forEach(seats => {
      seats.sort((a, b) => {
        const aNum = parseInt(a.seatNumber) || 0;
        const bNum = parseInt(b.seatNumber) || 0;
        return aNum - bNum;
      });

      for (let i = 0; i <= seats.length - groupSize; i++) {
        const group = seats.slice(i, i + groupSize);
        
        // Check if seats are consecutive
        const isConsecutive = group.every((seat, index) => {
          if (index === 0) return true;
          const currentNum = parseInt(seat.seatNumber) || 0;
          const prevNum = parseInt(group[index - 1].seatNumber) || 0;
          return currentNum === prevNum + 1;
        });

        if (isConsecutive) {
          adjacentGroups.push(group);
        }
      }
    });

    return adjacentGroups;
  }
}

// Export singleton instance
export const seatDataAdapter = new SeatDataAdapter();