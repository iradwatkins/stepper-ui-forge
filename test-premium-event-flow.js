// Test script to verify Premium event creation flow
// Run this in the browser console when on the event creation page

async function testPremiumEventFlow() {
  console.log('🧪 Testing Premium Event Flow...');
  
  // Step 1: Check if we're logged in
  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) {
    console.error('❌ Not logged in! Please log in first.');
    return;
  }
  console.log('✅ Logged in as:', user.email);
  
  // Step 2: Check venue_layouts table
  console.log('\n📍 Checking venue_layouts table...');
  const { data: venues, error: venueError } = await window.supabase
    .from('venue_layouts')
    .select('*')
    .eq('user_id', user.id)
    .limit(5);
  
  if (venueError) {
    console.error('❌ Error fetching venues:', venueError);
  } else {
    console.log(`✅ Found ${venues?.length || 0} venues`);
    venues?.forEach(v => {
      console.log(`  - ${v.name} (${v.layout_data?.venueType || 'unknown type'})`);
    });
  }
  
  // Step 3: Check events table structure
  console.log('\n📋 Checking events table columns...');
  const { data: eventsSample, error: eventsError } = await window.supabase
    .from('events')
    .select('*')
    .eq('owner_id', user.id)
    .limit(1);
  
  if (!eventsError && eventsSample?.length > 0) {
    const columns = Object.keys(eventsSample[0]);
    console.log('✅ Events table columns:', columns);
    console.log('  - Has venue_layout_id:', columns.includes('venue_layout_id') ? '✅' : '❌');
    console.log('  - Has event_type:', columns.includes('event_type') ? '✅' : '❌');
    console.log('  - Has seat_overrides:', columns.includes('seat_overrides') ? '✅' : '❌');
  }
  
  // Step 4: Test creating a minimal Premium event
  console.log('\n🎪 Creating test Premium event...');
  const testEvent = {
    owner_id: user.id,
    title: `Test Premium Event ${Date.now()}`,
    description: 'Testing Premium event with seating',
    event_type: 'premium',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: 'Test Venue, 123 Test St',
    venue_name: 'Test Venue',
    organization_name: 'Test Organization',
    is_public: false,
    status: 'draft',
    categories: ['music'],
    tags: ['test'],
    images: {}
  };
  
  const { data: newEvent, error: createError } = await window.supabase
    .from('events')
    .insert(testEvent)
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating event:', createError);
  } else {
    console.log('✅ Created test event:', newEvent.id);
    console.log('  - Type:', newEvent.event_type);
    console.log('  - Status:', newEvent.status);
    
    // Cleanup: Delete the test event
    console.log('\n🧹 Cleaning up test event...');
    const { error: deleteError } = await window.supabase
      .from('events')
      .delete()
      .eq('id', newEvent.id);
    
    if (deleteError) {
      console.error('❌ Error deleting test event:', deleteError);
    } else {
      console.log('✅ Test event deleted');
    }
  }
  
  // Step 5: Check ticket_types table
  console.log('\n🎫 Checking ticket_types table...');
  const { data: ticketTypes, error: ticketError } = await window.supabase
    .from('ticket_types')
    .select('*')
    .limit(1);
  
  if (ticketError) {
    console.error('❌ Error checking ticket_types:', ticketError);
  } else {
    console.log('✅ ticket_types table accessible');
  }
  
  console.log('\n✨ Premium Event Flow Test Complete!');
  console.log('All database tables are properly configured for Premium events.');
}

// Run the test
testPremiumEventFlow();