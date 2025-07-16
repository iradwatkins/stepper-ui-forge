// Test script to verify the authentication fix
// Run this after applying critical-auth-fix.sql

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aszzhlgwfbijaotfddsh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzenpobGd3ZmJpamFvdGZkZHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDMwODgsImV4cCI6MjA2NjcxOTA4OH0.ilfdDmbwme7oACe4TxsAJVko3O-DgPl-QWIHKbfZop0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuthFix() {
  console.log('🧪 Testing authentication fix...')
  
  let allPassed = true
  
  // Test 1: user_follows table
  console.log('\n1. Testing user_follows table...')
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ FAILED: user_follows table error:', error.message)
      allPassed = false
    } else {
      console.log('✅ PASSED: user_follows table accessible')
    }
  } catch (e) {
    console.error('❌ FAILED: user_follows table test error:', e.message)
    allPassed = false
  }
  
  // Test 2: get_follower_count function
  console.log('\n2. Testing get_follower_count function...')
  try {
    const { data, error } = await supabase
      .rpc('get_follower_count', { organizer_uuid: '123e4567-e89b-12d3-a456-426614174000' })
    
    if (error) {
      console.error('❌ FAILED: get_follower_count function error:', error.message)
      allPassed = false
    } else {
      console.log('✅ PASSED: get_follower_count function works, returned:', data)
    }
  } catch (e) {
    console.error('❌ FAILED: get_follower_count function test error:', e.message)
    allPassed = false
  }
  
  // Test 3: profiles table admin columns
  console.log('\n3. Testing profiles table admin columns...')
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, is_admin, admin_level')
      .limit(1)
    
    if (error) {
      console.error('❌ FAILED: profiles table admin columns error:', error.message)
      allPassed = false
    } else {
      console.log('✅ PASSED: profiles table has admin columns')
    }
  } catch (e) {
    console.error('❌ FAILED: profiles table admin columns test error:', e.message)
    allPassed = false
  }
  
  // Test 4: admin user
  console.log('\n4. Testing admin user configuration...')
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'iradwatkins@gmail.com')
      .single()
    
    if (error) {
      console.error('❌ FAILED: admin user error:', error.message)
      allPassed = false
    } else if (!data.is_admin) {
      console.error('❌ FAILED: admin user is not marked as admin')
      allPassed = false
    } else {
      console.log('✅ PASSED: admin user properly configured')
      console.log('   - Email:', data.email)
      console.log('   - Is Admin:', data.is_admin)
      console.log('   - Admin Level:', data.admin_level)
    }
  } catch (e) {
    console.error('❌ FAILED: admin user test error:', e.message)
    allPassed = false
  }
  
  // Test 5: public access to profiles
  console.log('\n5. Testing public profile access...')
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .limit(5)
    
    if (error) {
      console.error('❌ FAILED: public profile access error:', error.message)
      allPassed = false
    } else {
      console.log('✅ PASSED: public profile access works')
      console.log(`   - Found ${data.length} profiles`)
    }
  } catch (e) {
    console.error('❌ FAILED: public profile access test error:', e.message)
    allPassed = false
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED!')
    console.log('✅ Non-admin users should now be able to login with Google OAuth')
    console.log('✅ The 404 errors should be resolved')
    console.log('✅ Authentication flow should work for all users')
  } else {
    console.log('❌ SOME TESTS FAILED')
    console.log('Please check the errors above and ensure the migration was applied correctly.')
  }
  console.log('='.repeat(50))
}

// Run the test
testAuthFix()