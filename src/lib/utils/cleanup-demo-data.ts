import { supabase } from '@/integrations/supabase/client'

interface CleanupResult {
  deleted: number
  errors: any[]
}

export async function cleanupAllDemoData(): Promise<CleanupResult> {
  const demoPatterns = [
    'Spring Art Exhibition',
    'Winter Networking Event', 
    'Summer Music Festival',
    'Tech Conference 2024',
    'Food & Wine Expo',
    'Charity Gala',
    'Weekend Market'
  ]
  
  const result: CleanupResult = {
    deleted: 0,
    errors: []
  }
  
  try {
    // Get all demo events
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select('id, title')
      .in('title', demoPatterns)
    
    if (fetchError) {
      result.errors.push(fetchError)
      return result
    }
    
    if (events && events.length > 0) {
      // Delete events (cascades to related data)
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .in('id', events.map(e => e.id))
      
      if (deleteError) {
        result.errors.push(deleteError)
      } else {
        result.deleted = events.length
      }
    }
    
  } catch (error) {
    result.errors.push(error)
  }
  
  return result
}

export async function verifyCleanup(): Promise<boolean> {
  try {
    const demoPatterns = [
      'Spring Art Exhibition',
      'Winter Networking Event',
      'Summer Music Festival',
      'Tech Conference 2024',
      'Food & Wine Expo',
      'Charity Gala',
      'Weekend Market'
    ]
    
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .in('title', demoPatterns)
    
    if (error) {
      console.error('Verification error:', error)
      return false
    }
    
    return !data || data.length === 0
  } catch (error) {
    console.error('Verification error:', error)
    return false
  }
}