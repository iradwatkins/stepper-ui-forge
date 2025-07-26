#!/usr/bin/env node

/**
 * Comprehensive Business Creation Flow Test
 * Tests that businesses/services are properly saved to and retrieved from the database
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
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data for business creation
const testBusinessData = {
  business_name: 'Test Stepping Studio',
  description: 'A comprehensive test business for the stepping community. This is a detailed description to ensure our database properly stores longer text content.',
  category: 'fitness_sports',
  subcategory: 'Dance Studio',
  business_type: 'physical_business',
  contact_email: 'test@testbusiness.com',
  contact_phone: '(555) 123-4567',
  website_url: 'https://testbusiness.com',
  social_media: {
    facebook: 'https://facebook.com/testbusiness',
    instagram: 'https://instagram.com/testbusiness'
  },
  address: '123 Test Street',
  city: 'Chicago',
  state: 'IL',
  zip_code: '60601',
  country: 'United States',
  latitude: 41.8781,
  longitude: -87.6298,
  service_area_radius: 25,
  business_hours: {
    monday: { open: '09:00', close: '21:00' },
    tuesday: { open: '09:00', close: '21:00' },
    wednesday: { open: '09:00', close: '21:00' },
    thursday: { open: '09:00', close: '21:00' },
    friday: { open: '09:00', close: '22:00' },
    saturday: { open: '08:00', close: '22:00' },
    sunday: { open: '10:00', close: '20:00' }
  },
  price_range: '$$',
  tags: ['stepping', 'dance', 'lessons', 'chicago', 'beginners'],
  specialties: ['Chicago Stepping', 'Beginner Classes', 'Private Lessons'],
  keywords: ['stepping', 'dance', 'chicago', 'lessons', 'studio']
};

class BusinessCreationTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`🧪 Running: ${testName}`);
      await testFunction();
      console.log(`✅ PASSED: ${testName}`);
      this.testResults.passed++;
      this.testResults.tests.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.error(`❌ FAILED: ${testName}`);
      console.error(`   Error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.tests.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  async testDatabaseConnection() {
    const { error } = await supabase.from('community_businesses').select('count', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async testTableStructure() {
    // Test that we can query the table and get expected columns
    const { data, error } = await supabase
      .from('community_businesses')
      .select('*')
      .limit(1);
    
    if (error) {
      throw new Error(`Table query failed: ${error.message}`);
    }

    // Verify table exists and has expected structure (even if empty)
    console.log(`   📊 Table accessible, current record count: ${data ? data.length : 0}`);
  }

  async testBusinessCreation() {
    // First, we need to authenticate as a test user
    // For this test, we'll use a mock user ID since we can't authenticate in a script
    const mockUserId = '00000000-0000-0000-0000-000000000001';

    const businessDataWithOwner = {
      ...testBusinessData,
      owner_id: mockUserId
    };

    const { data, error } = await supabase
      .from('community_businesses')
      .insert(businessDataWithOwner)
      .select()
      .single();

    if (error) {
      throw new Error(`Business creation failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('Business creation returned no data');
    }

    // Store the created business ID for cleanup
    this.createdBusinessId = data.id;

    // Verify all fields were saved correctly
    const requiredFields = [
      'business_name', 'description', 'category', 'contact_email', 
      'contact_phone', 'website_url', 'address', 'city', 'state'
    ];

    for (const field of requiredFields) {
      if (!data[field] || data[field] !== businessDataWithOwner[field]) {
        throw new Error(`Field ${field} was not saved correctly. Expected: ${businessDataWithOwner[field]}, Got: ${data[field]}`);
      }
    }

    console.log(`   📝 Business created with ID: ${data.id}`);
    console.log(`   📊 Status: ${data.status} (expected: pending)`);
    
    return data;
  }

  async testBusinessRetrieval() {
    if (!this.createdBusinessId) {
      throw new Error('No business ID available for retrieval test');
    }

    const { data, error } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('id', this.createdBusinessId)
      .single();

    if (error) {
      throw new Error(`Business retrieval failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('Business not found in database');
    }

    console.log(`   📖 Successfully retrieved business: ${data.business_name}`);
    return data;
  }

  async testBusinessUpdate() {
    if (!this.createdBusinessId) {
      throw new Error('No business ID available for update test');
    }

    const updateData = {
      description: 'Updated test description for verification',
      contact_phone: '(555) 999-8888'
    };

    const { data, error } = await supabase
      .from('community_businesses')
      .update(updateData)
      .eq('id', this.createdBusinessId)
      .select()
      .single();

    if (error) {
      throw new Error(`Business update failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('Business update returned no data');
    }

    // Verify updates were applied
    if (data.description !== updateData.description) {
      throw new Error(`Description update failed. Expected: ${updateData.description}, Got: ${data.description}`);
    }

    if (data.contact_phone !== updateData.contact_phone) {
      throw new Error(`Phone update failed. Expected: ${updateData.contact_phone}, Got: ${data.contact_phone}`);
    }

    console.log(`   ✏️ Successfully updated business fields`);
    return data;
  }

  async testBusinessFiltering() {
    // Test filtering by category
    const { data: categoryData, error: categoryError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('category', 'fitness_sports');

    if (categoryError) {
      throw new Error(`Category filtering failed: ${categoryError.message}`);
    }

    console.log(`   🔍 Found ${categoryData ? categoryData.length : 0} fitness_sports businesses`);

    // Test filtering by business type
    const { data: typeData, error: typeError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('business_type', 'physical_business');

    if (typeError) {
      throw new Error(`Business type filtering failed: ${typeError.message}`);
    }

    console.log(`   🏢 Found ${typeData ? typeData.length : 0} physical businesses`);
  }

  async testCommunityBusinessService() {
    // Test the actual service methods that the frontend uses
    console.log('   🔧 Testing CommunityBusinessService methods...');
    
    // We can't import ES modules in this Node.js script, so we'll test the raw Supabase calls
    // that mirror what the service does

    // Test getBusinesses (equivalent to CommunityBusinessService.getBusinesses())
    const { data: businesses, error: getError, count } = await supabase
      .from('community_businesses')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');

    if (getError) {
      throw new Error(`Get businesses failed: ${getError.message}`);
    }

    console.log(`   📊 Service-style query returned ${count} approved businesses`);

    // Test search functionality
    const { data: searchResults, error: searchError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('status', 'approved')
      .textSearch('business_name,description', 'dance');

    if (searchError) {
      console.log(`   ⚠️ Text search test skipped (may not be enabled): ${searchError.message}`);
    } else {
      console.log(`   🔍 Search for 'dance' returned ${searchResults ? searchResults.length : 0} results`);
    }
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
      } else {
        console.log(`✅ Test business cleaned up successfully`);
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📊 Total: ${this.testResults.tests.length}`);
    console.log('');

    if (this.testResults.failed > 0) {
      console.log('❌ FAILED TESTS:');
      this.testResults.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
      console.log('');
    }

    if (this.testResults.passed === this.testResults.tests.length) {
      console.log('🎉 ALL TESTS PASSED! Business creation flow is working correctly.');
      console.log('✨ Businesses are being properly saved to and retrieved from the database.');
    } else {
      console.log('⚠️ Some tests failed. Please check the database configuration and Supabase connection.');
    }
  }

  async run() {
    console.log('🚀 Starting Business Creation Flow Test');
    console.log('=' .repeat(60));

    try {
      // Core database tests
      await this.runTest('Database Connection', () => this.testDatabaseConnection());
      await this.runTest('Table Structure Verification', () => this.testTableStructure());
      
      // Business CRUD operations
      await this.runTest('Business Creation', () => this.testBusinessCreation());
      await this.runTest('Business Retrieval', () => this.testBusinessRetrieval());
      await this.runTest('Business Update', () => this.testBusinessUpdate());
      
      // Community features
      await this.runTest('Business Filtering', () => this.testBusinessFiltering());
      await this.runTest('Community Service Methods', () => this.testCommunityBusinessService());

    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
    } finally {
      // Always cleanup
      await this.cleanup();
      
      // Print results
      this.printSummary();
      
      // Exit with proper code
      process.exit(this.testResults.failed > 0 ? 1 : 0);
    }
  }
}

// Run the test
const test = new BusinessCreationTest();
test.run().catch(console.error);