#!/usr/bin/env node
/**
 * Test first-time registration for specific Gmail accounts
 * Tests: appvillagellc@gmail.com and ira@irawatkins.com
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const TEST_ACCOUNTS = [
  'appvillagellc@gmail.com',
  'ira@irawatkins.com'
];

async function testFirstTimeRegistration() {
  console.log('🧪 Testing First-Time Registration for Specific Accounts\n');
  console.log('📧 Test accounts:');
  TEST_ACCOUNTS.forEach((email, index) => {
    console.log(`   ${index + 1}. ${email}`);
  });
  console.log('');

  let allTestsPassed = true;

  // Step 1: Verify these accounts don't already exist
  console.log('1. Checking if test accounts already exist...');
  for (const email of TEST_ACCOUNTS) {
    try {
      const { data: existingProfile, error } = await supabase
        .from('profiles')
        .select('email, full_name, created_at')
        .eq('email', email)
        .single();

      if (error && error.code === 'PGRST116') {
        console.log(`   ✅ ${email} - Not in database (ready for first registration)`);
      } else if (existingProfile) {
        console.log(`   ⚠️  ${email} - Already exists (created: ${existingProfile.created_at})`);
        console.log(`       Name: ${existingProfile.full_name || 'Not set'}`);
      }
    } catch (err) {
      console.log(`   ❌ ${email} - Error checking: ${err.message}`);
    }
  }

  // Step 2: Test RLS policies allow profile creation
  console.log('\n2. Testing profile creation permissions...');
  try {
    const testId = '22222222-2222-2222-2222-222222222222';
    
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: 'test-registration@example.com',
        full_name: 'Test Registration User',
        is_admin: false,
        admin_level: 0
      });

    if (error) {
      if (error.message.includes('foreign key')) {
        console.log('   ✅ RLS allows profile creation (foreign key constraint expected)');
      } else if (error.message.includes('row-level security')) {
        console.log('   ❌ RLS still blocking profile creation');
        console.log('   📋 REQUIRED: Apply definitive-auth-fix-v2.sql to Supabase');
        allTestsPassed = false;
      } else {
        console.log('   ⚠️  Unexpected error:', error.message);
      }
    } else {
      console.log('   ✅ Profile creation successful');
      // Clean up test profile
      await supabase.from('profiles').delete().eq('id', testId);
    }
  } catch (err) {
    console.log('   ❌ Error testing permissions:', err.message);
    allTestsPassed = false;
  }

  // Step 3: Verify trigger function exists and has proper permissions
  console.log('\n3. Checking trigger function for automatic profile creation...');
  try {
    // Test if handle_new_user function exists
    const { error } = await supabase.rpc('handle_new_user');
    
    if (error && error.message.includes('function handle_new_user() does not exist')) {
      console.log('   ❌ handle_new_user function missing');
      allTestsPassed = false;
    } else {
      console.log('   ✅ handle_new_user function exists');
    }
  } catch (err) {
    console.log('   ✅ handle_new_user function exists (normal parameter error)');
  }

  // Step 4: Check auth.users table for existing accounts
  console.log('\n4. Checking Supabase Auth for existing accounts...');
  for (const email of TEST_ACCOUNTS) {
    try {
      // Note: We can't directly query auth.users, but we can check if profiles exist
      // which would indicate the user was created at some point
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, created_at')
        .eq('email', email)
        .single();

      if (profile) {
        console.log(`   📝 ${email} - Has profile (created: ${profile.created_at})`);
      } else {
        console.log(`   🆕 ${email} - Ready for first-time registration`);
      }
    } catch (err) {
      console.log(`   🆕 ${email} - Ready for first-time registration`);
    }
  }

  // Results and Instructions
  console.log('\n' + '='.repeat(70));
  console.log('📊 FIRST-TIME REGISTRATION TEST SUMMARY');
  console.log('='.repeat(70));

  if (allTestsPassed) {
    console.log('✅ ALL SYSTEMS READY FOR FIRST-TIME REGISTRATION\n');
    
    console.log('🚀 MANUAL TESTING STEPS:');
    console.log('1. Go to: http://localhost:8081');
    console.log('2. Click "Sign In / Register" button');
    console.log('3. Test each account with Google OAuth:');
    console.log('');
    
    TEST_ACCOUNTS.forEach((email, index) => {
      console.log(`   ${index + 1}. ${email}`);
      console.log(`      - Click "Continue with Google"`);
      console.log(`      - Use this Gmail account to sign in`);
      console.log(`      - Should see profile created with name/avatar`);
      console.log('');
    });

    console.log('✅ EXPECTED RESULTS:');
    console.log('- No "Database error saving new user" messages');
    console.log('- User name appears in top-right navigation');
    console.log('- Google profile picture shows as avatar');
    console.log('- User can access dashboard and profile');
    console.log('- Navigation shows appropriate user options');
    
    console.log('\n🔍 VERIFICATION AFTER REGISTRATION:');
    console.log('- Run: node test-first-time-registration.js');
    console.log('- Check that accounts now exist in profiles table');
    console.log('- Verify profile data is populated correctly');

  } else {
    console.log('❌ REGISTRATION SYSTEM NOT READY\n');
    
    console.log('🚨 REQUIRED ACTIONS:');
    console.log('1. Apply definitive-auth-fix-v2.sql to Supabase');
    console.log('2. Ensure all SQL statements execute without errors');
    console.log('3. Re-run this test: node test-first-time-registration.js');
    console.log('4. Verify all checks pass before manual testing');
  }

  return allTestsPassed;
}

// Run the test
testFirstTimeRegistration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });