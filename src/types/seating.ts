/**
 * Seating Chart Types
 * Shared types for seating functionality to prevent circular dependencies
 */

export interface SeatData {
  id: string;
  x: number; // Percentage coordinates (0-100)
  y: number; // Percentage coordinates (0-100)
  seatNumber: string;
  row?: string;
  section?: string;
  price: number;
  category: string;
  categoryColor: string;
  isADA: boolean;
  status: 'available' | 'selected' | 'sold' | 'reserved' | 'held';
  holdExpiry?: Date;
  amenities?: string[];
  viewQuality?: 'excellent' | 'good' | 'fair' | 'limited';
  tableId?: string;
  groupSize?: number;
  tableType?: 'round' | 'square' | 'rectangular';
  tableCapacity?: number;
  isPremium?: boolean;
}

export interface SeatCategory {
  id: string;
  name: string;
  color: string;
  basePrice: number;
  maxCapacity: number;
  amenities: string[];
  viewQuality: 'excellent' | 'good' | 'fair' | 'limited';
}

export interface PriceCategory {
  id: string;
  name: string;
  color: string;
  basePrice: number;
  description?: string;
  isPremium?: boolean;
  tableType?: 'round' | 'square' | 'rectangular';
  tableCapacity?: number;
  premiumAmenities?: string[];
}