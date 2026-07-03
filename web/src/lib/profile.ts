// Lightweight, account-free "remember me": the Find Me a Card flow collects
// a name + email (optional) and stores the user's owned cards and stated
// preferences in localStorage, so a returning visitor on the same browser
// keeps their setup. No auth, no backend — swap the read/write pair for a
// Supabase `leads` table keyed by email if cross-device memory is ever wanted.

export interface StoredProfile {
  name?: string;
  email?: string;
  ownedCards?: string[];
  filters?: string[];
  answers?: Record<string, unknown>;
}

const KEY = 'cardscope.profile.v1';

export function loadProfile(): StoredProfile {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveProfile(patch: StoredProfile): void {
  try {
    const next = { ...loadProfile(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage disabled (private mode) — degrade to no persistence */
  }
}
