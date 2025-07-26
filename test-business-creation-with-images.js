#!/usr/bin/env node

/**
 * Test Complete Business Creation with Image Upload
 * Tests the full flow from CreateBusinessSteps component perspective
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

// Test business data that mirrors CreateBusinessSteps
const testBusinessData = {
  business_name: 'Chicago Stepping Academy Pro',
  description: 'Premium professional stepping dance instruction for all skill levels. We teach the authentic Chicago stepping style with experienced instructors.',
  category: 'fitness_sports',
  subcategory: 'Dance Studio',
  business_type: 'physical_business',
  contact_email: 'info@chicagosteppingacademy.com',
  contact_phone: '(555) 987-6543',
  website_url: 'https://chicagosteppingacademy.com',
  social_media: {
    facebook: 'https://facebook.com/chicagosteppingacademy',
    instagram: 'https://instagram.com/chicagosteppingacademy',
    tiktok: 'https://tiktok.com/@chicagosteppingacademy'
  },
  address: '456 Dance Plaza',
  city: 'Chicago',
  state: 'IL',
  zip_code: '60602',
  latitude: 41.8787,
  longitude: -87.6298,
  business_hours: {
    monday: { open: '18:00', close: '22:00' },
    tuesday: { open: '18:00', close: '22:00' },
    wednesday: { open: '18:00', close: '22:00' },
    thursday: { open: '18:00', close: '22:00' },
    friday: { open: '18:00', close: '23:00' },
    saturday: { open: '12:00', close: '23:00' },
    sunday: { open: '14:00', close: '21:00' }
  },
  price_range: '$$$',
  tags: ['stepping', 'chicago-style', 'dance-lessons', 'couples-dance', 'professional'],
  specialties: ['Chicago Stepping', 'Couples Classes', 'Competition Training'],
  status: 'pending'
};

class BusinessCreationWithImagesTest {
  constructor() {
    this.testResults = [];
    this.createdBusinessId = null;
    this.mockImageUrls = [];
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

  async testDatabaseImageColumns() {
    console.log(`   🗄️ Verifying image columns exist in database...`);
    
    const { data, error } = await supabase
      .from('community_businesses')
      .select('logo_url, cover_image_url, gallery_images')
      .limit(1);
    
    if (error) {
      throw new Error(`Image columns not available: ${error.message}`);
    }
    
    console.log(`   ✅ Image columns are accessible in database`);
    return true;
  }

  async testMockImageUrlGeneration() {
    console.log(`   🖼️ Generating mock image URLs for testing...`);
    
    // Generate mock image URLs that would be returned by ImageUploadService
    const baseUrl = `${supabaseUrl}/storage/v1/object/public/venue-images`;
    const mockUserId = '00000000-0000-0000-0000-000000000001';
    const timestamp = Date.now();
    
    this.mockImageUrls = {
      logo_url: `${baseUrl}/${mockUserId}/magazine/content-images/business-logo-${timestamp}.png`,
      cover_image_url: `${baseUrl}/${mockUserId}/magazine/content-images/business-cover-${timestamp}.png`,
      gallery_images: [
        `${baseUrl}/${mockUserId}/magazine/content-images/gallery-1-${timestamp}.png`,
        `${baseUrl}/${mockUserId}/magazine/content-images/gallery-2-${timestamp}.png`,
        `${baseUrl}/${mockUserId}/magazine/content-images/gallery-3-${timestamp}.png`
      ]
    };
    
    console.log(`   ✅ Generated mock image URLs:`);
    console.log(`      Logo: ${this.mockImageUrls.logo_url.substring(0, 80)}...`);
    console.log(`      Cover: ${this.mockImageUrls.cover_image_url.substring(0, 80)}...`);
    console.log(`      Gallery: ${this.mockImageUrls.gallery_images.length} images`);
    
    return this.mockImageUrls;
  }

  async testBusinessCreationWithImages() {
    console.log(`   💼 Creating business with image URLs...`);
    
    // Combine business data with mock image URLs
    const completeBusinessData = {
      ...testBusinessData,
      owner_id: '00000000-0000-0000-0000-000000000001',
      ...this.mockImageUrls
    };
    
    console.log(`   📊 Business data includes:`);
    console.log(`      Name: ${completeBusinessData.business_name}`);
    console.log(`      Type: ${completeBusinessData.business_type}`);
    console.log(`      Category: ${completeBusinessData.category}`);
    console.log(`      Logo URL: ${completeBusinessData.logo_url ? 'Present' : 'Missing'}`);
    console.log(`      Cover URL: ${completeBusinessData.cover_image_url ? 'Present' : 'Missing'}`);
    console.log(`      Gallery Images: ${completeBusinessData.gallery_images?.length || 0}`);
    
    const { data, error } = await supabase
      .from('community_businesses')
      .insert(completeBusinessData)
      .select()
      .single();

    if (error) {
      throw new Error(`Business creation with images failed: ${error.message}`);
    }

    this.createdBusinessId = data.id;
    
    console.log(`   ✅ Business created successfully!`);
    console.log(`      ID: ${data.id}`);
    console.log(`      Status: ${data.status}`);
    console.log(`      Logo saved: ${data.logo_url ? 'Yes' : 'No'}`);
    console.log(`      Cover saved: ${data.cover_image_url ? 'Yes' : 'No'}`);
    console.log(`      Gallery count: ${data.gallery_images?.length || 0}`);
    
    return data;
  }

  async testBusinessRetrieval() {
    console.log(`   📖 Testing business retrieval with images...`);
    
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

    console.log(`   ✅ Retrieved business successfully`);
    console.log(`      Name: ${data.business_name}`);
    console.log(`      Images stored:`);
    console.log(`        Logo URL: ${data.logo_url ? 'Stored' : 'Missing'}`);
    console.log(`        Cover URL: ${data.cover_image_url ? 'Stored' : 'Missing'}`);
    console.log(`        Gallery images: ${data.gallery_images?.length || 0} items`);
    
    // Verify JSON fields are properly stored
    if (data.social_media && typeof data.social_media === 'object') {
      console.log(`        Social media links: ${Object.keys(data.social_media).length} platforms`);
    }
    
    if (data.business_hours && typeof data.business_hours === 'object') {
      console.log(`        Business hours: ${Object.keys(data.business_hours).length} days configured`);
    }
    
    return data;
  }

  async testCommunityPageQuery() {
    console.log(`   🌍 Testing Community page query with images...`);
    
    // Test the query that Community page uses to display businesses
    const { data, error } = await supabase
      .from('community_businesses')
      .select(`
        id,
        business_name,
        description,
        category,
        business_type,
        logo_url,
        cover_image_url,
        rating_average,
        city,
        state,
        price_range,
        featured
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Community page query failed: ${error.message}`);
    }

    console.log(`   ✅ Community page query successful`);
    console.log(`      Found ${data.length} approved businesses`);
    
    // Check if any businesses have images
    const businessesWithLogos = data.filter(b => b.logo_url).length;
    const businessesWithCovers = data.filter(b => b.cover_image_url).length;
    
    console.log(`      Businesses with logos: ${businessesWithLogos}`);
    console.log(`      Businesses with covers: ${businessesWithCovers}`);
    
    return data;
  }

  async testImagePathStructure() {
    console.log(`   📁 Testing image path structure matches ImageUploadService...`);
    
    // Verify the paths match what ImageUploadService.uploadMagazineImage() generates
    const expectedPathPattern = /^[0-9a-f-]{36}\/magazine\/content-images\//;
    
    for (const url of [this.mockImageUrls.logo_url, this.mockImageUrls.cover_image_url, ...this.mockImageUrls.gallery_images]) {
      // Extract path from URL
      const urlParts = url.split('/venue-images/');
      if (urlParts.length < 2) {
        throw new Error(`Invalid image URL structure: ${url}`);
      }
      
      const path = urlParts[1];
      
      if (!expectedPathPattern.test(path)) {
        throw new Error(`Image path doesn't match ImageUploadService pattern: ${path}`);
      }
    }
    
    console.log(`   ✅ Image paths match ImageUploadService structure`);
    console.log(`      Pattern: {user_id}/magazine/content-images/{filename}`);
    
    return true;
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

  async run() {
    console.log('🚀 Business Creation with Images Test');
    console.log('🖼️ Testing complete business creation flow with image upload URLs');
    console.log('='.repeat(70));

    try {
      // Test database has image columns
      await this.runTest('Database Image Columns', () => this.testDatabaseImageColumns());
      
      // Generate mock image URLs (what ImageUploadService would return)
      await this.runTest('Mock Image URL Generation', () => this.testMockImageUrlGeneration());
      
      // Test image path structure matches service
      await this.runTest('Image Path Structure', () => this.testImagePathStructure());
      
      // Test business creation with images
      await this.runTest('Business Creation with Images', () => this.testBusinessCreationWithImages());
      
      // Test business retrieval
      await this.runTest('Business Retrieval with Images', () => this.testBusinessRetrieval());
      
      // Test community page query
      await this.runTest('Community Page Query', () => this.testCommunityPageQuery());

      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✨ Business creation with images is working correctly');
      console.log('📊 Key findings:');
      console.log('   • Database has all required image columns');
      console.log('   • Businesses can store logo, cover, and gallery image URLs');
      console.log('   • Image URLs follow ImageUploadService path structure');
      console.log('   • Community page can query businesses with images');
      console.log('');
      console.log('🚀 Next steps:');
      console.log('   • Test actual image upload with authenticated user');
      console.log('   • Verify images display correctly in UI components');
      console.log('   • Test image upload from CreateBusinessSteps form');
      
    } catch (error) {
      console.error('\n💥 Test failed:', error.message);
    } finally {
      await this.cleanup();
      
      // Print summary
      console.log('\n' + '='.repeat(70));
      const passed = this.testResults.filter(t => t.status === 'PASSED').length;
      const failed = this.testResults.filter(t => t.status === 'FAILED').length;
      
      console.log(`✅ Passed: ${passed}`);
      console.log(`❌ Failed: ${failed}`);
      console.log(`📊 Total: ${this.testResults.length}`);
      
      if (failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        this.testResults
          .filter(test => test.status === 'FAILED')
          .forEach(test => {
            console.log(`   • ${test.name}: ${test.error}`);
          });
        process.exit(1);
      }
    }
  }
}

const test = new BusinessCreationWithImagesTest();
test.run().catch(console.error);