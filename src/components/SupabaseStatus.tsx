import { isSupabaseReady } from '@/lib/supabase'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Database } from 'lucide-react'

export function SupabaseStatus() {
  if (isSupabaseReady) {
    return null
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-800 mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="ml-2">
        <strong>Database not configured:</strong> Supabase environment variables are missing. 
        Profile and event data will not persist. Please set up your Supabase configuration 
        to enable full functionality.
        <div className="mt-2 text-xs opacity-75">
          <Database className="inline h-3 w-3 mr-1" />
          See /docs/database-setup.md for instructions
        </div>
      </AlertDescription>
    </Alert>
  )
}