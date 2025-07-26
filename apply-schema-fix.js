#!/usr/bin/env node

/**
 * Apply Schema Fix for Community Businesses
 * This script applies the necessary database schema changes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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

async function applySchemaFix() {
  console.log('🔧 Applying Community Businesses Schema Fix...');
  
  try {
    // Read the schema fix SQL
    const schemaFixPath = path.resolve(__dirname, 'fix-business-table-schema.sql');
    const schemaSQL = fs.readFileSync(schemaFixPath, 'utf8');
    
    console.log('📄 Schema fix SQL loaded');
    
    // Apply the schema changes
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: schemaSQL
    });
    
    if (error) {
      console.error('❌ Failed to apply schema fix:', error.message);
      console.log('');
      console.log('🔧 MANUAL FIX REQUIRED:');
      console.log('1. Go to your Supabase Dashboard > SQL Editor');
      console.log('2. Copy and paste the content from: fix-business-table-schema.sql');
      console.log('3. Execute the SQL');
      return false;
    }
    
    console.log('✅ Schema fix applied successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error applying schema fix:', error.message);
    return false;
  }
}

async function verifySchemaFix() {
  console.log('🔍 Verifying schema fix...');
  
  try {
    // Test that business_type column now exists
    const { error } = await supabase
      .from('community_businesses')
      .select('business_type')
      .limit(1);
    
    if (error) {
      console.error('❌ Verification failed:', error.message);
      return false;
    }
    
    console.log('✅ business_type column is now accessible');
    
    // Test a few other key columns
    const testColumns = ['social_media', 'tags', 'specialties', 'business_hours'];
    
    for (const column of testColumns) {
      const { error: colError } = await supabase
        .from('community_businesses')
        .select(column)
        .limit(1);
      
      if (colError) {
        console.error(`❌ Column ${column} verification failed:`, colError.message);
        return false;
      }
      
      console.log(`✅ ${column} column is accessible`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Community Businesses Schema Fix');
  console.log('='.repeat(50));
  
  // Apply the schema fix
  const fixApplied = await applySchemaFix();
  
  if (!fixApplied) {
    console.log('❌ Schema fix failed. Please apply manually.');
    return;
  }
  
  // Wait a moment for the changes to propagate
  console.log('⏳ Waiting for schema changes to propagate...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Verify the fix worked
  const verified = await verifySchemaFix();
  
  if (verified) {
    console.log('\n🎉 SCHEMA FIX SUCCESSFUL!');
    console.log('✨ The community_businesses table now has all required columns.');
    console.log('✨ Business creation should work properly now.');
    console.log('\n📝 Next step: Run the business creation test again:');
    console.log('   node test-business-creation.js');
  } else {
    console.log('\n⚠️ SCHEMA FIX VERIFICATION FAILED');
    console.log('❌ Some columns may still be missing.');
    console.log('🔧 Please check your Supabase dashboard for any error messages.');
  }
}

main().catch(console.error);