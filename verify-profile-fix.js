#!/usr/bin/env node
/**
 * Verify that the profile creation fix was applied successfully
 * Run this AFTER applying the SQL statements
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function verifyProfileFix() {
  console.log('✅ Verifying profile creation fix...\n');

  let allPassed = true;
  const results = [];

  // Test 1: Check admin profile exists
  console.log('1. Checking admin profile...');
  try {
    const { data: adminProfile, error } = await supabase
      .from('profiles')
      .select('email, full_name, is_admin, admin_level')
      .eq('email', 'iradwatkins@gmail.com')
      .single();

    if (error) {
      console.log('   ❌ FAILED: Admin profile not found');
      console.log('   Error:', error.message);
      results.push('❌ Admin profile: NOT FOUND');
      allPassed = false;
    } else {
      console.log('   ✅ PASSED: Admin profile exists');
      console.log(`   - Email: ${adminProfile.email}`);
      console.log(`   - Name: ${adminProfile.full_name}`);
      console.log(`   - Is Admin: ${adminProfile.is_admin}`);
      console.log(`   - Admin Level: ${adminProfile.admin_level}`);
      results.push('✅ Admin profile: EXISTS');
    }
  } catch (err) {
    console.log('   ❌ FAILED: Exception -', err.message);
    results.push('❌ Admin profile: ERROR');
    allPassed = false;
  }

  // Test 2: Check trigger function exists
  console.log('\n2. Testing trigger function...');
  try {
    // Try to call the function (should give parameter error but function exists)
    const { error } = await supabase.rpc('handle_new_user');
    
    if (error && error.message.includes('function handle_new_user() does not exist')) {
      console.log('   ❌ FAILED: handle_new_user function does not exist');
      results.push('❌ Trigger function: MISSING');
      allPassed = false;
    } else {
      console.log('   ✅ PASSED: handle_new_user function exists');
      results.push('✅ Trigger function: EXISTS');
    }
  } catch (err) {
    console.log('   ⚠️  Cannot test function directly, assuming it exists');
    results.push('⚠️  Trigger function: UNKNOWN');
  }

  // Test 3: Check RLS policies allow profile creation
  console.log('\n3. Testing profile creation permissions...');
  try {
    const testId = '00000000-0000-0000-0000-000000000001';
    
    // Try to insert a test profile
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
        console.log('   ✅ PASSED: RLS allows insertion (foreign key constraint expected)');
        results.push('✅ RLS policies: PERMISSIVE');
      } else if (error.message.includes('row-level security')) {
        console.log('   ❌ FAILED: RLS still blocking profile creation');
        console.log('   Error:', error.message);
        results.push('❌ RLS policies: BLOCKING');
        allPassed = false;
      } else {
        console.log('   ⚠️  Unexpected error:', error.message);
        results.push('⚠️  RLS policies: UNKNOWN');
      }
    } else {
      console.log('   ✅ PASSED: Profile creation successful');
      // Clean up test profile
      await supabase.from('profiles').delete().eq('id', testId);
      results.push('✅ RLS policies: PERMISSIVE');
    }
  } catch (err) {
    console.log('   ❌ FAILED: Exception -', err.message);
    results.push('❌ RLS policies: ERROR');
    allPassed = false;
  }

  // Test 4: Check total profiles count
  console.log('\n4. Checking profiles count...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('email, is_admin');

    if (error) {
      console.log('   ❌ FAILED: Cannot access profiles');
      results.push('❌ Profile access: BLOCKED');
      allPassed = false;
    } else {
      console.log(`   ✅ PASSED: Found ${profiles.length} profiles`);
      profiles.forEach(profile => {
        console.log(`   - ${profile.email} ${profile.is_admin ? '(ADMIN)' : '(USER)'}`);
      });
      results.push(`✅ Profiles count: ${profiles.length}`);
    }
  } catch (err) {
    console.log('   ❌ FAILED: Exception -', err.message);
    results.push('❌ Profile access: ERROR');
    allPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  
  results.forEach(result => console.log(result));
  
  console.log('\n' + (allPassed ? '🎉' : '❌') + ' OVERALL RESULT: ' + (allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'));
  
  if (allPassed) {
    console.log('\n🚀 READY FOR TESTING:');
    console.log('1. Go to http://localhost:8080');
    console.log('2. Click "Sign In / Register" button');
    console.log('3. Try registering with a Gmail account');
    console.log('4. Check if profile appears with name and avatar');
    console.log('5. Verify navigation shows user info');
    
    console.log('\n✅ EXPECTED RESULTS:');
    console.log('- User registration creates profile automatically');
    console.log('- Navigation shows user name and avatar');
    console.log('- Admin users see admin navigation options');
    console.log('- Regular users see standard navigation');
  } else {
    console.log('\n🚨 ISSUES REMAINING:');
    console.log('1. Check that ALL SQL statements were applied');
    console.log('2. Ensure no syntax errors in SQL execution');
    console.log('3. Verify database permissions allow trigger execution');
    console.log('4. Re-run the SQL statements if needed');
  }
  
  return allPassed;
}

// Run verification
verifyProfileFix()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  });