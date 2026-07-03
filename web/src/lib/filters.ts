// Single source of truth for the filter/category vocabulary. The home
// bubble filters, the deck scoring, and the "Find Me a Card" questionnaire
// all import this so the taxonomy stays consistent.
//
// Three groups, by how they behave:
//   account  — who the card is for. Mutually exclusive: exactly one, or
//              none. Personal / Business / Student are one field, not
//              three independent toggles.
//   goal     — what you want out of the card. Multi-select.
//   quality  — a property of the card itself. Multi-select, with a couple
//              of natural conflicts (a Premium card is never No Annual Fee).
//
// `matchTags` maps a user-facing filter onto the raw tags the crawler
// produces (src/tagging.py). This is why "Travel" alone is offered instead
// of Flights + Hotels + Lounge: those are all travel signals, so Travel
// matches any of them. Lounge access is also a Premium signal.

export type FilterGroup = 'account' | 'goal' | 'quality';

export interface FilterDef {
  id: string;
  label: string;
  group: FilterGroup;
  matchTags: string[];
}

export const FILTERS: FilterDef[] = [
  // Account — single-select field.
  { id: 'personal', label: 'Personal', group: 'account', matchTags: ['personal'] },
  { id: 'business', label: 'Business', group: 'account', matchTags: ['business'] },
  { id: 'students', label: 'Student', group: 'account', matchTags: ['students'] },

  // Goal — what you want back. Multi-select.
  { id: 'travel', label: 'Travel', group: 'goal', matchTags: ['travel', 'flights', 'hotels', 'lounge'] },
  { id: 'cashback', label: 'Cash Back', group: 'goal', matchTags: ['cashback'] },
  { id: 'dining', label: 'Dining', group: 'goal', matchTags: ['dining'] },
  { id: 'groceries', label: 'Groceries', group: 'goal', matchTags: ['groceries'] },
  { id: 'gas', label: 'Gas', group: 'goal', matchTags: ['gas'] },
  { id: 'balance', label: 'Balance Transfer', group: 'goal', matchTags: ['balance'] },

  // Quality — property of the card. Multi-select.
  { id: 'no-fee', label: 'No Annual Fee', group: 'quality', matchTags: ['no-fee'] },
  { id: 'low-apr', label: 'Low APR', group: 'quality', matchTags: ['low-apr'] },
  { id: 'premium', label: 'Premium', group: 'quality', matchTags: ['premium', 'lounge'] },
];

export const FILTER_BY_ID: Record<string, FilterDef> = Object.fromEntries(
  FILTERS.map(f => [f.id, f])
);

const ACCOUNT_IDS = FILTERS.filter(f => f.group === 'account').map(f => f.id);

// Quality conflicts: Premium (annual-fee, lounge-tier) and No Annual Fee
// are contradictory; likewise Premium and Low APR rarely coexist.
const QUALITY_CONFLICTS: Record<string, string[]> = {
  premium: ['no-fee', 'low-apr'],
  'no-fee': ['premium'],
  'low-apr': ['premium'],
};

/**
 * Toggles a filter, enforcing the group rules: selecting an account filter
 * clears any other account filter (single-select field); quality conflicts
 * are removed. Goals stack freely.
 */
export function toggleFilter(active: string[], id: string): string[] {
  if (active.includes(id)) return active.filter(f => f !== id);

  const def = FILTER_BY_ID[id];
  let next = active;

  if (def?.group === 'account') {
    next = next.filter(f => !ACCOUNT_IDS.includes(f)); // one account at a time
  }
  const conflicts = QUALITY_CONFLICTS[id] || [];
  next = next.filter(f => !conflicts.includes(f));

  return [...next, id];
}

/** Resolves a raw list of ids into a legal selection (used when filters
 *  arrive from outside the bubble UI, e.g. the questionnaire hand-off). */
export function normalizeFilters(ids: string[]): string[] {
  let result: string[] = [];
  for (const id of ids) {
    if (!FILTER_BY_ID[id]) continue;
    result = toggleFilter(result.includes(id) ? result.filter(f => f !== id) : result, id);
  }
  return result;
}

/** A card matches a filter when it carries any of that filter's tags. */
export function cardMatchesFilter(cardTags: string[] | undefined, filterId: string): boolean {
  const def = FILTER_BY_ID[filterId];
  if (!def || !cardTags) return false;
  return def.matchTags.some(t => cardTags.includes(t));
}
