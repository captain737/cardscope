// Cross-device "remember me" backed by Supabase, layered on top of the
// localStorage profile (lib/profile.ts). Same StoredProfile shape.
//
// Identity is the email the user types — there's no auth. All access goes
// through two SECURITY DEFINER RPCs (get_user_profile / upsert_user_profile,
// see credit-card-crawler/supabase/schema.sql), so the public anon key can
// only fetch ONE profile by exact email and can never enumerate the table.
//
// Every call degrades to a no-op when Supabase isn't configured, so the app
// works identically on the committed snapshot with no backend.

import { supabase } from './supabaseClient';
import { StoredProfile } from './profile';

const emailKey = (email?: string) => (email || '').trim().toLowerCase();

/** Fetch a saved profile by email. Returns null if none / not configured. */
export async function loadRemoteProfile(email: string): Promise<StoredProfile | null> {
  const key = emailKey(email);
  if (!supabase || !key) return null;
  try {
    const { data, error } = await supabase.rpc('get_user_profile', { p_email: key });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.email) return null;
    return {
      name: row.name ?? undefined,
      email: row.email,
      ownedCards: (row.owned_cards as string[]) ?? [],
      filters: (row.filters as string[]) ?? [],
      answers: (row.answers as Record<string, unknown>) ?? {},
    };
  } catch {
    return null; // network/CORS/misconfig — stay silent, localStorage still works
  }
}

/** Upsert the user's profile, keyed by email. No-op without an email. */
export async function saveRemoteProfile(p: StoredProfile): Promise<void> {
  const key = emailKey(p.email);
  if (!supabase || !key) return;
  try {
    await supabase.rpc('upsert_user_profile', {
      p_email: key,
      p_name: p.name ?? null,
      p_owned_cards: p.ownedCards ?? [],
      p_filters: p.filters ?? [],
      p_answers: p.answers ?? {},
    });
  } catch {
    /* best-effort — localStorage remains the source of truth on failure */
  }
}
