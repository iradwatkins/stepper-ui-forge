import { supabase } from '@/lib/supabase'

/**
 * Utility to clean up demo/test data from the database
 */

interface DemoDataPattern {
  pattern: string;
  type: 'title' | 'location' | 'description' | 'organization';
}

const DEMO_PATTERNS: DemoDataPattern[] = [
  // Event titles
  { pattern: 'Spring Art Exhibition', type: 'title' },
  { pattern: 'Winter Networking Event', type: 'title' },
  { pattern: 'Summer Music Festival', type: 'title' },
  { pattern: 'Tech Conference 2024', type: 'title' },
  { pattern: 'Food & Wine Expo', type: 'title' },
  { pattern: 'Charity Gala', type: 'title' },
  { pattern: 'Weekend Market', type: 'title' },
  { pattern: 'Demo Event', type: 'title' },
  { pattern: 'Test Event', type: 'title' },
  { pattern: 'Sample Event', type: 'title' },
  
  // Locations
  { pattern: 'Downtown Gallery', type: 'location' },
  { pattern: 'Business Center', type: 'location' },
  { pattern: 'Convention Center', type: 'location' },
  { pattern: 'Central Park Amphitheater', type: 'location' },
  { pattern: 'Grand Hotel Ballroom', type: 'location' },
  { pattern: 'Market Square', type: 'location' },
  { pattern: 'Downtown Plaza', type: 'location' },
  { pattern: 'Expo Center', type: 'location' },
  
  // Organizations
  { pattern: 'Music Events Co.', type: 'organization' },
  { pattern: 'TechEvents Inc.', type: 'organization' },
  { pattern: 'Culinary Events', type: 'organization' },
  { pattern: 'Charity Foundation', type: 'organization' },
  { pattern: 'Market Association', type: 'organization' },
]

export const isDemoEvent = (event: any): boolean => {
  return DEMO_PATTERNS.some(({ pattern, type }) => {
    const field = type === 'organization' ? event.organization_name : event[type]
    return field && field.toLowerCase().includes(pattern.toLowerCase())
  })
}

export const findDemoEvents = async (): Promise<any[]> => {
  console.log('🔍 Searching for demo events...')
  
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching events:', error)
      throw error
    }

    const demoEvents = events?.filter(isDemoEvent) || []
    console.log(`📊 Found ${demoEvents.length} demo events out of ${events?.length || 0} total events`)
    
    return demoEvents
  } catch (error) {
    console.error('Error finding demo events:', error)
    throw error
  }
}

export const deleteDemoEvent = async (eventId: string): Promise<void> => {
  console.log(`🗑️ Deleting demo event: ${eventId}`)
  
  try {
    // Delete related records first
    console.log('  - Deleting ticket types...')
    const { error: ticketTypesError } = await supabase
      .from('ticket_types')
      .delete()
      .eq('event_id', eventId)

    if (ticketTypesError) {
      console.error('Error deleting ticket types:', ticketTypesError)
      throw ticketTypesError
    }

    console.log('  - Deleting team members...')
    const { error: teamMembersError } = await supabase
      .from('team_members')
      .delete()
      .eq('event_id', eventId)

    if (teamMembersError) {
      console.error('Error deleting team members:', teamMembersError)
      throw teamMembersError
    }

    console.log('  - Deleting tickets...')
    const { error: ticketsError } = await supabase
      .from('tickets')
      .delete()
      .eq('event_id', eventId)

    if (ticketsError) {
      console.error('Error deleting tickets:', ticketsError)
      throw ticketsError
    }

    // Finally delete the event
    console.log('  - Deleting event...')
    const { error: eventError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (eventError) {
      console.error('Error deleting event:', eventError)
      throw eventError
    }

    console.log(`✅ Successfully deleted event: ${eventId}`)
  } catch (error) {
    console.error(`❌ Error deleting event ${eventId}:`, error)
    throw error
  }
}

export const cleanupAllDemoData = async (): Promise<{ deleted: number; errors: string[] }> => {
  console.log('🧹 Starting demo data cleanup...')
  
  const errors: string[] = []
  let deleted = 0

  try {
    const demoEvents = await findDemoEvents()
    
    if (demoEvents.length === 0) {
      console.log('✨ No demo events found - database is clean!')
      return { deleted: 0, errors: [] }
    }

    console.log(`🎯 Proceeding to delete ${demoEvents.length} demo events...`)

    for (const event of demoEvents) {
      try {
        console.log(`📝 Processing: "${event.title}" at "${event.location}"`)
        await deleteDemoEvent(event.id)
        deleted++
      } catch (error) {
        const errorMsg = `Failed to delete event "${event.title}": ${error}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    console.log(`🎉 Cleanup complete! Deleted ${deleted} events with ${errors.length} errors.`)
    
    return { deleted, errors }
  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error)
    throw error
  }
}

export const verifyCleanup = async (): Promise<boolean> => {
  console.log('🔍 Verifying cleanup...')
  
  try {
    const remainingDemoEvents = await findDemoEvents()
    
    if (remainingDemoEvents.length === 0) {
      console.log('✅ Verification passed - no demo events remaining!')
      return true
    } else {
      console.log(`⚠️ Verification failed - ${remainingDemoEvents.length} demo events still exist:`)
      remainingDemoEvents.forEach(event => {
        console.log(`  - "${event.title}" at "${event.location}"`)
      })
      return false
    }
  } catch (error) {
    console.error('❌ Error during verification:', error)
    throw error
  }
}