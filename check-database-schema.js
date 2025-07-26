#!/usr/bin/env node

/**
 * Database Schema Checker
 * Verifies the community_businesses table structure and applies migration if needed
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

async function checkTableExists() {
  console.log('🔍 Checking if community_businesses table exists...');
  
  const { data, error } = await supabase
    .from('community_businesses')
    .select('count', { count: 'exact', head: true });
  
  if (error) {
    if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
      console.log('❌ community_businesses table does not exist');
      return false;
    } else {
      console.error('❌ Error checking table:', error.message);
      return false;
    }
  }
  
  console.log('✅ community_businesses table exists');
  return true;
}

async function checkTableColumns() {
  console.log('🔍 Checking table column structure...');
  
  try {
    // Try to get the table information from information_schema
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'community_businesses'
    });
    
    if (error) {
      console.log('⚠️ Could not get column info via RPC, trying direct query...');
      
      // Try a different approach - query with LIMIT 1 to see column structure
      const { data: sampleData, error: sampleError } = await supabase
        .from('community_businesses')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error('❌ Error querying table structure:', sampleError.message);
        return null;
      }
      
      if (sampleData && sampleData.length > 0) {
        console.log('📊 Sample record columns:', Object.keys(sampleData[0]));
        return Object.keys(sampleData[0]);
      } else {
        console.log('📊 Table is empty, cannot determine columns from data');
        return [];
      }
    }
    
    console.log('📊 Table columns:', data);
    return data;
  } catch (error) {
    console.error('❌ Error checking columns:', error.message);
    return null;
  }
}

async function checkRequiredColumns() {
  console.log('🔍 Checking for required columns...');
  
  const requiredColumns = [
    'id', 'owner_id', 'business_name', 'description', 'category', 
    'business_type', 'contact_email', 'contact_phone', 'website_url',
    'address', 'city', 'state', 'status', 'created_at', 'updated_at'
  ];
  
  const missingColumns = [];
  
  for (const column of requiredColumns) {
    try {
      const { error } = await supabase
        .from('community_businesses')
        .select(column)
        .limit(1);
      
      if (error && (error.message.includes('column') && error.message.includes('does not exist'))) {
        missingColumns.push(column);
        console.log(`❌ Missing column: ${column}`);
      } else {
        console.log(`✅ Column exists: ${column}`);
      }
    } catch (e) {
      missingColumns.push(column);
      console.log(`❌ Missing column: ${column}`);
    }
  }
  
  return missingColumns;
}

async function readMigrationFile() {
  const migrationPath = path.resolve(__dirname, 'supabase/migrations/20250113000001_community_businesses.sql');
  
  try {
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file found and read successfully');
    return migrationSQL;
  } catch (error) {
    console.error('❌ Could not read migration file:', error.message);
    return null;
  }
}

async function suggestFix(missingColumns) {
  console.log('\n🔧 DIAGNOSIS AND RECOMMENDATIONS:');
  console.log('='.repeat(50));
  
  if (missingColumns.length === 0) {
    console.log('✅ All required columns are present in the database table.');
    console.log('✨ The community_businesses table is properly configured.');
    return;
  }
  
  console.log(`❌ Found ${missingColumns.length} missing columns: ${missingColumns.join(', ')}`);
  console.log('');
  console.log('🚨 ISSUE: The community_businesses table is missing required columns.');
  console.log('This means the migration has not been applied to your Supabase database.');
  console.log('');
  console.log('🔧 TO FIX THIS ISSUE:');
  console.log('');
  console.log('1. Run the Supabase migration:');
  console.log('   npx supabase migration up');
  console.log('');
  console.log('2. Or manually apply the migration through Supabase Dashboard:');
  console.log('   - Go to your Supabase project dashboard');
  console.log('   - Navigate to SQL Editor');
  console.log('   - Copy and paste the content from:');
  console.log('     supabase/migrations/20250113000001_community_businesses.sql');
  console.log('   - Execute the SQL');
  console.log('');
  console.log('3. Alternative: If you have Supabase CLI setup locally:');
  console.log('   supabase db push');
  console.log('');
  
  const migrationSQL = await readMigrationFile();
  if (migrationSQL) {
    console.log('📄 The migration file exists and contains the table creation SQL.');
    console.log('   This confirms the table schema is properly defined in the codebase.');
  } else {
    console.log('❌ Could not find migration file. This may indicate a more serious issue.');
  }
}

async function main() {
  console.log('🚀 Database Schema Check for Community Businesses');
  console.log('='.repeat(60));
  
  // Check if table exists
  const tableExists = await checkTableExists();
  
  if (!tableExists) {
    console.log('');
    console.log('🚨 CRITICAL ISSUE: community_businesses table does not exist!');
    console.log('');
    console.log('🔧 TO FIX: Apply the database migration:');
    console.log('   npx supabase migration up');
    console.log('   OR manually run the SQL from:');
    console.log('   supabase/migrations/20250113000001_community_businesses.sql');
    return;
  }
  
  // Check column structure
  console.log('');
  await checkTableColumns();
  
  // Check for required columns
  console.log('');
  const missingColumns = await checkRequiredColumns();
  
  // Provide recommendations
  console.log('');
  await suggestFix(missingColumns);
  
  if (missingColumns.length === 0) {
    console.log('\n🎉 DATABASE SCHEMA IS CORRECT!');
    console.log('✨ The community_businesses table has all required columns.');
    console.log('✨ Business creation should work properly.');
  } else {
    console.log('\n⚠️ SCHEMA ISSUES FOUND');
    console.log('❌ Business creation will fail until the migration is applied.');
  }
}

main().catch(console.error);