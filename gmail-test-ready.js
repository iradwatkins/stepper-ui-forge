#!/usr/bin/env node
/**
 * Gmail Registration Test Readiness Checker
 * Verifies all monitoring systems are ready for live testing
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTestReadiness() {
  console.log('🔬 GMAIL REGISTRATION TEST READINESS CHECK');
  console.log('=' .repeat(70));
  
  let allReady = true;
  const issues = [];

  // Check 1: Supabase Connection
  console.log('1️⃣ Checking Supabase connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log('   ❌ Supabase connection failed:', error.message);
      issues.push('supabase_connection');
      allReady = false;
    } else {
      console.log('   ✅ Supabase connected successfully');
    }
  } catch (err) {
    console.log('   ❌ Supabase connection error:', err.message);
    issues.push('supabase_connection');
    allReady = false;
  }

  // Check 2: Development Server
  console.log('\n2️⃣ Checking development server...');
  try {
    const response = await fetch('http://localhost:8081');
    console.log('   ✅ Development server running on port 8081');
  } catch (err) {
    try {
      const response = await fetch('http://localhost:8080');
      console.log('   ✅ Development server running on port 8080');
    } catch (err2) {
      console.log('   ❌ Development server not running');
      console.log('   💡 Run: npm run dev');
      issues.push('dev_server');
      allReady = false;
    }
  }

  // Check 3: Required Files
  console.log('\n3️⃣ Checking monitoring files...');
  const requiredFiles = [
    'real-time-db-monitor.js',
    'src/utils/registrationTracer.ts',
    'start-live-test.js'
  ];

  for (const file of requiredFiles) {
    try {
      execSync(`test -f ${file}`, { stdio: 'ignore' });
      console.log(`   ✅ ${file}`);
    } catch (err) {
      console.log(`   ❌ Missing: ${file}`);
      issues.push(`missing_${file}`);
      allReady = false;
    }
  }

  // Check 4: Database State
  console.log('\n4️⃣ Checking database state...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('email, created_at, is_admin')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('   ❌ Cannot access profiles table:', error.message);
      issues.push('profiles_access');
      allReady = false;
    } else {
      console.log(`   ✅ Profiles table accessible (${profiles.length} profiles)`);
      
      if (profiles.length > 0) {
        console.log('   📋 Current profiles:');
        profiles.slice(0, 3).forEach(profile => {
          console.log(`      - ${profile.email} ${profile.is_admin ? '(ADMIN)' : ''}`);
        });
      }
    }
  } catch (err) {
    console.log('   ❌ Database state check failed:', err.message);
    issues.push('database_state');
    allReady = false;
  }

  // Check 5: RLS Policies (Test Insert)
  console.log('\n5️⃣ Testing profile creation permissions...');
  try {
    const testId = 'test-' + Date.now();
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: 'readiness-test@example.com',
        full_name: 'Readiness Test'
      });

    if (error) {
      if (error.message.includes('row-level security')) {
        console.log('   ❌ RLS policies blocking profile creation');
        console.log('   💡 Apply the SQL fix first: fix-gmail-registration-error.sql');
        issues.push('rls_blocking');
        allReady = false;
      } else if (error.message.includes('foreign key')) {
        console.log('   ✅ RLS allows profile creation (foreign key constraint OK)');
      } else {
        console.log('   ⚠️  Unexpected error:', error.message);
        issues.push('unexpected_db_error');
      }
    } else {
      console.log('   ✅ Profile creation successful');
      // Clean up test record
      await supabase.from('profiles').delete().eq('id', testId);
    }
  } catch (err) {
    console.log('   ❌ Profile creation test failed:', err.message);
    issues.push('profile_creation_test');
    allReady = false;
  }

  // Check 6: Environment Variables
  console.log('\n6️⃣ Checking environment configuration...');
  const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar} configured`);
    } else {
      console.log(`   ❌ Missing: ${envVar}`);
      issues.push(`missing_${envVar}`);
      allReady = false;
    }
  }

  // Results Summary
  console.log('\n' + '='.repeat(70));
  
  if (allReady) {
    console.log('🎉 ALL SYSTEMS READY FOR GMAIL REGISTRATION TEST!');
    console.log('\n🚀 TO START THE LIVE TEST:');
    console.log('1. Run: node start-live-test.js');
    console.log('2. Follow the on-screen instructions');
    console.log('3. Register with your Gmail account');
    console.log('4. Watch real-time monitoring output');
    
    console.log('\n🎯 TEST ACCOUNTS READY:');
    console.log('- appvillagellc@gmail.com');
    console.log('- ira@irawatkins.com');
    console.log('- Any other Gmail account');
    
    console.log('\n📊 MONITORING WILL CAPTURE:');
    console.log('✅ Database changes in real-time');
    console.log('✅ Network requests and responses');
    console.log('✅ JavaScript errors and console logs');
    console.log('✅ URL changes and error redirects');
    console.log('✅ Authentication state changes');
    
  } else {
    console.log('❌ SYSTEM NOT READY - ISSUES FOUND');
    console.log('\n🚨 ISSUES TO RESOLVE:');
    
    const solutions = {
      'supabase_connection': 'Check .env file and Supabase credentials',
      'dev_server': 'Run: npm run dev',
      'rls_blocking': 'Apply SQL fix: fix-gmail-registration-error.sql in Supabase',
      'profiles_access': 'Check Supabase permissions and database setup',
      'missing_VITE_SUPABASE_URL': 'Add VITE_SUPABASE_URL to .env file',
      'missing_VITE_SUPABASE_ANON_KEY': 'Add VITE_SUPABASE_ANON_KEY to .env file'
    };
    
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.toUpperCase().replace(/_/g, ' ')}`);
      if (solutions[issue]) {
        console.log(`   Solution: ${solutions[issue]}`);
      }
    });
  }
  
  console.log('='.repeat(70));
  return allReady;
}

// Run readiness check
checkTestReadiness()
  .then(ready => {
    process.exit(ready ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Readiness check failed:', error);
    process.exit(1);
  });