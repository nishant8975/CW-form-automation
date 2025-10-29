import { createClient } from '@supabase/supabase-js'

// Use environment variables provided by your build tool (e.g., Vite uses import.meta.env)
// Ensure these variables are prefixed (e.g., VITE_) in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or Anon Key. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.")
}

// Create the Supabase client for the FRONTEND using the ANON KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
