/**
 * Unified Seat Domain Model
 * 
 * This file defines the canonical seat domain model and provides adapters
 * to convert between different representations used throughout the system.
 * 
 * Architecture: Domain-Driven Design with Adapter Pattern
 */

// ===== DOMAIN MODEL (Single Source of Truth) =====

export interface DomainSeat {
  // Identity
  id: string;
  identifier: string; // Human-readable identifier (e.g., "A1", "Table-5-Seat-2")
  
  // Positioning
  coordinates: {
    x: number; // Percentage coordinates (0-100)
    y: number; // Percentage coordinates (0-100)
    rotation?: number; // Rotation angle in degrees
  };
  
  // Classification
  section?: string;
  row?: string;
  seatNumber: string;
  
  // Pricing
  pricing: {
    basePrice: number;
    currentPrice?: number;
    category: string;
    categoryColor: string;
  };
  
  // Status & Availability
  status: 'available' | 'selected' | 'sold' | 'reserved' | 'held';
  availability: {
    isAvailable: boolean;
    holdExpiry?: Date;
    sessionId?: string;
  };
  
  // Accessibility & Features
  features: {
    isADA: boolean;
    isPremium: boolean;
    amenities?: string[];
    viewQuality?: 'excellent' | 'good' | 'fair' | 'limited';
  };
  
  // Table/Group Configuration (for premium events)
  grouping?: {
    tableId?: string;
    tableType?: 'round' | 'square' | 'rectangular';
    tableCapacity?: number;
    groupSize?: number;
  };
  
  // Metadata
  metadata?: {
    notes?: string;
    customProperties?: Record<string, any>;
  };
}

export interface DomainSeatCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  basePrice: number;
  priceModifier: number;
  isAccessible: boolean;
  isPremium: boolean;
  sortOrder: number;
}

// ===== TYPE GUARDS =====

export function isDomainSeat(obj: any): obj is DomainSeat {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.identifier === 'string' &&
    obj.coordinates &&
    typeof obj.coordinates.x === 'number' &&
    typeof obj.coordinates.y === 'number' &&
    obj.pricing &&
    typeof obj.pricing.basePrice === 'number' &&
    typeof obj.status === 'string' &&
    obj.availability &&
    typeof obj.availability.isAvailable === 'boolean' &&
    obj.features &&
    typeof obj.features.isADA === 'boolean'
  );
}

// ===== ADAPTER INTERFACES =====

export interface SeatAdapter<T> {
  fromDomain(domainSeat: DomainSeat): T;
  toDomain(externalSeat: T): DomainSeat;
  validateConversion(externalSeat: T): boolean;
}

// ===== DOMAIN SERVICES =====

export class SeatDomainService {
  /**
   * Create a new domain seat with defaults
   */
  static createSeat(params: {
    id: string;
    identifier: string;
    coordinates: { x: number; y: number };
    pricing: { basePrice: number; category: string; categoryColor: string };
    seatNumber: string;
    overrides?: Partial<DomainSeat>;
  }): DomainSeat {
    return {
      id: params.id,
      identifier: params.identifier,
      coordinates: params.coordinates,
      seatNumber: params.seatNumber,
      pricing: params.pricing,
      status: 'available',
      availability: {
        isAvailable: true,
      },
      features: {
        isADA: false,
        isPremium: false,
      },
      ...params.overrides,
    };
  }

  /**
   * Calculate seat price with modifiers
   */
  static calculatePrice(seat: DomainSeat, modifiers?: {
    dynamicPricing?: number;
    discounts?: number;
  }): number {
    let price = seat.pricing.currentPrice ?? seat.pricing.basePrice;
    
    if (modifiers?.dynamicPricing) {
      price *= modifiers.dynamicPricing;
    }
    
    if (modifiers?.discounts) {
      price -= modifiers.discounts;
    }
    
    return Math.max(0, price);
  }

  /**
   * Check if seat can be selected
   */
  static canSelect(seat: DomainSeat): boolean {
    return (
      seat.status === 'available' &&
      seat.availability.isAvailable &&
      (!seat.availability.holdExpiry || seat.availability.holdExpiry > new Date())
    );
  }

  /**
   * Check if seats are adjacent (for group selection)
   */
  static areAdjacent(seat1: DomainSeat, seat2: DomainSeat): boolean {
    // Same row and consecutive seat numbers
    if (seat1.row === seat2.row && seat1.section === seat2.section) {
      const seat1Num = parseInt(seat1.seatNumber);
      const seat2Num = parseInt(seat2.seatNumber);
      return Math.abs(seat1Num - seat2Num) === 1;
    }
    
    // Physical proximity (within 10% coordinate distance)
    const distance = Math.sqrt(
      Math.pow(seat1.coordinates.x - seat2.coordinates.x, 2) +
      Math.pow(seat1.coordinates.y - seat2.coordinates.y, 2)
    );
    
    return distance <= 10; // 10% coordinate threshold
  }

  /**
   * Find seats by criteria
   */
  static findSeats(
    seats: DomainSeat[],
    criteria: {
      status?: DomainSeat['status'];
      section?: string;
      priceRange?: { min: number; max: number };
      isADA?: boolean;
      isPremium?: boolean;
      isAvailable?: boolean;
    }
  ): DomainSeat[] {
    return seats.filter(seat => {
      if (criteria.status && seat.status !== criteria.status) return false;
      if (criteria.section && seat.section !== criteria.section) return false;
      if (criteria.isADA !== undefined && seat.features.isADA !== criteria.isADA) return false;
      if (criteria.isPremium !== undefined && seat.features.isPremium !== criteria.isPremium) return false;
      if (criteria.isAvailable !== undefined && seat.availability.isAvailable !== criteria.isAvailable) return false;
      
      if (criteria.priceRange) {
        const price = seat.pricing.currentPrice ?? seat.pricing.basePrice;
        if (price < criteria.priceRange.min || price > criteria.priceRange.max) return false;
      }
      
      return true;
    });
  }
}

export default DomainSeat;