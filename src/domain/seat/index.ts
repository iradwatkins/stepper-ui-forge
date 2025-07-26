/**
 * Seat Domain Model - Main Export
 * 
 * Unified seat domain model with adapter pattern for type safety.
 * This eliminates the SeatData/Seat interface conflicts throughout the system.
 */

// Main facade - recommended for most use cases
export { SeatAdapterFacade } from './SeatAdapterFacade';

// Domain model and services
export { 
  type DomainSeat, 
  type DomainSeatCategory,
  SeatDomainService,
  isDomainSeat 
} from './SeatDomain';

// Individual adapters for advanced use cases
export { venueServiceSeatAdapter } from './adapters/VenueServiceAdapter';
export { seatingServiceSeatAdapter } from './adapters/SeatingServiceAdapter';
export { seatDataAdapter } from './adapters/SeatDataAdapter';

// Re-export existing types for backwards compatibility
export type { SeatData, SeatCategory, PriceCategory } from '@/types/seating';

/**
 * Quick Start Guide:
 * 
 * // Convert between formats
 * import { SeatAdapterFacade } from '@/domain/seat';
 * 
 * // Venue service seats → UI components
 * const uiSeats = SeatAdapterFacade.venueToUI(venueSeats);
 * 
 * // UI seats → Database storage
 * const dbSeats = SeatAdapterFacade.uiToSeatingService(uiSeats);
 * 
 * // Find seats with criteria
 * const availableVipSeats = SeatAdapterFacade.findSeats(allSeats, {
 *   status: 'available',
 *   isPremium: true,
 *   priceRange: { min: 100, max: 500 }
 * });
 * 
 * // Calculate pricing
 * const totalPrice = SeatAdapterFacade.calculateTotalPrice(
 *   seats, 
 *   selectedSeatIds,
 *   { dynamicPricing: 1.2, discounts: 10 }
 * );
 */