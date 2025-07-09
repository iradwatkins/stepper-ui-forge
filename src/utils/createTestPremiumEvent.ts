import { supabase } from '@/integrations/supabase/client';

export interface TestEventConfig {
  title: string;
  description: string;
  organizationName: string;
  venueName: string;
  date: string;
  time: string;
  address: string;
  categories: string[];
}

export interface TicketTypeConfig {
  name: string;
  price: number;
  quantity: number;
  description: string;
}

export interface SeatConfig {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  seatNumber: string;
  section: string;
  price: number;
  category: string;
  categoryColor: string;
  isADA: boolean;
  tableId?: string;
  tableType?: 'round' | 'square' | 'rectangular';
  tableCapacity?: number;
  isPremium?: boolean;
}

export async function createTestPremiumEvent() {
  console.log('🚀 Starting Premium Event Creation Test...');
  
  try {
    // Step 1: Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to create events');
    }
    
    console.log('✅ User authenticated:', user.email);

    // Step 2: Event Configuration
    const eventConfig: TestEventConfig = {
      title: 'Premium Concert Experience - Test Event',
      description: 'A premium concert experience featuring world-class performers in an intimate venue setting. This test event includes VIP seating, premium amenities, and an unforgettable musical journey. Join us for an evening of exceptional entertainment with specially curated performances and exclusive access.',
      organizationName: 'Live Music Productions',
      venueName: 'The Grand Theater',
      date: '2024-12-15',
      time: '19:30',
      address: '123 Music Hall Avenue, Entertainment District, Concert City, CA 90210',
      categories: ['Music', 'Entertainment', 'Live Performance']
    };

    // Step 3: Ticket Type Configuration
    const ticketTypes: TicketTypeConfig[] = [
      {
        name: 'General Admission',
        price: 50,
        quantity: 50,
        description: 'Standard seating with great views of the stage'
      },
      {
        name: 'Premium Round Table',
        price: 150,
        quantity: 25,
        description: 'Premium 5-seat round table with table service and complimentary appetizers'
      },
      {
        name: 'Premium Square Table',
        price: 120,
        quantity: 20,
        description: 'Premium 4-seat square table with table service and priority ordering'
      }
    ];

    // Step 4: Generate 95 Seats with Premium Table Configuration
    const seats: SeatConfig[] = [];
    
    // Generate 50 General Admission seats (left side of venue)
    for (let i = 0; i < 50; i++) {
      seats.push({
        x: 15 + Math.random() * 25, // Left side: 15-40%
        y: 30 + Math.random() * 50, // Middle area: 30-80%
        seatNumber: `GA${i + 1}`,
        section: 'General Admission',
        price: 50,
        category: 'general',
        categoryColor: '#10B981',
        isADA: i < 3, // First 3 seats are ADA accessible
        isPremium: false
      });
    }

    // Generate 5 Premium Round Tables (5 seats each = 25 seats)
    for (let tableNum = 1; tableNum <= 5; tableNum++) {
      const tableId = `round_table_${tableNum}`;
      const centerX = 50 + (tableNum - 1) * 8; // Spread tables horizontally
      const centerY = 20 + Math.random() * 20; // Upper premium area
      
      for (let seatNum = 1; seatNum <= 5; seatNum++) {
        // Arrange seats in a circle around table center
        const angle = (seatNum - 1) * (2 * Math.PI / 5);
        const radius = 3; // Small radius for table seating
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        seats.push({
          x: Math.max(45, Math.min(85, x)), // Keep within venue bounds
          y: Math.max(15, Math.min(40, y)),
          seatNumber: `RT${tableNum}-${seatNum}`,
          section: 'Premium Round Table',
          price: 150,
          category: 'premium_round',
          categoryColor: '#F59E0B',
          isADA: tableNum === 1 && seatNum === 1, // One ADA seat per venue
          tableId,
          tableType: 'round' as const,
          tableCapacity: 5,
          isPremium: true
        });
      }
    }

    // Generate 5 Premium Square Tables (4 seats each = 20 seats)
    for (let tableNum = 1; tableNum <= 5; tableNum++) {
      const tableId = `square_table_${tableNum}`;
      const centerX = 50 + (tableNum - 1) * 8; // Spread tables horizontally
      const centerY = 50 + Math.random() * 20; // Lower premium area
      
      // Square table positions (4 corners)
      const positions = [
        { x: centerX - 2, y: centerY - 2 }, // Top-left
        { x: centerX + 2, y: centerY - 2 }, // Top-right
        { x: centerX - 2, y: centerY + 2 }, // Bottom-left
        { x: centerX + 2, y: centerY + 2 }  // Bottom-right
      ];
      
      for (let seatNum = 1; seatNum <= 4; seatNum++) {
        const pos = positions[seatNum - 1];
        
        seats.push({
          x: Math.max(45, Math.min(85, pos.x)), // Keep within venue bounds
          y: Math.max(45, Math.min(75, pos.y)),
          seatNumber: `ST${tableNum}-${seatNum}`,
          section: 'Premium Square Table',
          price: 120,
          category: 'premium_square',
          categoryColor: '#EF4444',
          isADA: tableNum === 1 && seatNum === 1, // One ADA seat per venue
          tableId,
          tableType: 'square' as const,
          tableCapacity: 4,
          isPremium: true
        });
      }
    }

    console.log('✅ Generated 95 seats with premium table configuration:', {
      totalSeats: seats.length,
      generalAdmission: seats.filter(s => s.category === 'general').length,
      premiumRoundTables: seats.filter(s => s.category === 'premium_round').length,
      premiumSquareTables: seats.filter(s => s.category === 'premium_square').length,
      adaSeats: seats.filter(s => s.isADA).length,
      premiumSeats: seats.filter(s => s.isPremium).length
    });

    // Step 5: Create Event in Database
    const locationWithVenue = `${eventConfig.venueName}, ${eventConfig.address}`;
    
    const eventData = {
      title: eventConfig.title,
      description: eventConfig.description,
      organization_name: eventConfig.organizationName,
      date: eventConfig.date,
      time: eventConfig.time,
      location: locationWithVenue,
      event_type: 'premium' as const,
      max_attendees: 95,
      is_public: true,
      status: 'published' as const,
      owner_id: user.id,
      categories: eventConfig.categories,
      images: {}
    };

    console.log('🗄️ Creating event in database...');
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (eventError) {
      throw new Error(`Failed to create event: ${eventError.message}`);
    }

    console.log('✅ Event created successfully:', {
      id: event.id,
      title: event.title,
      eventType: event.event_type
    });

    // Step 6: Create Ticket Types
    console.log('🎫 Creating ticket types...');
    
    for (const ticketType of ticketTypes) {
      const ticketData = {
        event_id: event.id,
        name: ticketType.name,
        description: ticketType.description,
        price: ticketType.price,
        quantity: ticketType.quantity,
        max_per_person: 10,
        is_active: true
      };

      const { error: ticketError } = await supabase
        .from('ticket_types')
        .insert(ticketData);

      if (ticketError) {
        throw new Error(`Failed to create ticket type "${ticketType.name}": ${ticketError.message}`);
      }

      console.log(`✅ Created ticket type: ${ticketType.name} - $${ticketType.price} (${ticketType.quantity} available)`);
    }

    // Step 7: Store Seating Configuration
    // Since the seating chart tables don't exist, we'll store the configuration as JSON in the event description
    const seatingConfiguration = {
      totalSeats: seats.length,
      seats: seats.map(seat => ({
        id: `seat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        x: seat.x,
        y: seat.y,
        seatNumber: seat.seatNumber,
        section: seat.section,
        price: seat.price,
        category: seat.category,
        categoryColor: seat.categoryColor,
        isADA: seat.isADA,
        status: 'available' as const
      })),
      categories: [
        {
          id: 'general',
          name: 'General Admission',
          color: '#10B981',
          basePrice: 50,
          maxCapacity: 50,
          amenities: ['Standard seating'],
          viewQuality: 'good' as const,
          isPremium: false
        },
        {
          id: 'premium_round',
          name: 'Premium Round Table',
          color: '#F59E0B',
          basePrice: 150,
          maxCapacity: 25,
          amenities: ['5-seat round table', 'Table service', 'Complimentary appetizers', 'Priority ordering'],
          viewQuality: 'excellent' as const,
          isPremium: true,
          tableType: 'round' as const,
          tableCapacity: 5
        },
        {
          id: 'premium_square',
          name: 'Premium Square Table',
          color: '#EF4444',
          basePrice: 120,
          maxCapacity: 20,
          amenities: ['4-seat square table', 'Table service', 'Priority ordering', 'Premium location'],
          viewQuality: 'excellent' as const,
          isPremium: true,
          tableType: 'square' as const,
          tableCapacity: 4
        }
      ]
    };

    // Update event with seating configuration
    const updatedDescription = `${eventConfig.description}\n\n[SEATING_CONFIG:${JSON.stringify(seatingConfiguration)}]`;
    
    const { error: updateError } = await supabase
      .from('events')
      .update({ description: updatedDescription })
      .eq('id', event.id);

    if (updateError) {
      console.warn('Failed to store seating configuration:', updateError.message);
    } else {
      console.log('✅ Seating configuration stored in event description');
    }

    // Step 8: Verification
    console.log('🔍 Verifying event creation...');
    
    const { data: createdEvent, error: verifyError } = await supabase
      .from('events')
      .select(`
        *,
        ticket_types (*)
      `)
      .eq('id', event.id)
      .single();

    if (verifyError) {
      throw new Error(`Failed to verify event: ${verifyError.message}`);
    }

    // Final summary
    const summary = {
      event: {
        id: createdEvent.id,
        title: createdEvent.title,
        type: createdEvent.event_type,
        status: createdEvent.status,
        maxAttendees: createdEvent.max_attendees,
        location: createdEvent.location,
        date: createdEvent.date,
        time: createdEvent.time
      },
      ticketTypes: createdEvent.ticket_types?.map((tt: any) => ({
        name: tt.name,
        price: tt.price,
        quantity: tt.quantity,
        description: tt.description
      })) || [],
      seating: {
        totalSeats: seatingConfiguration.totalSeats,
        generalAdmission: seatingConfiguration.seats.filter(s => s.category === 'general').length,
        premiumRoundTables: seatingConfiguration.seats.filter(s => s.category === 'premium_round').length,
        premiumSquareTables: seatingConfiguration.seats.filter(s => s.category === 'premium_square').length,
        adaSeats: seatingConfiguration.seats.filter(s => s.isADA).length,
        premiumSeats: seatingConfiguration.seats.filter(s => s.isPremium).length,
        categories: seatingConfiguration.categories.length
      }
    };

    console.log('🎉 Premium Event Creation Test COMPLETED!');
    console.log('📊 Event Summary:', summary);

    return {
      success: true,
      event: createdEvent,
      seatingConfiguration,
      summary
    };

  } catch (error) {
    console.error('❌ Premium Event Creation Test FAILED:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export for manual testing
(window as any).createTestPremiumEvent = createTestPremiumEvent;