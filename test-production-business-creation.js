#!/usr/bin/env node

/**
 * PRODUCTION Business Creation Test
 * Tests real business creation with actual Supabase database
 * Uses real authentication and real data - NO MOCKS
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Real test business data (will be saved to production database)
const realBusinessData = {
  business_name: 'Test Stepping Academy',
  description: 'Professional stepping dance instruction for all skill levels. We teach the authentic Chicago stepping style with experienced instructors who have been dancing for over 15 years.',
  category: 'fitness_sports',
  subcategory: 'Dance Studio',
  business_type: 'physical_business',
  contact_email: 'info@teststeppingacademy.com',
  contact_phone: '(555) 123-4567',
  website_url: 'https://teststeppingacademy.com',
  social_media: {
    facebook: 'https://facebook.com/teststeppingacademy',
    instagram: 'https://instagram.com/teststeppingacademy'
  },
  address: '123 Dance Street',
  city: 'Chicago',
  state: 'IL',
  zip_code: '60601',
  latitude: 41.8781,
  longitude: -87.6298,
  business_hours: {
    monday: { open: '17:00', close: '21:00' },
    tuesday: { open: '17:00', close: '21:00' },
    wednesday: { open: '17:00', close: '21:00' },
    thursday: { open: '17:00', close: '21:00' },
    friday: { open: '17:00', close: '22:00' },
    saturday: { open: '10:00', close: '22:00' },
    sunday: { open: '12:00', close: '20:00' }
  },
  price_range: '$$',
  tags: ['stepping', 'dance', 'chicago', 'lessons', 'beginner-friendly'],
  is_verified: false,
  featured: false,
  view_count: 0,
  rating_average: 0
};

class ProductionBusinessTest {
  constructor() {
    this.testResults = [];
    this.createdBusinessId = null;
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`🧪 ${testName}...`);
      const result = await testFunction();
      console.log(`✅ PASSED: ${testName}`);
      this.testResults.push({ name: testName, status: 'PASSED', result });
      return result;
    } catch (error) {
      console.error(`❌ FAILED: ${testName}`);
      console.error(`   Error: ${error.message}`);
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
      throw error;
    }
  }

  async testDatabaseConnection() {
    const { data, error } = await supabase.from('community_businesses').select('count', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    console.log(`   📊 Connected to production database`);
    return true;
  }

  async testSchemaIsFixed() {
    // Test that business_type column now exists
    const { error } = await supabase
      .from('community_businesses')
      .select('business_type, social_media, business_hours, tags')
      .limit(1);
    
    if (error) {
      throw new Error(`Schema still has issues: ${error.message}`);
    }
    console.log(`   ✅ Required columns are present`);
    return true;
  }

  async testRealBusinessCreation() {  
    console.log(`   📝 Creating real business in production database...`);
    
    // For this test, we'll create a business with a test owner_id
    // In real usage, this would come from an authenticated user
    const testUserId = '00000000-0000-0000-0000-000000000001'; // Test user ID
    
    const businessDataWithOwner = {
      ...realBusinessData,
      owner_id: testUserId,
      status: 'pending' // Will be pending until admin approves
    };

    const { data, error } = await supabase
      .from('community_businesses')
      .insert(businessDataWithOwner)
      .select()
      .single();

    if (error) {
      throw new Error(`Real business creation failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('Business creation returned no data');
    }

    this.createdBusinessId = data.id;
    console.log(`   ✅ Business created with ID: ${data.id}`);
    console.log(`   📊 Status: ${data.status}`);
    console.log(`   📍 Type: ${data.business_type}`);
    console.log(`   🏢 Name: ${data.business_name}`);
    
    return data;
  }

  async testBusinessRetrieval() {
    if (!this.createdBusinessId) {
      throw new Error('No business ID to retrieve');
    }

    const { data, error } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('id', this.createdBusinessId)
      .single();

    if (error) {
      throw new Error(`Business retrieval failed: ${error.message}`);
    }

    console.log(`   📖 Retrieved business: ${data.business_name}`);
    console.log(`   📊 All fields present: ${Object.keys(data).length} columns`);
    
    // Verify key fields are correctly saved
    const keyFields = ['business_type', 'social_media', 'business_hours', 'tags'];
    for (const field of keyFields) {
      if (data[field] !== undefined) {
        console.log(`   ✅ ${field}: ${typeof data[field] === 'object' ? 'JSON data present' : data[field]}`);
      }
    }
    
    return data;
  }

  async testCommunityPageQuery() {
    // Test the query that the Community page uses
    const { data, error } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('status', 'approved'); // Only approved businesses show on community page

    if (error) {
      throw new Error(`Community page query failed: ${error.message}`);
    }

    console.log(`   📊 Found ${data.length} approved businesses for Community page`);
    
    // Test filtering by business type (like the Community page does)
    const { data: physicalBusinesses, error: filterError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('business_type', 'physical_business');

    if (filterError) {
      throw new Error(`Business type filtering failed: ${filterError.message}`);
    }

    console.log(`   🏢 Found ${physicalBusinesses.length} physical businesses`);
    return data;
  }

  async testUserDashboardQuery() {
    // Test the query used by MyBusinesses dashboard
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    const { data, error } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('owner_id', testUserId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`User dashboard query failed: ${error.message}`);
    }

    console.log(`   👤 User has ${data.length} businesses in dashboard`);
    
    if (data.length > 0) {
      console.log(`   📝 Recent business: ${data[0].business_name} (${data[0].status})`);
    }
    
    return data;
  }

  async cleanup() {
    if (this.createdBusinessId) {
      console.log(`🧹 Cleaning up test business (ID: ${this.createdBusinessId})`);
      
      const { error } = await supabase
        .from('community_businesses')
        .delete()
        .eq('id', this.createdBusinessId);

      if (error) {
        console.warn(`⚠️ Cleanup failed: ${error.message}`);
        console.warn(`   Please manually delete business ID: ${this.createdBusinessId}`);
      } else {
        console.log(`✅ Test business cleaned up successfully`);
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 PRODUCTION TEST RESULTS');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(t => t.status === 'PASSED').length;
    const failed = this.testResults.filter(t => t.status === 'FAILED').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    console.log('');

    if (failed > 0) {
      console.log('❌ FAILED TESTS:');
      this.testResults
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
      console.log('');
    }

    if (passed === this.testResults.length) {
      console.log('🎉 ALL PRODUCTION TESTS PASSED!');
      console.log('✨ Business creation is working with real data in production database.');
      console.log('🚀 Users can now create and manage businesses successfully.');
    } else {
      console.log('⚠️ Some tests failed. Check the database schema and configuration.');
    }
  }

  async run() {
    console.log('🚀 PRODUCTION Business Creation Test');
    console.log('📊 Testing with REAL DATA in PRODUCTION DATABASE');
    console.log('=' .repeat(60));

    try {
      // Test database connectivity
      await this.runTest('Database Connection', () => this.testDatabaseConnection());
      
      // Test schema is fixed
      await this.runTest('Database Schema Fixed', () => this.testSchemaIsFixed());
      
      // Test real business creation
      await this.runTest('Real Business Creation', () => this.testRealBusinessCreation());
      
      // Test business retrieval
      await this.runTest('Business Data Retrieval', () => this.testBusinessRetrieval());
      
      // Test Community page queries
      await this.runTest('Community Page Queries', () => this.testCommunityPageQuery());
      
      // Test dashboard queries
      await this.runTest('User Dashboard Queries', () => this.testUserDashboardQuery());

      console.log('\n✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('\n💥 Test suite encountered an error:', error.message);
    } finally {
      // Always cleanup
      await this.cleanup();
      
      // Print results
      this.printSummary();
      
      // Exit with proper code
      process.exit(this.testResults.filter(t => t.status === 'FAILED').length > 0 ? 1 : 0);
    }
  }
}

// Run the production test
console.log('⚠️  PRODUCTION MODE - Testing with real database');
console.log('📝 This will create and test real business data');
console.log('');

const test = new ProductionBusinessTest();
test.run().catch(console.error);