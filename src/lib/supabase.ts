import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if environment variables are properly configured
const isSupabaseConfigured = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url_here' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here'

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

export const supabase = isSupabaseConfigured 
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : createMockClient()

export const isSupabaseReady = isSupabaseConfigured