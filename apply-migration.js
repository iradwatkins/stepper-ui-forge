// Direct migration application script
// This script applies the migration using the Supabase client

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://aszzhlgwfbijaotfddsh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzenpobGd3ZmJpamFvdGZkZHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDMwODgsImV4cCI6MjA2NjcxOTA4OH0.ilfdDmbwme7oACe4TxsAJVko3O-DgPl-QWIHKbfZop0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('🚀 Starting migration application...')
  
  try {
    // Read the migration file
    const migrationSQL = readFileSync('./supabase/migrations/018_consolidated_auth_fix.sql', 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      if (statement.trim() === '') continue
      
      console.log(`\n${i + 1}. Executing: ${statement.substring(0, 100)}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message)
        // Continue with next statement - some may fail if already exist
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
      }
    }
    
    console.log('\n🎉 Migration application complete!')
    console.log('Now run: node verify-auth-fix.js to verify the fix')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
  }
}

// Apply migration
applyMigration()