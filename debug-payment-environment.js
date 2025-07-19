#!/usr/bin/env node
/**
 * Payment Environment Diagnostic Script
 * Run this after starting the dev server to get detailed environment info
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

console.log('🔍 COMPREHENSIVE PAYMENT ENVIRONMENT DIAGNOSIS\n');

console.log('='.repeat(60));
console.log('1. ENVIRONMENT VARIABLES CHECK');
console.log('='.repeat(60));

const envVars = {
  'VITE_SQUARE_APP_ID': process.env.VITE_SQUARE_APP_ID,
  'VITE_SQUARE_ENVIRONMENT': process.env.VITE_SQUARE_ENVIRONMENT,
  'VITE_SQUARE_LOCATION_ID': process.env.VITE_SQUARE_LOCATION_ID,
  'VITE_SQUARE_ACCESS_TOKEN': process.env.VITE_SQUARE_ACCESS_TOKEN,
  'VITE_CASHAPP_CLIENT_ID': process.env.VITE_CASHAPP_CLIENT_ID,
  'VITE_CASHAPP_ENVIRONMENT': process.env.VITE_CASHAPP_ENVIRONMENT,
  'VITE_PAYPAL_CLIENT_ID': process.env.VITE_PAYPAL_CLIENT_ID,
  'VITE_PAYPAL_ENVIRONMENT': process.env.VITE_PAYPAL_ENVIRONMENT
};

Object.entries(envVars).forEach(([key, value]) => {
  if (!value || value.includes('your_') || value.includes('XXXXX')) {
    console.log(`❌ ${key}: MISSING or PLACEHOLDER`);
  } else {
    console.log(`✅ ${key}: ${value.substring(0, 20)}...`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('2. ENVIRONMENT DETECTION LOGIC');
console.log('='.repeat(60));

const squareAppId = process.env.VITE_SQUARE_APP_ID;
const squareEnv = process.env.VITE_SQUARE_ENVIRONMENT;
const cashappClientId = process.env.VITE_CASHAPP_CLIENT_ID;
const cashappEnv = process.env.VITE_CASHAPP_ENVIRONMENT;

// Replicate the detection logic from payment-config.ts
const isSquareProductionAppId = squareAppId?.startsWith('sq0idp-') && !squareAppId.includes('sandbox');
const isSquareProductionEnv = squareEnv === 'production';
const isCashappProductionClient = cashappClientId?.startsWith('sq0idp-') && !cashappClientId.includes('sandbox');
const isCashappProductionEnv = cashappEnv === 'production';

console.log('Square Environment Analysis:');
console.log(`  App ID: ${squareAppId?.substring(0, 20)}...`);
console.log(`  App ID Type: ${isSquareProductionAppId ? 'PRODUCTION' : 'SANDBOX'}`);
console.log(`  Environment Setting: ${squareEnv}`);
console.log(`  Environment Match: ${isSquareProductionAppId === isSquareProductionEnv ? '✅ MATCH' : '❌ MISMATCH'}`);

console.log('\nCash App Environment Analysis:');
console.log(`  Client ID: ${cashappClientId?.substring(0, 20)}...`);
console.log(`  Client ID Type: ${isCashappProductionClient ? 'PRODUCTION' : 'SANDBOX'}`);
console.log(`  Environment Setting: ${cashappEnv}`);
console.log(`  Environment Match: ${isCashappProductionClient === isCashappProductionEnv ? '✅ MATCH' : '❌ MISMATCH'}`);

console.log('\n' + '='.repeat(60));
console.log('3. EXPECTED SDK URLS');
console.log('='.repeat(60));

console.log('Square SDK URLs:');
console.log(`  Production: https://web.squarecdn.com/v1/square.js`);
console.log(`  Sandbox: https://sandbox.web.squarecdn.com/v1/square.js`);
console.log(`  Expected for current config: ${isSquareProductionEnv ? 'PRODUCTION' : 'SANDBOX'} URL`);

console.log('\nCash App SDK URLs:');
console.log(`  Production: https://kit.cash.app/v1/pay.js`);
console.log(`  Sandbox: https://sandbox.kit.cash.app/v1/pay.js`);
console.log(`  Expected for current config: ${isCashappProductionEnv ? 'PRODUCTION' : 'SANDBOX'} URL`);

console.log('\n' + '='.repeat(60));
console.log('4. TROUBLESHOOTING STEPS');
console.log('='.repeat(60));

console.log('Now that the dev server is running:');
console.log('1. Open browser to: http://localhost:8080');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Look for these log messages:');
console.log('   - 🔐 Payment Config Loaded:');
console.log('   - 🔍 RAW ENV VARIABLES:');
console.log('   - 🟦 Square SDK Initialization');
console.log('   - 💰 CashApp SDK Initialization');
console.log('5. Go to Network tab and reload page');
console.log('6. Look for requests to square.js and pay.js');
console.log('7. Verify the URLs match expected environment');

console.log('\n' + '='.repeat(60));
console.log('5. POTENTIAL ISSUES TO CHECK');
console.log('='.repeat(60));

console.log('❌ If you see environment mismatch errors:');
console.log('   - Verify the SDK URLs loaded match the app ID type');
console.log('   - Check if browser cache is serving old SDK versions');
console.log('   - Look for multiple SDK initialization attempts');

console.log('\n❌ If you see database errors:');
console.log('   - Run the fix-database-schema.sql in Supabase SQL Editor');
console.log('   - Check that all migrations have been applied');

console.log('\n✅ Success indicators:');
console.log('   - No environment mismatch errors in console');
console.log('   - Correct SDK URLs loaded in Network tab');
console.log('   - Payment components initialize without errors');

console.log('\n' + '='.repeat(60));
console.log('DIAGNOSIS COMPLETE - Check browser console for runtime details');
console.log('='.repeat(60));