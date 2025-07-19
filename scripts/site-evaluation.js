#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== STEPPERS LIFE SITE EVALUATION ===\n');

// 1. Test server connectivity
async function testServer() {
  console.log('1. Testing Server Connectivity...');
  try {
    const response = await fetch('http://localhost:8080');
    console.log('✅ Dev server is running on localhost:8080');
    console.log(`   Status: ${response.status}`);
  } catch (error) {
    console.log('❌ Dev server is NOT running');
    console.log('   Run: npm run dev');
  }
}

// 2. Test database connectivity
async function testDatabase() {
  console.log('\n2. Testing Database Connectivity...');
  try {
    const { data, error } = await supabase
      .from('events')
      .select('count', { count: 'exact', head: true });
    
    if (error) throw error;
    console.log('✅ Supabase connection successful');
    console.log(`   Events in database: ${data}`);
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
}

// 3. Check authentication
async function testAuth() {
  console.log('\n3. Testing Authentication...');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log('✅ Active session found');
      console.log(`   User: ${session.user.email}`);
    } else {
      console.log('ℹ️  No active session');
    }
  } catch (error) {
    console.log('❌ Auth check failed:', error.message);
  }
}

// 4. Test core features
async function testFeatures() {
  console.log('\n4. Testing Core Features...');
  
  // Test events
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, event_type, status')
      .limit(5);
    
    if (error) throw error;
    console.log(`✅ Events: ${events.length} found`);
    events.forEach(event => {
      console.log(`   - ${event.title} (${event.event_type}, ${event.status})`);
    });
  } catch (error) {
    console.log('❌ Events query failed:', error.message);
  }
  
  // Test classes
  try {
    const { data: classes, error } = await supabase
      .from('stepping_classes')
      .select('id, title, status')
      .limit(5);
    
    if (error) throw error;
    console.log(`\n✅ Classes: ${classes.length} found`);
    classes.forEach(cls => {
      console.log(`   - ${cls.title} (${cls.status})`);
    });
  } catch (error) {
    console.log('❌ Classes query failed:', error.message);
  }
  
  // Test businesses
  try {
    const { data: businesses, error } = await supabase
      .from('community_businesses')
      .select('id, name, status')
      .limit(5);
    
    if (error) throw error;
    console.log(`\n✅ Businesses: ${businesses.length} found`);
    businesses.forEach(biz => {
      console.log(`   - ${biz.name} (${biz.status})`);
    });
  } catch (error) {
    console.log('❌ Businesses query failed:', error.message);
  }
}

// 5. List all routes
function listRoutes() {
  console.log('\n5. Available Routes:');
  const routes = [
    { path: '/', desc: 'Homepage' },
    { path: '/events', desc: 'Browse Events' },
    { path: '/magazine', desc: 'Magazine' },
    { path: '/classes', desc: 'Stepping Classes' },
    { path: '/community', desc: 'Community Businesses' },
    { path: '/create-event', desc: 'Create Event (auth required)' },
    { path: '/create-class', desc: 'Create Class (auth required)' },
    { path: '/create-business', desc: 'Create Business (auth required)' },
    { path: '/dashboard', desc: 'User Dashboard (auth required)' },
    { path: '/my-tickets', desc: 'My Tickets' },
    { path: '/account', desc: 'Login/Signup' },
    { path: '/database-test', desc: 'Database Test Page' },
    { path: '/test-seating', desc: 'Test Premium Event Seating' },
    { path: '/payment-test', desc: 'Payment Test Page' },
  ];
  
  routes.forEach(route => {
    console.log(`   ${route.path} - ${route.desc}`);
  });
}

// 6. Check payment config
function checkPaymentConfig() {
  console.log('\n6. Payment Configuration:');
  const paymentConfigs = [
    { name: 'PayPal', key: 'VITE_PAYPAL_CLIENT_ID' },
    { name: 'Square', key: 'VITE_SQUARE_APP_ID' },
    { name: 'Cash App', key: 'VITE_CASHAPP_CLIENT_ID' },
  ];
  
  paymentConfigs.forEach(config => {
    const value = process.env[config.key];
    const status = value && value !== `your_${config.name.toLowerCase()}_client_id_here` ? '✅' : '❌';
    console.log(`   ${status} ${config.name}: ${value ? 'Configured' : 'Not configured'}`);
  });
}

// Run all tests
async function runEvaluation() {
  await testServer();
  await testDatabase();
  await testAuth();
  await testFeatures();
  listRoutes();
  checkPaymentConfig();
  
  console.log('\n=== EVALUATION COMPLETE ===');
  console.log('\nRecommended actions:');
  console.log('1. Visit http://localhost:8080 to test the UI');
  console.log('2. Create a test account at /account');
  console.log('3. Test event creation at /create-event');
  console.log('4. Check database operations at /database-test');
  console.log('5. Configure payment gateways in .env file');
}

runEvaluation().catch(console.error);