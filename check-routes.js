// Run this in the browser console to check available routes and user permissions

async function checkEventCreation() {
  console.log('🔍 Checking Event Creation Access...\n');
  
  // Check if user is logged in
  const { data: { user } } = await window.supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ Not logged in! Please log in first.');
    console.log('Go to: http://127.0.0.1:8080/auth');
    return;
  }
  
  console.log('✅ Logged in as:', user.email);
  
  // Check user profile and permissions
  const { data: profile } = await window.supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (profile) {
    console.log('\n👤 User Profile:');
    console.log('- Full Name:', profile.full_name || 'Not set');
    console.log('- Organization:', profile.organization || 'Not set');
    
    // Check permissions (these might be in a different table)
    console.log('\n🔐 Checking Permissions...');
    
    // Check if user has created any events
    const { count: eventCount } = await window.supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);
    
    console.log('- Events created:', eventCount || 0);
    
    if (eventCount > 0) {
      console.log('✅ User is an event organizer');
    } else {
      console.log('ℹ️ User has not created any events yet');
    }
  }
  
  console.log('\n📍 Event Creation URLs:');
  console.log('1. Main route: http://127.0.0.1:8080/create-event');
  console.log('2. Dashboard: http://127.0.0.1:8080/dashboard');
  console.log('3. Look for "My Events" → "Create New" in sidebar');
  
  console.log('\n💡 Tips:');
  console.log('- Make sure you\'re logged in');
  console.log('- You might need organizer permissions');
  console.log('- Try refreshing the page after login');
}

checkEventCreation();