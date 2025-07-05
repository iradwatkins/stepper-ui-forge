import { SeatData, PriceCategory } from '@/components/seating/InteractiveSeatingChart';
import { SeatingChart, SeatCategory, Seat } from '@/lib/services/SeatingService';

// Wizard seat format (from SeatingChartWizard)
export interface WizardSeat {
  id: string;
  x: number;
  y: number;
  seatNumber: string;
  ticketTypeId: string;
  price: number;
  available: boolean;
}

// Wizard seating chart format
export interface WizardSeatingData {
  type: 'premium';
  uploadedChart?: string;
  imageDimensions: { width: number; height: number };
  seats: WizardSeat[];
  sections: {
    id: string;
    name: string;
    color: string;
    ticketTypeId: string;
    ticketTypeName?: string;
    price: number;
    seatCount: number;
    seats: WizardSeat[];
  }[];
}

/**
 * Convert wizard seating data to InteractiveSeatingChart format
 */
export function convertWizardToInteractive(
  seatingChart: SeatingChart,
  categories: SeatCategory[],
  seats?: Seat[]
): { seats: SeatData[]; priceCategories: PriceCategory[] } {
  
  // Convert seat categories to price categories
  const priceCategories: PriceCategory[] = categories.map(category => ({
    id: category.id,
    name: category.name,
    color: category.color_code,
    basePrice: category.base_price,
    description: category.description || undefined
  }));

  // Get chart data from the seating chart
  const chartData = seatingChart.chart_data as WizardSeatingData;
  
  // Use database seats if available, otherwise fall back to chart data
  let seatData: SeatData[] = [];
  
  if (seats && seats.length > 0) {
    // Convert database seats
    seatData = seats.map(seat => {
      const category = categories.find(c => c.id === seat.seat_category_id);
      return {
        id: seat.id,
        x: seat.x_position || 0,
        y: seat.y_position || 0,
        seatNumber: seat.seat_number || seat.seat_identifier,
        row: seat.row_label || undefined,
        section: seat.section || undefined,
        price: seat.current_price || seat.base_price,
        category: category?.name || 'General',
        categoryColor: category?.color_code || '#3B82F6',
        isADA: seat.is_accessible,
        status: seat.is_available ? 'available' : 'sold',
        amenities: seat.is_premium ? ['Premium'] : undefined,
        viewQuality: seat.is_premium ? 'excellent' : 'good'
      };
    });
  } else if (chartData?.seats) {
    // Convert chart data seats
    seatData = chartData.seats.map(seat => {
      const section = chartData.sections.find(s => s.ticketTypeId === seat.ticketTypeId);
      return {
        id: seat.id,
        x: seat.x,
        y: seat.y,
        seatNumber: seat.seatNumber,
        section: section?.name,
        price: seat.price,
        category: section?.name || 'General',
        categoryColor: section?.color || '#3B82F6',
        isADA: false,
        status: seat.available ? 'available' : 'sold',
        viewQuality: 'good'
      };
    });
  }

  return { seats: seatData, priceCategories };
}

/**
 * Convert InteractiveSeatingChart data back to wizard format
 */
export function convertInteractiveToWizard(
  seats: SeatData[],
  priceCategories: PriceCategory[],
  imageDimensions?: { width: number; height: number }
): WizardSeatingData {
  
  // Group seats by category to create sections
  const sectionMap = new Map<string, SeatData[]>();
  seats.forEach(seat => {
    if (!sectionMap.has(seat.category)) {
      sectionMap.set(seat.category, []);
    }
    sectionMap.get(seat.category)!.push(seat);
  });

  // Convert seats to wizard format
  const wizardSeats: WizardSeat[] = seats.map(seat => ({
    id: seat.id,
    x: seat.x,
    y: seat.y,
    seatNumber: seat.seatNumber,
    ticketTypeId: seat.category, // Use category as ticket type ID
    price: seat.price,
    available: seat.status === 'available'
  }));

  // Create sections from grouped seats
  const sections = Array.from(sectionMap.entries()).map(([categoryName, categorySeats]) => {
    const priceCategory = priceCategories.find(c => c.name === categoryName);
    const sectionSeats: WizardSeat[] = categorySeats.map(seat => ({
      id: seat.id,
      x: seat.x,
      y: seat.y,
      seatNumber: seat.seatNumber,
      ticketTypeId: seat.category,
      price: seat.price,
      available: seat.status === 'available'
    }));

    return {
      id: priceCategory?.id || categoryName,
      name: categoryName,
      color: priceCategory?.color || '#3B82F6',
      ticketTypeId: priceCategory?.id || categoryName,
      ticketTypeName: categoryName,
      price: priceCategory?.basePrice || 0,
      seatCount: categorySeats.length,
      seats: sectionSeats
    };
  });

  return {
    type: 'premium',
    imageDimensions: imageDimensions || { width: 800, height: 600 },
    seats: wizardSeats,
    sections
  };
}

/**
 * Convert database seats to wizard format for editing
 */
export function convertDatabaseToWizard(
  seatingChart: SeatingChart,
  categories: SeatCategory[],
  seats: Seat[]
): WizardSeatingData {
  
  const wizardSeats: WizardSeat[] = seats.map(seat => ({
    id: seat.id,
    x: seat.x_position || 0,
    y: seat.y_position || 0,
    seatNumber: seat.seat_number || seat.seat_identifier,
    ticketTypeId: seat.seat_category_id || 'general',
    price: seat.current_price || seat.base_price,
    available: seat.is_available
  }));

  const sections = categories.map(category => {
    const categorySeats = seats.filter(seat => seat.seat_category_id === category.id);
    const sectionSeats: WizardSeat[] = categorySeats.map(seat => ({
      id: seat.id,
      x: seat.x_position || 0,
      y: seat.y_position || 0,
      seatNumber: seat.seat_number || seat.seat_identifier,
      ticketTypeId: category.id,
      price: seat.current_price || seat.base_price,
      available: seat.is_available
    }));

    return {
      id: category.id,
      name: category.name,
      color: category.color_code,
      ticketTypeId: category.id,
      ticketTypeName: category.name,
      price: category.base_price,
      seatCount: categorySeats.length,
      seats: sectionSeats
    };
  });

  return {
    type: 'premium',
    imageDimensions: (seatingChart.chart_data as any)?.imageDimensions || { width: 800, height: 600 },
    seats: wizardSeats,
    sections
  };
}

/**
 * Create seat hold data for checkout
 */
export function createSeatHoldData(
  selectedSeats: SeatData[],
  sessionId: string,
  eventId: string,
  customerEmail?: string
) {
  return selectedSeats.map(seat => ({
    seat_id: seat.id,
    event_id: eventId,
    session_id: sessionId,
    customer_email: customerEmail,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    hold_duration_minutes: 15,
    status: 'active' as const,
    hold_reason: 'checkout'
  }));
}

/**
 * Validate seat data consistency
 */
export function validateSeatingData(
  seats: SeatData[],
  priceCategories: PriceCategory[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that all seats have valid categories
  const categoryNames = new Set(priceCategories.map(c => c.name));
  const invalidCategorySeats = seats.filter(seat => !categoryNames.has(seat.category));
  
  if (invalidCategorySeats.length > 0) {
    errors.push(`${invalidCategorySeats.length} seats have invalid categories`);
  }

  // Check for duplicate seat IDs
  const seatIds = seats.map(seat => seat.id);
  const duplicateIds = seatIds.filter((id, index) => seatIds.indexOf(id) !== index);
  
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate seat IDs found: ${duplicateIds.join(', ')}`);
  }

  // Check for seats with invalid coordinates
  const invalidCoordinateSeats = seats.filter(seat => 
    seat.x < 0 || seat.x > 100 || seat.y < 0 || seat.y > 100
  );
  
  if (invalidCoordinateSeats.length > 0) {
    errors.push(`${invalidCoordinateSeats.length} seats have invalid coordinates (must be 0-100%)`);
  }

  // Check for negative prices
  const negativePriceSeats = seats.filter(seat => seat.price < 0);
  
  if (negativePriceSeats.length > 0) {
    errors.push(`${negativePriceSeats.length} seats have negative prices`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}