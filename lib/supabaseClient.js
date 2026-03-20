import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ADD THIS TEMPORARY CHECK
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase Environment Variables are Missing!")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
