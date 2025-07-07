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
        name: 'VIP Experience',
        price: 100,
        quantity: 50,
        description: 'Premium seating with complimentary drinks and meet & greet access'
      }
    ];

    // Step 4: Generate 100 Seats
    const seats: SeatConfig[] = [];
    
    // Generate 50 General Admission seats (left side of venue)
    for (let i = 0; i < 50; i++) {
      seats.push({
        x: 20 + Math.random() * 30, // Left side: 20-50%
        y: 30 + Math.random() * 50, // Middle area: 30-80%
        seatNumber: `GA${i + 1}`,
        section: 'General Admission',
        price: 50,
        category: 'general',
        categoryColor: '#10B981',
        isADA: i < 3 // First 3 seats are ADA accessible
      });
    }

    // Generate 50 VIP seats (right side of venue)
    for (let i = 0; i < 50; i++) {
      seats.push({
        x: 50 + Math.random() * 30, // Right side: 50-80%
        y: 25 + Math.random() * 40, // Premium area: 25-65%
        seatNumber: `VIP${i + 1}`,
        section: 'VIP Experience',
        price: 100,
        category: 'vip',
        categoryColor: '#8B5CF6',
        isADA: i < 2 // First 2 VIP seats are ADA accessible
      });
    }

    console.log('✅ Generated 100 seats:', {
      totalSeats: seats.length,
      generalAdmission: seats.filter(s => s.category === 'general').length,
      vipSeats: seats.filter(s => s.category === 'vip').length,
      adaSeats: seats.filter(s => s.isADA).length
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
      max_attendees: 100,
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
          viewQuality: 'good' as const
        },
        {
          id: 'vip',
          name: 'VIP Experience',
          color: '#8B5CF6',
          basePrice: 100,
          maxCapacity: 50,
          amenities: ['Premium seating', 'Complimentary drinks', 'Meet & greet'],
          viewQuality: 'excellent' as const
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
        vipSeats: seatingConfiguration.seats.filter(s => s.category === 'vip').length,
        adaSeats: seatingConfiguration.seats.filter(s => s.isADA).length,
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