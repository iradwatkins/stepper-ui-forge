#!/usr/bin/env node
/**
 * Payment Environment Validation Script
 * Tests the payment gateway configuration fixes
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

console.log('🔍 Payment Environment Validation\n');

// Test 1: Environment Variable Detection
console.log('1. Environment Variables:');
const requiredVars = [
  'VITE_SQUARE_APP_ID',
  'VITE_SQUARE_ENVIRONMENT', 
  'VITE_SQUARE_LOCATION_ID',
  'VITE_SQUARE_ACCESS_TOKEN',
  'VITE_CASHAPP_CLIENT_ID',
  'VITE_CASHAPP_ENVIRONMENT',
  'VITE_PAYPAL_CLIENT_ID',
  'VITE_PAYPAL_ENVIRONMENT'
];

const missingVars = [];
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('your_') || value.includes('XXXXX')) {
    missingVars.push(varName);
    console.log(`   ❌ ${varName}: MISSING or PLACEHOLDER`);
  } else {
    console.log(`   ✅ ${varName}: ${value.substring(0, 15)}...`);
  }
});

// Test 2: Environment Consistency 
console.log('\n2. Environment Consistency:');
const squareAppId = process.env.VITE_SQUARE_APP_ID;
const squareEnv = process.env.VITE_SQUARE_ENVIRONMENT;
const cashappClientId = process.env.VITE_CASHAPP_CLIENT_ID;
const cashappEnv = process.env.VITE_CASHAPP_ENVIRONMENT;
const paypalEnv = process.env.VITE_PAYPAL_ENVIRONMENT;

// Check Square
const isSquareProductionAppId = squareAppId?.startsWith('sq0idp-') && !squareAppId.includes('sandbox');
const isSquareProductionEnv = squareEnv === 'production';
if (isSquareProductionAppId === isSquareProductionEnv) {
  console.log(`   ✅ Square: App ID (${isSquareProductionAppId ? 'prod' : 'sandbox'}) matches environment (${squareEnv})`);
} else {
  console.log(`   ❌ Square: App ID (${isSquareProductionAppId ? 'prod' : 'sandbox'}) vs environment (${squareEnv}) MISMATCH`);
}

// Check Cash App
const isCashAppProductionClient = cashappClientId?.startsWith('sq0idp-') && !cashappClientId.includes('sandbox');
const isCashAppProductionEnv = cashappEnv === 'production';
if (isCashAppProductionClient === isCashAppProductionEnv) {
  console.log(`   ✅ Cash App: Client ID (${isCashAppProductionClient ? 'prod' : 'sandbox'}) matches environment (${cashappEnv})`);
} else {
  console.log(`   ❌ Cash App: Client ID (${isCashAppProductionClient ? 'prod' : 'sandbox'}) vs environment (${cashappEnv}) MISMATCH`);
}

// Check PayPal
console.log(`   ✅ PayPal: Environment set to ${paypalEnv}`);

// Test 3: Configuration File Check
console.log('\n3. Configuration Files:');
try {
  const paymentConfigContent = readFileSync('./src/lib/payment-config.ts', 'utf8');
  
  if (paymentConfigContent.includes('import.meta.env.VITE_')) {
    console.log('   ✅ payment-config.ts: Uses environment variables (not hardcoded)');
  } else {
    console.log('   ❌ payment-config.ts: May contain hardcoded values');
  }
  
  if (paymentConfigContent.includes('auto-detect')) {
    console.log('   ✅ payment-config.ts: Has auto-detection logic');
  }
  
} catch (error) {
  console.log('   ❌ Could not read payment-config.ts');
}

// Test 4: SDK URL Logic  
console.log('\n4. SDK URL Logic:');
try {
  const squareSDKContent = readFileSync('./src/lib/payments/square-sdk.ts', 'utf8');
  
  if (squareSDKContent.includes('web.squarecdn.com') && squareSDKContent.includes('sandbox.web.squarecdn.com')) {
    console.log('   ✅ square-sdk.ts: Has both production and sandbox URLs');
  } else {
    console.log('   ❌ square-sdk.ts: Missing URL configuration');
  }
  
  if (squareSDKContent.includes('isProduction')) {
    console.log('   ✅ square-sdk.ts: Has production detection logic');
  }
  
} catch (error) {
  console.log('   ❌ Could not read square-sdk.ts');
}

// Test 5: Database Functions
console.log('\n5. Database Functions:');
try {
  const migrationContent = readFileSync('./supabase/migrations/010_add_event_likes_system.sql', 'utf8');
  
  if (migrationContent.includes('get_event_like_count') && migrationContent.includes('is_event_liked')) {
    console.log('   ✅ Migration file contains required RPC functions');
  } else {
    console.log('   ❌ Migration file missing RPC functions');
  }
  
  const deployScriptExists = readFileSync('./deploy-missing-functions.sql', 'utf8');
  console.log('   ✅ Manual deployment script created');
  
} catch (error) {
  console.log('   ❌ Database files not found');
}

// Summary
console.log('\n📋 Summary:');
if (missingVars.length === 0) {
  console.log('✅ All environment variables are configured');
} else {
  console.log(`❌ ${missingVars.length} environment variables need configuration:`);
  missingVars.forEach(varName => console.log(`   - ${varName}`));
}

console.log('\n🔧 Next Steps:');
console.log('1. Run the SQL script: copy deploy-missing-functions.sql to Supabase SQL Editor');
console.log('2. Restart your development server: npm run dev');
console.log('3. Test payment gateways in browser console for environment errors');
console.log('4. Verify no more 404 errors for get_event_like_count/is_event_liked');