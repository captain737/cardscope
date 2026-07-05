// Deck ranking — the single place that decides which cards show and in
// what order.
//
// Filters fall into two behaviours:
//
//   STRICT (hard filters — a card is excluded unless it qualifies):
//     • account   personal / business / student. Personal shows only
//                 personal cards; business only business; student shows
//                 student AND personal cards (student-specific preferred),
//                 never business.
//     • reward    cash back vs rewards (travel/points) are distinct: a
//                 cash-back filter never surfaces a points card, and vice
//                 versa.
//     • quality   No Annual Fee excludes every card that charges a fee
//                 (checked against the real fee, not a tag); Premium shows
//                 only premium cards.
//
//   SOFT (the spending family — dining / groceries / gas / balance
//   transfer): complements, OR-matched. A card needs to cover at least one
//   selected category to appear, and covering more ranks it higher.
//
// Better to show fewer cards that fully meet the criteria than to stretch
// the deck to a fixed size with cards that don't — so there is no padding:
// the deck is exactly the qualifying cards (capped at DECK_MAX), best-first.

import { cardMatchesFilter } from './filters';
import { CreditCard } from '../types';

const ACCOUNT_IDS = ['personal', 'business', 'students'];
const REWARD_IDS = ['cashback', 'travel'];
const SPEND_IDS = ['dining', 'groceries', 'gas', 'balance'];

// Raw tags used to measure what a wallet already covers vs. what a card adds.
const GOAL_TAGS = new Set([...REWARD_IDS, ...SPEND_IDS].flatMap((id) => {
  // travel expands to several raw tags; the rest map to themselves.
  return id === 'travel' ? ['travel', 'flights', 'hotels', 'lounge'] : [id];
}));

export interface DeckResult {
  deck: CreditCard[];
  /** True when the deck is ordered by score (show rank badges). */
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

/** A card's account type; business/student take precedence over personal. */
function cardAccount(card: CreditCard): 'business' | 'students' | 'personal' {
  const tags = card.tags || [];
  if (tags.includes('business')) return 'business';
  if (tags.includes('students')) return 'students';
  return 'personal';
}

/** True unless the card is a $0 annual fee. Unknown fees are treated as a
 *  fee (we can't confirm they're free), so No Annual Fee stays strict. */
function hasFee(card: CreditCard): boolean {
  return card.facts.annualFee !== '$0';
}

/** Union of the raw tags across every card the user already holds. */
export function ownedTagSet(ownedIds: string[], all: CreditCard[]): Set<string> {
  const tags = new Set<string>();
  for (const id of ownedIds) {
    all.find((c) => c.id === id)?.tags?.forEach((t) => tags.add(t));
  }
  return tags;
}

/** Hard-filter: does the card qualify under the strict + soft filters? */
export function cardQualifies(card: CreditCard, filters: string[]): boolean {
  const account = filters.find((f) => ACCOUNT_IDS.includes(f));
  if (account) {
    const a = cardAccount(card);
    if (account === 'personal' && a !== 'personal') return false;
    if (account === 'business' && a !== 'business') return false;
    if (account === 'students' && a === 'business') return false; // student OR personal
  }

  const rewards = filters.filter((f) => REWARD_IDS.includes(f));
  if (rewards.length && !rewards.some((r) => cardMatchesFilter(card.tags, r))) return false;

  if (filters.includes('no-fee') && hasFee(card)) return false;
  if (filters.includes('premium') && !(card.tags || []).includes('premium')) return false;

  const spend = filters.filter((f) => SPEND_IDS.includes(f));
  if (spend.length && !spend.some((s) => cardMatchesFilter(card.tags, s))) return false;

  return true;
}

/**
 * Orders qualifying cards. Everything here already passed the hard filters,
 * so the score only decides sequence: more covered spend/reward categories
 * first, student-specific cards ahead of plain personal in student mode, and
 * a complement bonus for goal categories the user's wallet doesn't cover.
 */
export function scoreCard(
  card: CreditCard,
  filters: string[],
  ownedTags: Set<string>,
): number {
  const tags = card.tags || [];
  let score = 0;

  const spend = filters.filter((f) => SPEND_IDS.includes(f));
  score += spend.filter((s) => cardMatchesFilter(tags, s)).length * 2;

  const rewards = filters.filter((f) => REWARD_IDS.includes(f));
  score += rewards.filter((r) => cardMatchesFilter(tags, r)).length;

  if (filters.includes('students') && tags.includes('students')) score += 6;

  if (ownedTags.size > 0) {
    score += tags.filter((t) => GOAL_TAGS.has(t) && !ownedTags.has(t)).length;
  }

  return score;
}

const DECK_MAX = 15;

/**
 * Builds the ordered deck. With filters and/or match mode active, returns
 * exactly the qualifying cards (best-first, deterministic), fewer than
 * DECK_MAX if that's all that qualifies. Otherwise a shuffled browse deck.
 */
export function buildDeck(
  all: CreditCard[],
  filters: string[],
  ownedIds: string[],
  matchMode: boolean,
): DeckResult {
  const owned = new Set(ownedIds);
  const pool = all.filter((c) => !owned.has(c.id));
  const complement = ownedIds.length > 0;
  const wantRanked = matchMode || filters.length > 0;

  if (!wantRanked) {
    return { deck: shuffle(pool).slice(0, DECK_MAX), ranked: false, complement: false };
  }

  const candidates = pool.filter((c) => cardQualifies(c, filters));
  const ownedTags = ownedTagSet(ownedIds, all);

  const deck = candidates
    .map((card) => ({ card, score: scoreCard(card, filters, ownedTags) }))
    .sort((a, b) => b.score - a.score || a.card.name.localeCompare(b.card.name))
    .slice(0, DECK_MAX)
    .map((x) => x.card);

  return { deck, ranked: true, complement };
}
