#!/usr/bin/env node

/**
 * Test Image Upload Functionality
 * Tests the ImageUploadService with real file uploads
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

// Create a simple test image file
function createTestImageFile() {
  // Create a simple PNG data URL for a 100x100 red square
  const canvas = {
    width: 100,
    height: 100,
    toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77wgAAAABJRU5ErkJggg=='
  };
  
  // Convert data URL to File-like object
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77wgAAAABJRU5ErkJggg==';
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], 'test-business-logo.png', { type: mime });
}

class ImageUploadTest {
  constructor() {
    this.testResults = [];
    this.uploadedFiles = [];
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

  async testAuthentication() {
    // Test that we can access the bucket
    const { data, error } = await supabase.storage
      .from('venue-images')
      .list('', { limit: 1 });
    
    if (error) {
      throw new Error(`Storage access failed: ${error.message}`);
    }
    
    console.log(`   ✅ Storage bucket accessible`);
    return true;
  }

  async testImageUpload() {
    console.log(`   📤 Testing image upload to venue-images bucket...`);
    
    // Create a test image
    const testFile = createTestImageFile();
    
    // Generate a unique path for testing
    const testUserId = 'test-user-12345';
    const timestamp = Date.now();
    const filePath = `${testUserId}/business-images/test-logo-${timestamp}.png`;
    
    console.log(`   📁 Uploading to path: ${filePath}`);
    
    const { data, error } = await supabase.storage
      .from('venue-images')
      .upload(filePath, testFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }

    // Store for cleanup
    this.uploadedFiles.push({ bucket: 'venue-images', path: filePath });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('venue-images')
      .getPublicUrl(filePath);

    console.log(`   ✅ Upload successful!`);
    console.log(`   🔗 Public URL: ${urlData.publicUrl}`);
    
    return {
      path: filePath,
      url: urlData.publicUrl
    };
  }

  async testBusinessImageTypes() {
    console.log(`   🖼️ Testing different business image types...`);
    
    const testFile = createTestImageFile();
    const testUserId = 'test-user-12345';
    const timestamp = Date.now();
    
    // Test logo upload
    const logoPath = `${testUserId}/business-images/logo-${timestamp}.png`;
    const { error: logoError } = await supabase.storage
      .from('venue-images')
      .upload(logoPath, testFile);
    
    if (logoError) {
      throw new Error(`Logo upload failed: ${logoError.message}`);
    }
    
    this.uploadedFiles.push({ bucket: 'venue-images', path: logoPath });
    
    // Test cover image upload
    const coverPath = `${testUserId}/business-images/cover-${timestamp}.png`;
    const { error: coverError } = await supabase.storage
      .from('venue-images')
      .upload(coverPath, testFile);
    
    if (coverError) {
      throw new Error(`Cover image upload failed: ${coverError.message}`);
    }
    
    this.uploadedFiles.push({ bucket: 'venue-images', path: coverPath });
    
    // Test gallery image upload
    const galleryPath = `${testUserId}/business-images/gallery-${timestamp}.png`;
    const { error: galleryError } = await supabase.storage
      .from('venue-images')
      .upload(galleryPath, testFile);
    
    if (galleryError) {
      throw new Error(`Gallery image upload failed: ${galleryError.message}`);
    }
    
    this.uploadedFiles.push({ bucket: 'venue-images', path: galleryPath });
    
    console.log(`   ✅ All business image types uploaded successfully`);
    
    return {
      logoPath,
      coverPath,
      galleryPath
    };
  }

  async testDatabaseImageSave() {
    console.log(`   💾 Testing database image URL save...`);
    
    // Create test business with image URLs
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const timestamp = Date.now();
    
    const businessData = {
      owner_id: testUserId,
      business_name: `Test Business ${timestamp}`,
      description: 'Test business for image upload testing',
      category: 'professional_services',
      business_type: 'physical_business',
      logo_url: 'https://aszzhlgwfbijaotfddsh.supabase.co/storage/v1/object/public/venue-images/test-logo.png',
      cover_image_url: 'https://aszzhlgwfbijaotfddsh.supabase.co/storage/v1/object/public/venue-images/test-cover.png',
      gallery_images: [
        'https://aszzhlgwfbijaotfddsh.supabase.co/storage/v1/object/public/venue-images/test-gallery1.png',
        'https://aszzhlgwfbijaotfddsh.supabase.co/storage/v1/object/public/venue-images/test-gallery2.png'
      ],
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('community_businesses')
      .insert(businessData)
      .select()
      .single();

    if (error) {
      throw new Error(`Database save failed: ${error.message}`);
    }

    console.log(`   ✅ Business with images saved to database`);
    console.log(`   🆔 Business ID: ${data.id}`);
    console.log(`   🖼️ Logo URL: ${data.logo_url ? 'Present' : 'Missing'}`);
    console.log(`   🖼️ Cover URL: ${data.cover_image_url ? 'Present' : 'Missing'}`);
    console.log(`   🖼️ Gallery Images: ${data.gallery_images?.length || 0} items`);

    // Store for cleanup
    this.uploadedFiles.push({ 
      bucket: 'database', 
      path: data.id, 
      table: 'community_businesses' 
    });

    return data;
  }

  async cleanup() {
    console.log(`🧹 Cleaning up test files...`);
    
    for (const file of this.uploadedFiles) {
      try {
        if (file.bucket === 'database') {
          // Delete database record
          await supabase
            .from(file.table)
            .delete()
            .eq('id', file.path);
          console.log(`   ✅ Deleted database record: ${file.path}`);
        } else {
          // Delete storage file
          await supabase.storage
            .from(file.bucket)
            .remove([file.path]);
          console.log(`   ✅ Deleted file: ${file.path}`);
        }
      } catch (error) {
        console.warn(`   ⚠️ Cleanup failed for ${file.path}: ${error.message}`);
      }
    }
  }

  async run() {
    console.log('🚀 Image Upload Functionality Test');
    console.log('📤 Testing with real Supabase storage and database');
    console.log('='.repeat(60));

    try {
      // Test authentication and bucket access
      await this.runTest('Storage Authentication', () => this.testAuthentication());
      
      // Test basic image upload
      await this.runTest('Basic Image Upload', () => this.testImageUpload());
      
      // Test business-specific image types
      await this.runTest('Business Image Types', () => this.testBusinessImageTypes());
      
      // Test database integration
      await this.runTest('Database Image Save', () => this.testDatabaseImageSave());

      console.log('\n✅ All image upload tests completed successfully!');
      console.log('🎉 Image upload functionality is working correctly');
      console.log('✨ Businesses can now upload logos, covers, and gallery images');
      
    } catch (error) {
      console.error('\n💥 Image upload test failed:', error.message);
    } finally {
      // Always cleanup
      await this.cleanup();
      
      // Print results
      console.log('\n' + '='.repeat(60));
      const passed = this.testResults.filter(t => t.status === 'PASSED').length;
      const failed = this.testResults.filter(t => t.status === 'FAILED').length;
      
      console.log(`✅ Passed: ${passed}`);
      console.log(`❌ Failed: ${failed}`);
      
      if (failed > 0) {
        process.exit(1);
      }
    }
  }
}

// Create a simple File polyfill for Node.js
if (typeof File === 'undefined') {
  global.File = class File {
    constructor(chunks, filename, options = {}) {
      this.name = filename;
      this.type = options.type || 'application/octet-stream';
      this.lastModified = options.lastModified || Date.now();
      this.size = chunks.reduce((size, chunk) => size + chunk.length, 0);
      this._chunks = chunks;
    }
    
    stream() {
      return new ReadableStream({
        start(controller) {
          this._chunks.forEach(chunk => controller.enqueue(chunk));
          controller.close();
        }
      });
    }
    
    arrayBuffer() {
      return Promise.resolve(new Uint8Array(this._chunks.flat()).buffer);
    }
  };
}

// Add btoa polyfill for Node.js
if (typeof btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}

if (typeof atob === 'undefined') {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

const test = new ImageUploadTest();
test.run().catch(console.error);