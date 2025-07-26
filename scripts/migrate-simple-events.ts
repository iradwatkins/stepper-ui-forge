#!/usr/bin/env node

/**
 * Migration script to update existing simple events with new fields
 * This ensures all simple events have proper end_date, end_time, timezone, and tags
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateSimpleEvents() {
  console.log('Starting simple events migration...')

  try {
    // Fetch all simple events that might need updating
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select('id, title, date, time, location, event_type, end_date, end_time, timezone, tags')
      .eq('event_type', 'simple')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching events:', fetchError)
      return
    }

    console.log(`Found ${events?.length || 0} simple events`)

    let updatedCount = 0
    
    for (const event of events || []) {
      const updates: any = {}
      
      // Set end_date and end_time if missing
      if (!event.end_date) {
        updates.end_date = event.date
      }
      if (!event.end_time) {
        updates.end_time = event.time
      }
      
      // Set timezone if missing
      if (!event.timezone) {
        updates.timezone = detectTimezone(event.location)
      }
      
      // Initialize tags if null
      if (event.tags === null) {
        updates.tags = []
      }
      
      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('events')
          .update(updates)
          .eq('id', event.id)
          
        if (updateError) {
          console.error(`Error updating event ${event.id}:`, updateError)
        } else {
          console.log(`Updated event: ${event.title} (${event.id})`)
          updatedCount++
        }
      }
    }
    
    console.log(`Migration complete. Updated ${updatedCount} events.`)
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

function detectTimezone(location: string): string {
  const locationLower = location.toLowerCase()
  
  // West Coast
  if (locationLower.includes('california') || 
      locationLower.includes('los angeles') || 
      locationLower.includes('san francisco') ||
      locationLower.includes('seattle') ||
      locationLower.includes('portland') ||
      locationLower.includes('vegas')) {
    return 'America/Los_Angeles'
  }
  
  // Central
  if (locationLower.includes('chicago') || 
      locationLower.includes('illinois') ||
      locationLower.includes('texas') ||
      locationLower.includes('houston') ||
      locationLower.includes('dallas')) {
    return 'America/Chicago'
  }
  
  // Mountain
  if (locationLower.includes('denver') || 
      locationLower.includes('colorado') ||
      locationLower.includes('utah')) {
    return 'America/Denver'
  }
  
  // Arizona (no DST)
  if (locationLower.includes('arizona') || 
      locationLower.includes('phoenix')) {
    return 'America/Phoenix'
  }
  
  // Hawaii
  if (locationLower.includes('hawaii')) {
    return 'Pacific/Honolulu'
  }
  
  // Alaska
  if (locationLower.includes('alaska')) {
    return 'America/Anchorage'
  }
  
  // Default to Eastern
  return 'America/New_York'
}

// Run the migration
migrateSimpleEvents()
  .then(() => {
    console.log('Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })