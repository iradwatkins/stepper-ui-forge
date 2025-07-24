import { useEffect, useState } from 'react'
import { EventLikesService } from '@/services/eventLikesService'
import { supabase } from '@/integrations/supabase/client'

// Test component to verify liked events functionality
export function TestLikedEvents() {
  const [status, setStatus] = useState<string>('Testing...')
  const [results, setResults] = useState<any>(null)

  useEffect(() => {
    testLikedEvents()
  }, [])

  const testLikedEvents = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setStatus('Error: Not authenticated')
        return
      }

      setStatus(`Testing with user: ${user.id}`)

      // Test direct query (current implementation)
      try {
        const { upcoming, past } = await EventLikesService.getUserLikedEventsCategorized(user.id)
        setResults({
          method: 'Direct Query (EventLikesService)',
          success: true,
          upcoming: upcoming.length,
          past: past.length,
          sample: upcoming[0] || past[0] || null
        })
        setStatus('Success: Direct query works!')
      } catch (error: any) {
        setResults({
          method: 'Direct Query (EventLikesService)',
          success: false,
          error: error.message
        })
        setStatus(`Error: ${error.message}`)
      }

      // Test RPC function
      try {
        const { data, error } = await supabase.rpc('get_user_liked_events', {
          user_uuid: user.id,
          limit_count: 20
        })

        if (error) {
          console.error('RPC Error:', error)
        } else {
          console.log('RPC Success:', data)
        }
      } catch (rpcError) {
        console.error('RPC Test Error:', rpcError)
      }

    } catch (error: any) {
      setStatus(`Unexpected error: ${error.message}`)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Liked Events Test</h2>
      <p>Status: {status}</p>
      {results && (
        <pre style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
          {JSON.stringify(results, null, 2)}
        </pre>
      )}
    </div>
  )
}