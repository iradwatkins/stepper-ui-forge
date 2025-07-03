import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = 'https://aszzhlgwfbijaotfddsh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzenpobGd3ZmJpamFvdGZkZHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDMwODgsImV4cCI6MjA2NjcxOTA4OH0.ilfdDmbwme7oACe4TxsAJVko3O-DgPl-QWIHKbfZop0'

// Supabase is properly configured for production
const isSupabaseConfigured = true

if (!isSupabaseConfigured) {
  console.warn('Supabase environment variables not configured. Some features will be disabled.')
}

// Create a mock client for development when Supabase is not configured
const createMockClient = () => ({
  auth: {
    signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }),
    insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }),
    update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: new Error('Supabase not configured') }) })
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ error: new Error('Supabase not configured') }),
      getPublicUrl: () => ({ data: { publicUrl: '' } })
    })
  }
} as unknown as SupabaseClient<Database>)

// Use real client if we have both URL and key (more permissive than original check)
const shouldUseRealClient = supabaseUrl && supabaseAnonKey

export const supabase = shouldUseRealClient
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : createMockClient()

export const isSupabaseReady = shouldUseRealClient