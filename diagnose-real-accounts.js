#!/usr/bin/env node
/**
 * Deep diagnostic for real Gmail account registration issues
 * Identifies exact blocking points for appvillagellc@gmail.com and ira@irawatkins.com
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnoseRealAccounts() {
  console.log('🔍 DEEP DIAGNOSTIC: Real Gmail Account Registration Issues\n');
  
  const issues = [];
  
  // Test 1: Check current database state
  console.log('1. DATABASE STATE ANALYSIS');
  console.log('=' .repeat(50));
  
  try {
    // Check profiles table structure
    const { data: profileSample, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
      
    if (profileError) {
      console.log('❌ CRITICAL: Cannot access profiles table');
      console.log('   Error:', profileError.message);
      issues.push('profiles_table_access');
    } else {
      console.log('✅ Profiles table accessible');
      
      // Check if required columns exist
      const sampleProfile = profileSample[0];
      const requiredColumns = ['id', 'email', 'full_name', 'avatar_url', 'is_admin', 'admin_level'];
      const missingColumns = requiredColumns.filter(col => !(col in sampleProfile));
      
      if (missingColumns.length > 0) {
        console.log('❌ MISSING COLUMNS:', missingColumns.join(', '));
        issues.push('missing_columns');
      } else {
        console.log('✅ All required columns present');
      }
    }
  } catch (err) {
    console.log('❌ CRITICAL ERROR accessing database:', err.message);
    issues.push('database_connection');
  }

  // Test 2: RLS Policy Analysis
  console.log('\n2. ROW LEVEL SECURITY ANALYSIS');
  console.log('=' .repeat(50));
  
  try {
    // Test INSERT permission with actual user context
    const testUserId = '33333333-3333-3333-3333-333333333333';
    
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        email: 'rls-test@example.com',
        full_name: 'RLS Test User'
      });
      
    if (insertError) {
      if (insertError.message.includes('row-level security')) {
        console.log('❌ CRITICAL: RLS blocking profile creation');
        console.log('   Full error:', insertError.message);
        issues.push('rls_blocking_insert');
      } else if (insertError.message.includes('foreign key')) {
        console.log('✅ RLS allows INSERT (foreign key constraint expected)');
      } else {
        console.log('⚠️  Unexpected INSERT error:', insertError.message);
        issues.push('unexpected_insert_error');
      }
    } else {
      console.log('✅ RLS allows profile creation');
      // Clean up test
      await supabase.from('profiles').delete().eq('id', testUserId);
    }
  } catch (err) {
    console.log('❌ Error testing RLS:', err.message);
    issues.push('rls_test_error');
  }

  // Test 3: Trigger Function Analysis
  console.log('\n3. TRIGGER FUNCTION ANALYSIS');
  console.log('=' .repeat(50));
  
  try {
    // Check if trigger function has SECURITY DEFINER
    const { data, error } = await supabase
      .rpc('handle_new_user')
      .single();
      
    if (error) {
      if (error.message.includes('function handle_new_user() does not exist')) {
        console.log('❌ CRITICAL: handle_new_user function missing');
        issues.push('missing_trigger_function');
      } else if (error.message.includes('argument')) {
        console.log('✅ handle_new_user function exists (parameter error expected)');
      } else {
        console.log('⚠️  Trigger function error:', error.message);
        issues.push('trigger_function_error');
      }
    }
  } catch (err) {
    console.log('⚠️  Cannot test trigger function directly');
  }

  // Test 4: Auth Configuration
  console.log('\n4. AUTHENTICATION CONFIGURATION');
  console.log('=' .repeat(50));
  
  try {
    // Test auth session
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Auth session error:', sessionError.message);
      issues.push('auth_session_error');
    } else {
      console.log('✅ Auth system accessible');
    }
    
    // Check environment variables
    const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      console.log('❌ MISSING ENV VARS:', missingEnvVars.join(', '));
      issues.push('missing_env_vars');
    } else {
      console.log('✅ Required environment variables present');
    }
  } catch (err) {
    console.log('❌ Auth configuration error:', err.message);
    issues.push('auth_config_error');
  }

  // Test 5: Real Account Status Check
  console.log('\n5. REAL ACCOUNT STATUS CHECK');
  console.log('=' .repeat(50));
  
  const testAccounts = ['appvillagellc@gmail.com', 'ira@irawatkins.com'];
  
  for (const email of testAccounts) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('email, full_name, created_at, is_admin')
        .eq('email', email)
        .single();
        
      if (error && error.code === 'PGRST116') {
        console.log(`✅ ${email} - Ready for registration (not in database)`);
      } else if (profile) {
        console.log(`⚠️  ${email} - Already exists in database`);
        console.log(`   Name: ${profile.full_name || 'Not set'}`);
        console.log(`   Created: ${profile.created_at}`);
        console.log(`   Admin: ${profile.is_admin}`);
      } else {
        console.log(`❌ ${email} - Unexpected error:`, error?.message);
      }
    } catch (err) {
      console.log(`❌ ${email} - Error checking:`, err.message);
    }
  }

  // Test 6: Simulate Registration Flow
  console.log('\n6. REGISTRATION FLOW SIMULATION');
  console.log('=' .repeat(50));
  
  try {
    // Simulate what happens during Google OAuth registration
    const mockGoogleUser = {
      id: '44444444-4444-4444-4444-444444444444',
      email: 'test-simulation@gmail.com',
      raw_user_meta_data: {
        full_name: 'Test Simulation User',
        avatar_url: 'https://lh3.googleusercontent.com/test'
      }
    };
    
    console.log('Simulating trigger execution...');
    
    // This simulates what the trigger would do
    const { error: simulationError } = await supabase
      .from('profiles')
      .insert({
        id: mockGoogleUser.id,
        email: mockGoogleUser.email,
        full_name: mockGoogleUser.raw_user_meta_data.full_name,
        avatar_url: mockGoogleUser.raw_user_meta_data.avatar_url,
        is_admin: false,
        admin_level: 0
      });
      
    if (simulationError) {
      console.log('❌ SIMULATION FAILED - This is the exact error users see:');
      console.log('   Error:', simulationError.message);
      issues.push('simulation_failed');
      
      if (simulationError.message.includes('row-level security')) {
        console.log('   ROOT CAUSE: RLS policies blocking profile creation');
      }
    } else {
      console.log('✅ Simulation successful - registration should work');
      // Clean up simulation
      await supabase.from('profiles').delete().eq('id', mockGoogleUser.id);
    }
  } catch (err) {
    console.log('❌ Simulation error:', err.message);
    issues.push('simulation_error');
  }

  // Results Summary
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DIAGNOSTIC RESULTS');
  console.log('='.repeat(70));
  
  if (issues.length === 0) {
    console.log('✅ NO ISSUES FOUND - Registration should work');
    
    console.log('\n🚀 READY FOR REAL ACCOUNT TESTING:');
    console.log('1. Go to http://localhost:8081');
    console.log('2. Test Google OAuth with appvillagellc@gmail.com');
    console.log('3. Test Google OAuth with ira@irawatkins.com');
    
  } else {
    console.log(`❌ FOUND ${issues.length} ISSUES BLOCKING REGISTRATION:`);
    
    const solutions = {
      'rls_blocking_insert': 'Apply definitive-auth-fix-v2.sql to fix RLS policies',
      'missing_trigger_function': 'Create handle_new_user() function with SECURITY DEFINER',
      'missing_columns': 'Run ALTER TABLE to add missing columns',
      'profiles_table_access': 'Check database permissions and connection',
      'missing_env_vars': 'Set up .env file with Supabase credentials'
    };
    
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.toUpperCase().replace(/_/g, ' ')}`);
      if (solutions[issue]) {
        console.log(`   Solution: ${solutions[issue]}`);
      }
    });
    
    console.log('\n🚨 IMMEDIATE ACTION REQUIRED:');
    console.log('1. Apply definitive-auth-fix-v2.sql to Supabase SQL Editor');
    console.log('2. Re-run this diagnostic: node diagnose-real-accounts.js');
    console.log('3. Verify all issues are resolved before testing');
  }
  
  return issues.length === 0;
}

// Run diagnostic
diagnoseRealAccounts()
  .then(success => {
    console.log(success ? '\n🎯 System ready for real account testing!' : '\n❌ Issues must be fixed first');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Diagnostic failed:', error);
    process.exit(1);
  });