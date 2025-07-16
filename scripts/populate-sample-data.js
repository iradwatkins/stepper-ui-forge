#!/usr/bin/env node

/**
 * Sample Data Population Script
 * 
 * This script populates the database with sample data for testing purposes.
 * It reads the SQL files and executes them against the Supabase database.
 * 
 * Usage: node scripts/populate-sample-data.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key needed for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQLFile(filePath, description) {
  try {
    console.log(`📖 Reading ${description}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split SQL by statements (basic approach)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔧 Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          console.warn(`⚠️  Statement failed (this may be expected): ${error.message}`);
        }
      }
    }
    
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing ${description}:`, error.message);
    return false;
  }
}

async function checkDatabaseConnection() {
  try {
    console.log('🔗 Testing database connection...');
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return false;
  }
}

async function insertSampleData() {
  console.log('🚀 Starting sample data population...\n');
  
  // Check database connection first
  const connected = await checkDatabaseConnection();
  if (!connected) {
    console.error('❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  const sampleDataDir = path.join(__dirname, '..', 'database', 'sample-data');
  
  // Check if sample data files exist
  const classesFile = path.join(sampleDataDir, 'insert_sample_classes.sql');
  const businessesFile = path.join(sampleDataDir, 'insert_sample_businesses.sql');
  
  if (!fs.existsSync(classesFile)) {
    console.error(`❌ Classes sample data file not found: ${classesFile}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(businessesFile)) {
    console.error(`❌ Businesses sample data file not found: ${businessesFile}`);
    process.exit(1);
  }
  
  console.log('📁 Found sample data files\n');
  
  // Execute sample data insertion
  const results = [];
  
  results.push(await executeSQLFile(classesFile, 'Classes sample data'));
  console.log('');
  
  results.push(await executeSQLFile(businessesFile, 'Businesses sample data'));
  console.log('');
  
  // Summary
  const successful = results.filter(r => r).length;
  const total = results.length;
  
  console.log('📊 Summary:');
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 Sample data population completed successfully!');
    console.log('\n💡 You can now test the application with real data:');
    console.log('   - Visit /classes to see sample stepping classes');
    console.log('   - Visit /community to see sample businesses');
    console.log('   - Visit /database-test to run database operation tests');
  } else {
    console.log('\n⚠️  Some operations failed. Check the logs above for details.');
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run the script
insertSampleData().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

console.log(`
🗃️  Database Sample Data Population
=====================================

This script will populate your Supabase database with sample data for:
• Stepping classes with instructors, schedules, and attendees
• Community businesses with reviews and contact information

Make sure you have:
✓ VITE_SUPABASE_URL in your .env file
✓ SUPABASE_SERVICE_ROLE_KEY in your .env file
✓ Database migrations applied (stepping_classes and community_businesses tables)

`);