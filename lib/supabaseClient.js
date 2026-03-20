import { createClient } from '@supabase/supabase-js'

// We use "window" check to ensure we don't crash the build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ENVIRONMENT ERROR: Keys are missing. Check Vercel Settings.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
