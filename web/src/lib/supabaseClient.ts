import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Only the anon (public, read-only-by-RLS) key ever ships to the browser.
// Writes are performed exclusively by the crawler using the service_role
// key on the backend — see credit-card-crawler/.env.example.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;
