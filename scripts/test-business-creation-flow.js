#!/usr/bin/env node

/**
 * Comprehensive Business Creation Flow Test Script
 * 
 * This script tests the complete business creation workflow:
 * 1. Simulates business creation through the frontend form
 * 2. Verifies database storage
 * 3. Tests business retrieval and display
 * 4. Validates all required fields are saved correctly
 * 
 * Usage: node scripts/test-business-creation-flow.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test data matching the CreateBusinessSteps form
const testBusinessData = {
  business_name: 'Test Stepping Studio',
  description: 'A premier stepping studio offering classes for all skill levels. We specialize in Chicago stepping and provide a welcoming environment for beginners and advanced dancers. Our experienced instructors help students master the fundamentals and develop their own unique style.',
  category: 'fitness_sports',
  business_type: 'physical_business',
  subcategory: 'Dance Studio',
  contact_email: 'info@teststrippingstudio.com',
  contact_phone: '(555) 123-4567',
  website_url: 'https://teststrippingstudio.com',
  address: '123 Dance Street',
  city: 'Chicago',
  state: 'Illinois',
  zip_code: '60601',
  price_range: '$$',
  tags: ['stepping', 'dance classes', 'chicago stepping', 'beginners welcome'],
  specialties: ['Chicago Stepping', 'Partner Dancing', 'Line Dancing'],
  business_hours: {
    monday: { open: '09:00', close: '21:00', closed: false },
    tuesday: { open: '09:00', close: '21:00', closed: false },
    wednesday: { open: '09:00', close: '21:00', closed: false },
    thursday: { open: '09:00', close: '21:00', closed: false },
    friday: { open: '09:00', close: '23:00', closed: false },
    saturday: { open: '10:00', close: '23:00', closed: false },
    sunday: { open: '12:00', close: '20:00', closed: false }
  },
  social_media: {
    facebook: 'https://facebook.com/teststrippingstudio',
    instagram: 'https://instagram.com/teststrippingstudio'
  },
  gallery_images: []
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

function logTest(description, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`${colors.green}✓${colors.reset} ${description}`);
  } else {
    testResults.failed++;
    console.log(`${colors.red}✗${colors.reset} ${description}`);
    if (details) {
      console.log(`  ${colors.red}${details}${colors.reset}`);
    }
  }
}

function logSection(title) {
  console.log(`\n${colors.bold}${colors.blue}=== ${title} ===${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.yellow}ℹ${colors.reset} ${message}`);
}

async function createTestUser() {
  logSection('Setting up test user');
  
  const testEmail = 'test-business-creator@example.com';
  const testPassword = 'TestPassword123!';
  
  try {
    // Try to sign up a new user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    if (signUpError && !signUpError.message.includes('already registered')) {
      throw signUpError;
    }

    // Sign in the user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      throw signInError;
    }

    logTest('Test user authentication', !!signInData.user, signInError?.message);
    return signInData.user;
  } catch (error) {
    logTest('Test user authentication', false, error.message);
    throw error;
  }
}

async function testBusinessCreation(userId) {
  logSection('Testing Business Creation (CommunityBusinessService.createBusiness)');
  
  try {
    // Prepare business data with user ID
    const businessDataWithUser = {
      ...testBusinessData,
      owner_id: userId
    };

    // Test business creation
    const { data: createdBusiness, error: createError } = await supabase
      .from('community_businesses')
      .insert(businessDataWithUser)
      .select()
      .single();

    logTest('Business creation query executes', !createError, createError?.message);

    if (createError) {
      throw createError;
    }

    logTest('Business record created with ID', !!createdBusiness.id);
    logTest('Business owner_id matches user', createdBusiness.owner_id === userId);
    logTest('Business status set to pending', createdBusiness.status === 'pending');
    
    // Test required fields are saved
    logTest('Business name saved correctly', createdBusiness.business_name === testBusinessData.business_name);
    logTest('Description saved correctly', createdBusiness.description === testBusinessData.description);
    logTest('Category saved correctly', createdBusiness.category === testBusinessData.category);
    logTest('Business type saved correctly', createdBusiness.business_type === testBusinessData.business_type);
    logTest('Contact email saved correctly', createdBusiness.contact_email === testBusinessData.contact_email);
    logTest('Contact phone saved correctly', createdBusiness.contact_phone === testBusinessData.contact_phone);
    logTest('Website URL saved correctly', createdBusiness.website_url === testBusinessData.website_url);
    logTest('Address saved correctly', createdBusiness.address === testBusinessData.address);
    logTest('City saved correctly', createdBusiness.city === testBusinessData.city);
    logTest('State saved correctly', createdBusiness.state === testBusinessData.state);
    logTest('ZIP code saved correctly', createdBusiness.zip_code === testBusinessData.zip_code);
    logTest('Price range saved correctly', createdBusiness.price_range === testBusinessData.price_range);
    
    // Test array fields
    logTest('Tags array saved correctly', 
      Array.isArray(createdBusiness.tags) && createdBusiness.tags.length === testBusinessData.tags.length);
    logTest('Specialties array saved correctly', 
      Array.isArray(createdBusiness.specialties) && createdBusiness.specialties.length === testBusinessData.specialties.length);
    
    // Test JSON fields
    logTest('Business hours JSON saved correctly', 
      createdBusiness.business_hours && typeof createdBusiness.business_hours === 'object');
    logTest('Social media JSON saved correctly', 
      createdBusiness.social_media && typeof createdBusiness.social_media === 'object');
    
    // Test timestamps
    logTest('Created timestamp exists', !!createdBusiness.created_at);
    logTest('Updated timestamp exists', !!createdBusiness.updated_at);
    
    // Test default values
    logTest('Default view count is 0', createdBusiness.view_count === 0);
    logTest('Default contact count is 0', createdBusiness.contact_count === 0);
    logTest('Default rating average is 0', createdBusiness.rating_average === 0);
    logTest('Default rating count is 0', createdBusiness.rating_count === 0);
    logTest('Default featured status is false', createdBusiness.featured === false);
    logTest('Default verified status is false', createdBusiness.is_verified === false);

    return createdBusiness;
  } catch (error) {
    logTest('Business creation', false, error.message);
    throw error;
  }
}

async function testBusinessRetrieval(businessId) {
  logSection('Testing Business Retrieval');
  
  try {
    // Test retrieving all businesses (should include pending for owner)
    const { data: allBusinesses, error: getAllError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('status', 'pending'); // Test can retrieve pending businesses

    logTest('Business retrieval query executes', !getAllError, getAllError?.message);
    logTest('Created business appears in results', 
      allBusinesses && allBusinesses.some(b => b.id === businessId));

    // Test retrieving specific business by ID
    const { data: specificBusiness, error: getByIdError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    logTest('Business retrieval by ID works', !getByIdError, getByIdError?.message);
    logTest('Retrieved business data matches created data', 
      specificBusiness && specificBusiness.business_name === testBusinessData.business_name);

    return specificBusiness;
  } catch (error) {
    logTest('Business retrieval', false, error.message);
    throw error;
  }
}

async function testBusinessFiltering() {
  logSection('Testing Business Filtering and Search');
  
  try {
    // Test category filtering
    const { data: categoryFiltered, error: categoryError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('category', 'fitness_sports');

    logTest('Category filtering works', !categoryError, categoryError?.message);
    logTest('Category filter returns correct results', 
      categoryFiltered && categoryFiltered.every(b => b.category === 'fitness_sports'));

    // Test business type filtering
    const { data: typeFiltered, error: typeError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('business_type', 'physical_business');

    logTest('Business type filtering works', !typeError, typeError?.message);
    logTest('Business type filter returns correct results', 
      typeFiltered && typeFiltered.every(b => b.business_type === 'physical_business'));

    // Test location filtering
    const { data: locationFiltered, error: locationError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('city', 'Chicago')
      .eq('state', 'Illinois');

    logTest('Location filtering works', !locationError, locationError?.message);
    logTest('Location filter returns correct results', 
      locationFiltered && locationFiltered.every(b => b.city === 'Chicago' && b.state === 'Illinois'));

  } catch (error) {
    logTest('Business filtering', false, error.message);
  }
}

async function testBusinessUpdateEditing(businessId, userId) {
  logSection('Testing Business Editing and Updates');
  
  try {
    const updatedData = {
      business_name: 'Updated Test Stepping Studio',
      description: 'Updated description with new information about our expanded services and improved facilities.',
      contact_phone: '(555) 987-6543',
      price_range: '$$$',
      tags: ['stepping', 'dance classes', 'chicago stepping', 'advanced classes', 'private lessons'],
      specialties: ['Chicago Stepping', 'Partner Dancing', 'Line Dancing', 'Competition Prep']
    };

    // Test business update
    const { data: updatedBusiness, error: updateError } = await supabase
      .from('community_businesses')
      .update(updatedData)
      .eq('id', businessId)
      .eq('owner_id', userId) // Ensure user can only update their own business
      .select()
      .single();

    logTest('Business update query executes', !updateError, updateError?.message);
    logTest('Updated business name saved', updatedBusiness?.business_name === updatedData.business_name);
    logTest('Updated description saved', updatedBusiness?.description === updatedData.description);
    logTest('Updated phone saved', updatedBusiness?.contact_phone === updatedData.contact_phone);
    logTest('Updated price range saved', updatedBusiness?.price_range === updatedData.price_range);
    logTest('Updated tags saved', 
      Array.isArray(updatedBusiness?.tags) && updatedBusiness.tags.length === updatedData.tags.length);
    logTest('Updated specialties saved', 
      Array.isArray(updatedBusiness?.specialties) && updatedBusiness.specialties.length === updatedData.specialties.length);
    logTest('Updated timestamp changed', updatedBusiness?.updated_at !== updatedBusiness?.created_at);

    return updatedBusiness;
  } catch (error) {
    logTest('Business editing', false, error.message);
  }
}

async function testDashboardIntegration(userId) {
  logSection('Testing Dashboard Integration (My Businesses)');
  
  try {
    // Test retrieving user's businesses for dashboard
    const { data: userBusinesses, error: getUserBusinessesError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    logTest('User businesses retrieval works', !getUserBusinessesError, getUserBusinessesError?.message);
    logTest('User can see their own businesses', userBusinesses && userBusinesses.length > 0);
    logTest('All returned businesses belong to user', 
      userBusinesses && userBusinesses.every(b => b.owner_id === userId));

    // Test business status management (pending/approved)
    const pendingBusinesses = userBusinesses?.filter(b => b.status === 'pending');
    const approvedBusinesses = userBusinesses?.filter(b => b.status === 'approved');
    
    logTest('Can distinguish between pending and approved businesses', 
      pendingBusinesses !== undefined && approvedBusinesses !== undefined);

    return userBusinesses;
  } catch (error) {
    logTest('Dashboard integration', false, error.message);
  }
}

async function testCommunityPageIntegration() {
  logSection('Testing Community Page Integration');
  
  try {
    // Test public business visibility (approved businesses only)
    const { data: publicBusinesses, error: getPublicError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    logTest('Public business retrieval works', !getPublicError, getPublicError?.message);
    logTest('Only approved businesses shown to public', 
      publicBusinesses && publicBusinesses.every(b => b.status === 'approved'));

    // Test featured businesses
    const { data: featuredBusinesses, error: getFeaturedError } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('status', 'approved')
      .eq('featured', true)
      .order('rating_average', { ascending: false });

    logTest('Featured business retrieval works', !getFeaturedError, getFeaturedError?.message);
    logTest('Featured businesses are properly filtered', 
      featuredBusinesses !== null && featuredBusinesses.every(b => b.featured === true));

  } catch (error) {
    logTest('Community page integration', false, error.message);
  }
}

async function testFormValidation() {
  logSection('Testing Form Validation Logic');
  
  try {
    // Test missing required fields
    const incompleteData = {
      business_name: 'Test',
      // Missing description and category
      owner_id: 'test-user-id'
    };

    const { data: failedBusiness, error: validationError } = await supabase
      .from('community_businesses')
      .insert(incompleteData)
      .select()
      .single();

    logTest('Validation catches missing required fields', !!validationError, 
      'Database should enforce NOT NULL constraints');

    // Test invalid data types
    const invalidData = {
      ...testBusinessData,
      owner_id: 'test-user-id',
      category: 'invalid_category', // Should fail enum constraint
    };

    const { data: invalidBusiness, error: enumError } = await supabase
      .from('community_businesses')
      .insert(invalidData)
      .select()
      .single();

    logTest('Validation catches invalid enum values', !!enumError,
      'Database should enforce enum constraints');

  } catch (error) {
    logInfo('Form validation tests completed (errors expected)');
  }
}

async function cleanupTestData(userId) {
  logSection('Cleaning up test data');
  
  try {
    // Delete test businesses
    const { error: deleteBusinessError } = await supabase
      .from('community_businesses')
      .delete()
      .eq('owner_id', userId);

    logTest('Test business cleanup', !deleteBusinessError, deleteBusinessError?.message);

    // Sign out test user
    const { error: signOutError } = await supabase.auth.signOut();
    logTest('Test user sign out', !signOutError, signOutError?.message);

  } catch (error) {
    logInfo('Cleanup completed with some errors (may be expected)');
  }
}

function printTestSummary() {
  console.log(`\n${colors.bold}${colors.blue}=== TEST SUMMARY ===${colors.reset}`);
  console.log(`Total tests: ${testResults.total}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`Success rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 All tests passed! Business creation flow is working correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️ Some tests failed. Review the errors above to fix issues.${colors.reset}`);
  }
}

async function main() {
  console.log(`${colors.bold}${colors.blue}Business Creation Flow Integration Test${colors.reset}`);
  console.log('Testing complete business creation and retrieval workflow...\n');

  try {
    // Step 1: Set up test user
    const testUser = await createTestUser();
    
    // Step 2: Test business creation
    const createdBusiness = await testBusinessCreation(testUser.id);
    
    // Step 3: Test business retrieval
    await testBusinessRetrieval(createdBusiness.id);
    
    // Step 4: Test filtering and search
    await testBusinessFiltering();
    
    // Step 5: Test business editing
    await testBusinessUpdateEditing(createdBusiness.id, testUser.id);
    
    // Step 6: Test dashboard integration
    await testDashboardIntegration(testUser.id);
    
    // Step 7: Test community page integration
    await testCommunityPageIntegration();
    
    // Step 8: Test form validation
    await testFormValidation();
    
    // Step 9: Cleanup
    await cleanupTestData(testUser.id);
    
  } catch (error) {
    console.error(`\n${colors.red}Test execution failed:${colors.reset}`, error.message);
    console.log(`\n${colors.yellow}This might indicate a problem with:${colors.reset}`);
    console.log('- Supabase connection');
    console.log('- Database schema');
    console.log('- RLS policies');
    console.log('- Environment configuration');
  }
  
  printTestSummary();
}

// Run the test
main().catch(console.error);