import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// This will log the status directly to your browser console so we can see it
if (typeof window !== 'undefined') {
  console.log("Supabase URL Loaded:", !!supabaseUrl);
  console.log("Supabase Key Loaded:", !!supabaseAnonKey);
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);
