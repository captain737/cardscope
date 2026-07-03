// Deck ranking — the single place that decides which cards show and in
// what order. Replaces the old "shuffle then sort by match count, keep
// everything" logic that made the home deck feel choppy.
//
// Rules:
//   - Owned cards are never suggested (you already have them).
//   - With filters and/or complement active, only cards that actually
//     score > 0 appear, best-first, in a *stable* order (no per-render
//     reshuffle), so ranking reads as deliberate.
//   - Preference match is the primary signal (weighted 2x). When the user
//     owns cards, a "gap" bonus rewards cards that cover spending
//     categories their current wallet doesn't — that's the "complement".
//   - With nothing to rank by, the deck is a plain shuffle of everything.

import { FILTERS, cardMatchesFilter } from './filters';
import { CreditCard } from '../types';

// The raw tags that represent spending goals (travel, dining, gas, …).
// Used to measure what a wallet already covers vs. what a card would add.
const GOAL_TAGS = new Set(FILTERS.filter(f => f.group === 'goal').flatMap(f => f.matchTags));

export interface RankedCard {
  card: CreditCard;
  rank: number; // 1-based position, best first
}

export interface DeckResult {
  deck: CreditCard[];
  /** True when the deck is ordered by score (show rank badges);
   *  false for a plain shuffle. */
  ranked: boolean;
  /** True when ranking factored in the user's existing cards
   *  (badges read "best complement" instead of "best match"). */
  complement: boolean;
}

function shuffle(cards: CreditCard[]): CreditCard[] {
  const next = [...cards];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** Union of the raw tags across every card the user already holds. */
export function ownedTagSet(ownedIds: string[], all: CreditCard[]): Set<string> {
  const tags = new Set<string>();
  for (const id of ownedIds) {
    all.find(c => c.id === id)?.tags?.forEach(t => tags.add(t));
  }
  return tags;
}

/**
 * A card's score: how well it fits the active filters (primary, x2), plus
 * a complement bonus for each goal category it adds that the user's owned
 * cards don't already cover.
 */
export function scoreCard(card: CreditCard, filters: string[], ownedTags: Set<string>): number {
  const pref = filters.reduce((n, f) => n + (cardMatchesFilter(card.tags, f) ? 1 : 0), 0);
  let gap = 0;
  if (ownedTags.size > 0) {
    gap = (card.tags || []).filter(t => GOAL_TAGS.has(t) && !ownedTags.has(t)).length;
  }
  return pref * 2 + gap;
}

const DECK_SIZE = 15;

/**
 * Builds the ordered deck. `ranked` deck (filters and/or match mode) is
 * deterministic and best-first; otherwise a shuffled browse deck.
 */
export function buildDeck(
  all: CreditCard[],
  filters: string[],
  ownedIds: string[],
  matchMode: boolean,
): DeckResult {
  const owned = new Set(ownedIds);
  const pool = all.filter(c => !owned.has(c.id));
  const complement = ownedIds.length > 0;
  const wantRanked = matchMode || filters.length > 0;

  if (!wantRanked) {
    return { deck: shuffle(pool).slice(0, DECK_SIZE), ranked: false, complement: false };
  }

  const ownedTags = ownedTagSet(ownedIds, all);
  const scored = pool
    .map(card => ({ card, score: scoreCard(card, filters, ownedTags) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.card.name.localeCompare(b.card.name));

  // Degenerate case (e.g. match mode with no derived filters and no owned
  // cards): nothing scores, so fall back to a browse deck rather than an
  // empty carousel.
  if (scored.length === 0) {
    return { deck: shuffle(pool).slice(0, DECK_SIZE), ranked: false, complement: false };
  }

  return { deck: scored.slice(0, DECK_SIZE).map(x => x.card), ranked: true, complement };
}
