// Supabase client configuration for ArchEdu
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Hardcoded to the active Supabase project - these are public anon keys (safe to commit)
const SUPABASE_URL = "https://vddccefwieqnfitmxtjh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZGNjZWZ3aWVxbmZpdG14dGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Nzc1NzAsImV4cCI6MjA3NzI1MzU3MH0.fMBo_l4xE81I8spvc4qXl31u4SqYNktRjCAC6vbu540";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});