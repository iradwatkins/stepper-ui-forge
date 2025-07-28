// Database Verification Script
// Run this in the browser console to verify all required tables exist

async function verifyDatabase() {
  console.log('🔍 Verifying Database Schema for Premium Events...\n');
  
  const requiredTables = [
    'events',
    'venue_layouts', 
    'ticket_types',
    'venues',
    'seating_charts',
    'seats',
    'seat_categories',
    'seat_holds',
    'seat_purchases'
  ];
  
  const results = {};
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await window.supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        results[table] = '❌ Error: ' + error.message;
      } else {
        results[table] = '✅ Accessible';
      }
    } catch (e) {
      results[table] = '❌ Exception: ' + e.message;
    }
  }
  
  console.log('📊 Table Status:');
  console.log('================');
  Object.entries(results).forEach(([table, status]) => {
    console.log(`${table}: ${status}`);
  });
  
  // Check specific columns
  console.log('\n🔧 Column Verification:');
  console.log('======================');
  
  // Check events table columns
  try {
    const { data: eventSample } = await window.supabase
      .from('events')
      .select('*')
      .limit(1);
    
    if (eventSample && eventSample.length > 0) {
      const cols = Object.keys(eventSample[0]);
      console.log('events.venue_layout_id:', cols.includes('venue_layout_id') ? '✅' : '❌');
      console.log('events.event_type:', cols.includes('event_type') ? '✅' : '❌');
      console.log('events.seat_overrides:', cols.includes('seat_overrides') ? '✅' : '❌');
    }
  } catch (e) {
    console.log('Could not verify events columns');
  }
  
  // Check venue_layouts structure
  try {
    const { data: venueSample } = await window.supabase
      .from('venue_layouts')
      .select('*')
      .limit(1);
    
    if (venueSample && venueSample.length > 0) {
      const cols = Object.keys(venueSample[0]);
      console.log('venue_layouts.layout_data:', cols.includes('layout_data') ? '✅' : '❌');
      console.log('venue_layouts.user_id:', cols.includes('user_id') ? '✅' : '❌');
    }
  } catch (e) {
    console.log('Could not verify venue_layouts columns');
  }
  
  console.log('\n✨ Database verification complete!');
  console.log('If any tables show errors, they may need to be created via Supabase migrations.');
}

// Run verification
verifyDatabase();