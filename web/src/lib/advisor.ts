// Client for the AI advisor note (Phase 2). Calls the analyze-card Supabase
// Edge Function (which proxies Groq server-side — the key never touches the
// browser). Everything degrades to null when VITE_ADVISOR_URL is unset or the
// call fails, so the app works identically without it (the deterministic
// "Why this fits you" bullets always show regardless).

const ENDPOINT = import.meta.env.VITE_ADVISOR_URL as string | undefined;

/** Whether the advisor endpoint is configured (so callers can avoid a
 *  pointless loading state when it isn't). */
export const advisorEnabled = Boolean(ENDPOINT);

export interface AdvisorCard {
  id: string;
  name: string;
  issuer: string;
  annualFee: string;
  rewards: string;
  topPerk: string;
  bonus: string;
  tags: string[];
}

export interface AdvisorProfile {
  ownedCardNames: string[];
  spend?: Record<string, number>;
  credit?: string;
  maxFee?: number;
  rewardPref?: string;
  whyBullets: string[];
}

// Memoize per (card + profile) so re-viewing a card never re-calls Groq.
const cache = new Map<string, string | null>();

export async function fetchAdvisorNote(card: AdvisorCard, profile: AdvisorProfile): Promise<string | null> {
  if (!ENDPOINT) return null;
  const key = card.id + '|' + JSON.stringify(profile);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ card, profile }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      cache.set(key, null); // don't hammer a failing endpoint for this card
      return null;
    }
    const data = await resp.json();
    const note = typeof data.note === 'string' && data.note.trim() ? data.note.trim() : null;
    cache.set(key, note);
    return note;
  } catch {
    return null; // network/timeout — leave uncached so a later view can retry
  } finally {
    clearTimeout(timeout);
  }
}
