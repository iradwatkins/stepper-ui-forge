import { supabase } from '@/integrations/supabase/client';
import { EventsService } from '@/lib/events-db';

export async function createDemoSeatingEvent(userId: string) {
  try {
    console.log('🚀 Creating demo seating event for user:', userId);
    
    // Create a premium event with table seating
    const eventDate = new Date('2025-11-07');
    const demoEvent = {
      owner_id: userId,
      title: "Annual Gala Dinner - Table Reservations",
      description: "Experience our interactive table seating system! Reserve your seats at premium tables for this elegant gala dinner. Choose from VIP tables, accessible seating, and regular dining tables.",
      organization_name: "Elite Events Management",
      date: eventDate.toISOString().split('T')[0], // November 7th, 2025
      time: "19:00",
      location: "Grand Ballroom, 123 Gala Drive, Demo City, DC 12345",
      categories: ["Dining", "Networking"],
      event_type: "premium" as const,
      status: "published" as const,
      is_public: true,
      max_attendees: 24,
      images: {}
    };

    console.log('📋 Demo event data:', demoEvent);
    
    const event = await EventsService.createEvent(demoEvent);
    
    if (!event) throw new Error("Failed to create demo event");
    
    console.log('✅ Demo event created:', event);

    // Create ticket types for different table categories
    const ticketTypes = [
      {
        event_id: event.id,
        name: "VIP Table",
        description: "Premium table with exclusive amenities and champagne service",
        price: 100,
        quantity: 4, // 1 VIP table x 4 chairs
        max_per_person: 4,
        is_active: true
      },
      {
        event_id: event.id,
        name: "Accessible Table",
        description: "Wheelchair accessible tables with enhanced comfort",
        price: 100,
        quantity: 4, // 2 handicap tables x 2 chairs each
        max_per_person: 4,
        is_active: true
      },
      {
        event_id: event.id,
        name: "Regular Table",
        description: "Standard dinner table seating",
        price: 75,
        quantity: 16, // 4 regular tables x 4 chairs each
        max_per_person: 8,
        is_active: true
      }
    ];

    // Insert ticket types
    const { error: ticketError } = await supabase
      .from('ticket_types')
      .insert(ticketTypes);

    if (ticketError) {
      console.error('Error creating ticket types:', ticketError);
      throw ticketError;
    }

    // Store table seating chart data in the event's description field (as JSON metadata)
    const seatingChartData = {
      name: "Gala Dinner Hall Layout",
      description: "Interactive table seating chart with VIP, accessible, and regular dining tables",
      chart_data: {
        type: 'premium',
        uploadedChart: "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&h=800&fit=crop&crop=center",
        imageDimensions: { width: 1200, height: 800 },
        seats: generateDemoTableSeats(),
        sections: [
          { 
            id: "vip", 
            name: "VIP Table", 
            color: "#FFD700", 
            price: 100,
            ticketTypeId: "vip",
            ticketTypeName: "VIP Table",
            seatCount: 4,
            seats: []
          },
          { 
            id: "accessible", 
            name: "Accessible Table", 
            color: "#4169E1",
            price: 100,
            ticketTypeId: "accessible", 
            ticketTypeName: "Accessible Table",
            seatCount: 4,
            seats: []
          },
          { 
            id: "regular", 
            name: "Regular Table", 
            color: "#32CD32",
            price: 75,
            ticketTypeId: "regular",
            ticketTypeName: "Regular Table",
            seatCount: 16,
            seats: []
          }
        ]
      },
      image_url: "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&h=800&fit=crop&crop=center",
      total_seats: 24
    };

    // Update the event description to include both text and seating metadata
    const enhancedDescription = event.description + `\n\n[SEATING_DATA:${JSON.stringify(seatingChartData)}]`;
    
    const { error: updateError } = await supabase
      .from('events')
      .update({ 
        description: enhancedDescription,
        images: {
          banner: {
            url: "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&h=800&fit=crop&crop=center",
            alt: "Gala Dinner Hall"
          }
        }
      })
      .eq('id', event.id);

    if (updateError) {
      console.error('Error updating event with seating data:', updateError);
    }

    console.log('✅ Demo seating event created successfully!');
    return event;

  } catch (error) {
    console.error('Error creating demo seating event:', error);
    throw error;
  }
}

// Generate demo table seats for the event hall
function generateDemoTableSeats() {
  const seats = [];
  let seatId = 1;

  // Define table layouts with positions in the venue
  const tables = [
    // 4 Regular Tables (4 chairs each)
    { id: 'table-1', name: 'Table 1', type: 'regular', x: 20, y: 20, chairs: 4, price: 75 },
    { id: 'table-2', name: 'Table 2', type: 'regular', x: 60, y: 20, chairs: 4, price: 75 },
    { id: 'table-3', name: 'Table 3', type: 'regular', x: 20, y: 60, chairs: 4, price: 75 },
    { id: 'table-4', name: 'Table 4', type: 'regular', x: 60, y: 60, chairs: 4, price: 75 },
    
    // 2 Handicap Accessible Tables (2 chairs each)
    { id: 'table-5', name: 'Table 5 (Accessible)', type: 'accessible', x: 15, y: 85, chairs: 2, price: 100 },
    { id: 'table-6', name: 'Table 6 (Accessible)', type: 'accessible', x: 65, y: 85, chairs: 2, price: 100 },
    
    // 1 VIP Table (4 chairs)
    { id: 'table-7', name: 'VIP Table', type: 'vip', x: 40, y: 40, chairs: 4, price: 100 }
  ];

  // Generate chairs for each table
  tables.forEach(table => {
    const chairPositions = getChairPositions(table.chairs);
    
    chairPositions.forEach((position, index) => {
      seats.push({
        id: `seat-${seatId++}`,
        x: table.x + position.x,
        y: table.y + position.y,
        seatNumber: `${table.name} - Chair ${index + 1}`,
        tableId: table.id,
        tableName: table.name,
        tableType: table.type,
        chairPosition: position.label,
        ticketTypeId: table.type,
        price: table.price,
        available: true,
        isAccessible: table.type === 'accessible',
        isPremium: table.type === 'vip',
        amenities: table.type === 'vip' ? ['Champagne Service', 'Priority Serving', 'Reserved Parking'] : 
                  table.type === 'accessible' ? ['Wheelchair Accessible', 'Extra Space', 'Easy Access'] : 
                  ['Standard Dinner Service'],
        section: table.type
      });
    });
  });

  return seats;
}

// Helper function to get chair positions around a table
function getChairPositions(chairCount: number) {
  if (chairCount === 2) {
    // 2 chairs - across from each other
    return [
      { x: -8, y: 0, label: 'West' },
      { x: 8, y: 0, label: 'East' }
    ];
  } else if (chairCount === 4) {
    // 4 chairs - around the table
    return [
      { x: 0, y: -8, label: 'North' },
      { x: 8, y: 0, label: 'East' },
      { x: 0, y: 8, label: 'South' },
      { x: -8, y: 0, label: 'West' }
    ];
  }
  return [];
}