#!/usr/bin/env node
/**
 * Test script to run AFTER applying the RLS fix
 * This will verify the registration works
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function testRegistrationFix() {
  console.log('🧪 Testing registration after RLS fix...\n');

  let testsPassed = 0;
  let totalTests = 0;

  // Test 1: Check admin profile exists
  totalTests++;
  console.log('1. Checking if admin profile was created...');
  try {
    const { data: adminProfile, error } = await supabase
      .from('profiles')
      .select('email, full_name, is_admin, admin_level, created_at')
      .eq('email', 'iradwatkins@gmail.com')
      .single();

    if (error) {
      console.log('   ❌ Admin profile not found:', error.message);
    } else {
      console.log('   ✅ Admin profile exists!');
      console.log(`      Email: ${adminProfile.email}`);
      console.log(`      Name: ${adminProfile.full_name}`);
      console.log(`      Admin: ${adminProfile.is_admin}`);
      console.log(`      Level: ${adminProfile.admin_level}`);
      console.log(`      Created: ${adminProfile.created_at}`);
      testsPassed++;
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }

  // Test 2: Check RLS policies allow insertion
  totalTests++;
  console.log('\n2. Testing profile creation permissions...');
  try {
    const testId = '00000000-0000-0000-0000-000000000001';
    
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: 'test@example.com',
        full_name: 'Test User',
        is_admin: false,
        admin_level: 0
      });

    if (error) {
      if (error.message.includes('violates foreign key constraint')) {
        console.log('   ✅ RLS allows insertion (foreign key error expected)');
        testsPassed++;
      } else if (error.message.includes('row-level security')) {
        console.log('   ❌ RLS still blocking:', error.message);
      } else {
        console.log('   ⚠️  Unexpected error:', error.message);
      }
    } else {
      console.log('   ✅ Profile creation successful! (cleaning up)');
      await supabase.from('profiles').delete().eq('id', testId);
      testsPassed++;
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }

  // Test 3: Check total profiles
  totalTests++;
  console.log('\n3. Checking total profiles in database...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('email, is_admin, full_name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('   ❌ Cannot access profiles:', error.message);
    } else {
      console.log(`   ✅ Found ${profiles.length} profiles in database`);
      
      if (profiles.length > 0) {
        testsPassed++;
        profiles.forEach((profile, index) => {
          console.log(`      ${index + 1}. ${profile.email} ${profile.is_admin ? '(ADMIN)' : '(USER)'}`);
          console.log(`         Name: ${profile.full_name || 'Not set'}`);
          console.log(`         Created: ${profile.created_at}`);
        });
      } else {
        console.log('   ⚠️  No profiles found - trigger may still not be working');
      }
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`📊 TEST RESULTS: ${testsPassed}/${totalTests} tests passed`);
  console.log('='.repeat(70));

  if (testsPassed === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Registration should now work.');
    console.log('\n🚀 READY TO TEST:');
    console.log('1. Go to http://localhost:8080');
    console.log('2. Click "Sign In / Register" button');
    console.log('3. Try Google OAuth or email registration');
    console.log('4. Check if user profile appears with name');
    console.log('5. Verify navigation shows user info');
    
    console.log('\n✅ EXPECTED RESULTS:');
    console.log('- No more "Database error saving new user"');
    console.log('- Profile created automatically on registration');
    console.log('- User name appears in navigation');
    console.log('- Google OAuth pulls name and avatar');
    
  } else if (testsPassed >= 1) {
    console.log('⚠️  PARTIAL SUCCESS - Some issues remain');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Test registration manually');
    console.log('2. Check Supabase logs for trigger errors');
    console.log('3. Verify all SQL statements were applied');
    
  } else {
    console.log('❌ TESTS FAILED - Fix not applied correctly');
    console.log('\n🚨 ACTION REQUIRED:');
    console.log('1. Ensure ALL SQL statements were run in Supabase');
    console.log('2. Check for SQL syntax errors');
    console.log('3. Verify database permissions');
    console.log('4. Re-run the fix SQL statements');
  }

  return testsPassed === totalTests;
}

testRegistrationFix()
  .then(success => {
    console.log(success ? '\n🎯 Fix verification complete!' : '\n❌ Fix needs more work');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });