import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = 'https://aszzhlgwfbijaotfddsh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzenpobGd3ZmJpamFvdGZkZHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDMwODgsImV4cCI6MjA2NjcxOTA4OH0.ilfdDmbwme7oACe4TxsAJVko3O-DgPl-QWIHKbfZop0'

// Always use real client with production configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export const isSupabaseReady = true