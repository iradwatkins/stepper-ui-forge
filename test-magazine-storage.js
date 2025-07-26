// Test script to verify magazine image storage setup
// Run with: node test-magazine-storage.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMagazineStorage() {
  console.log('🔍 Testing Magazine Storage Setup...\n');

  try {
    // 1. Check if bucket exists
    console.log('1. Checking if magazine-images bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    const magazineBucket = buckets?.find(b => b.id === 'magazine-images');
    if (magazineBucket) {
      console.log('✅ magazine-images bucket exists');
      console.log('   Public:', magazineBucket.public);
      console.log('   Size limit:', magazineBucket.file_size_limit, 'bytes');
    } else {
      console.log('❌ magazine-images bucket NOT found');
      console.log('   Available buckets:', buckets?.map(b => b.id).join(', '));
    }

    // 2. Test authentication
    console.log('\n2. Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Not authenticated. Please login first.');
      return;
    }
    
    console.log('✅ Authenticated as:', user.email);
    console.log('   User ID:', user.id);

    // 3. Test upload permissions
    console.log('\n3. Testing upload permissions...');
    
    // Create a simple test image
    const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const testFile = new File([testImageData], 'test-image.png', { type: 'image/png' });
    
    const testPath = `${user.id}/test/test-image-${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('magazine-images')
      .upload(testPath, testFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      console.error('   Error details:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        details: uploadError.details
      });
    } else {
      console.log('✅ Upload successful!');
      console.log('   Path:', uploadData.path);
      
      // 4. Test public URL generation
      console.log('\n4. Testing public URL generation...');
      const { data: urlData } = supabase.storage
        .from('magazine-images')
        .getPublicUrl(testPath);
      
      console.log('✅ Public URL:', urlData.publicUrl);
      
      // 5. Test deletion
      console.log('\n5. Testing deletion...');
      const { error: deleteError } = await supabase.storage
        .from('magazine-images')
        .remove([testPath]);
      
      if (deleteError) {
        console.error('❌ Delete failed:', deleteError);
      } else {
        console.log('✅ Test file deleted successfully');
      }
    }

    // 6. List files in user's folder
    console.log('\n6. Listing files in user folder...');
    const { data: files, error: listError } = await supabase.storage
      .from('magazine-images')
      .list(user.id, {
        limit: 10,
        offset: 0
      });

    if (listError) {
      console.error('❌ List failed:', listError);
    } else {
      console.log(`✅ Found ${files?.length || 0} files in user folder`);
      files?.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 0} bytes)`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testMagazineStorage();