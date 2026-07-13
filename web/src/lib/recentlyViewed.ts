// Recently Viewed cards (PRD Feature 4). Anonymous users get a localStorage
// list of the last N card ids they focused; it survives across sessions. The
// list is newest-first and de-duplicated. (Signed-in cross-device sync can
// later ride on the same user_profiles row, like ownedCards.)

const KEY = 'cardfit.recentlyViewed.v1';
const MAX = 10;

export function getRecentlyViewed(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Record a card as viewed — moves it to the front, caps the list at MAX. */
export function pushRecentlyViewed(cardId: string): string[] {
  const next = [cardId, ...getRecentlyViewed().filter((id) => id !== cardId)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage disabled — no persistence, not fatal */
  }
  return next;
}

export function removeRecentlyViewed(cardId: string): string[] {
  const next = getRecentlyViewed().filter((id) => id !== cardId);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
