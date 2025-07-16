// Verification script to test authentication fix
// Run this after applying the migration

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aszzhlgwfbijaotfddsh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzenpobGd3ZmJpamFvdGZkZHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDMwODgsImV4cCI6MjA2NjcxOTA4OH0.ilfdDmbwme7oACe4TxsAJVko3O-DgPl-QWIHKbfZop0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyAuthFix() {
  console.log('🔍 Verifying authentication fix...')
  
  try {
    // Test 1: Check if user_follows table exists
    console.log('\n1. Testing user_follows table access...')
    const { data: followsData, error: followsError } = await supabase
      .from('user_follows')
      .select('*')
      .limit(1)
    
    if (followsError) {
      console.error('❌ user_follows table error:', followsError.message)
    } else {
      console.log('✅ user_follows table accessible')
    }
    
    // Test 2: Check if get_follower_count function exists
    console.log('\n2. Testing get_follower_count function...')
    const { data: countData, error: countError } = await supabase
      .rpc('get_follower_count', { organizer_uuid: 'test-uuid' })
    
    if (countError) {
      console.error('❌ get_follower_count function error:', countError.message)
    } else {
      console.log('✅ get_follower_count function accessible')
    }
    
    // Test 3: Check if profiles table has admin columns
    console.log('\n3. Testing profiles table structure...')
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, is_admin, admin_level')
      .limit(1)
    
    if (profilesError) {
      console.error('❌ profiles table error:', profilesError.message)
    } else {
      console.log('✅ profiles table has admin columns')
    }
    
    // Test 4: Check if admin user exists
    console.log('\n4. Testing admin user...')
    const { data: adminData, error: adminError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'iradwatkins@gmail.com')
      .single()
    
    if (adminError) {
      console.error('❌ admin user error:', adminError.message)
    } else {
      console.log('✅ admin user found:', {
        email: adminData.email,
        is_admin: adminData.is_admin,
        admin_level: adminData.admin_level
      })
    }
    
    // Test 5: Check if RLS policies allow public access
    console.log('\n5. Testing public access to events...')
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('is_public', true)
      .limit(1)
    
    if (eventsError) {
      console.error('❌ events access error:', eventsError.message)
    } else {
      console.log('✅ public events accessible')
    }
    
    console.log('\n🎉 Verification complete!')
    console.log('If all tests pass, non-admin users should be able to login successfully.')
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
  }
}

// Run verification
verifyAuthFix()