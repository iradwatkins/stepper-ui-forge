// Simple test script to verify the authentication fix
// Run this after applying fix-auth-404-errors.sql

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aszzhlgwfbijaotfddsh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzenpobGd3ZmJpamFvdGZkZHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDMwODgsImV4cCI6MjA2NjcxOTA4OH0.ilfdDmbwme7oACe4TxsAJVko3O-DgPl-QWIHKbfZop0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFix() {
  console.log('🧪 Testing authentication fix...')
  
  // Test 1: user_follows table
  console.log('\n1. Testing user_follows table...')
  const { data: followsData, error: followsError } = await supabase
    .from('user_follows')
    .select('*')
    .limit(1)
  
  if (followsError) {
    console.error('❌ user_follows table error:', followsError.message)
    return false
  } else {
    console.log('✅ user_follows table accessible')
  }
  
  // Test 2: get_follower_count function
  console.log('\n2. Testing get_follower_count function...')
  const { data: countData, error: countError } = await supabase
    .rpc('get_follower_count', { organizer_uuid: '123e4567-e89b-12d3-a456-426614174000' })
  
  if (countError) {
    console.error('❌ get_follower_count function error:', countError.message)
    return false
  } else {
    console.log('✅ get_follower_count function works, returned:', countData)
  }
  
  // Test 3: is_following function
  console.log('\n3. Testing is_following function...')
  const { data: followingData, error: followingError } = await supabase
    .rpc('is_following', { 
      follower_uuid: '123e4567-e89b-12d3-a456-426614174000',
      organizer_uuid: '123e4567-e89b-12d3-a456-426614174001'
    })
  
  if (followingError) {
    console.error('❌ is_following function error:', followingError.message)
    return false
  } else {
    console.log('✅ is_following function works, returned:', followingData)
  }
  
  // Test 4: profiles table admin columns
  console.log('\n4. Testing profiles table admin columns...')
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, is_admin, admin_level')
    .limit(1)
  
  if (profilesError) {
    console.error('❌ profiles table error:', profilesError.message)
    return false
  } else {
    console.log('✅ profiles table has admin columns')
  }
  
  console.log('\n🎉 All tests passed!')
  console.log('✅ Non-admin users should now be able to login')
  console.log('✅ 404 errors should be resolved')
  
  return true
}

// Run the test
testFix().then(success => {
  if (success) {
    console.log('\n🚀 Ready to test with Google OAuth!')
  } else {
    console.log('\n❌ Fix not complete - please check the SQL migration')
  }
}).catch(error => {
  console.error('❌ Test failed:', error.message)
})