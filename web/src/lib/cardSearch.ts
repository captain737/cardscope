// Shared card search used by the Compare and Find Me a Card search boxes.
//
// Two improvements over a plain `name.includes(q)`:
//   1. Issuer nicknames — "amex" matches American Express, "boa" Bank of
//      America, etc. (aliases are appended to the searchable text when the
//      canonical issuer name is present).
//   2. Token AND matching — every word in the query must appear somewhere in
//      the card's name/issuer, so "amex gold" or word order / ® symbols don't
//      break the match.

import { CreditCard } from '../types';

// [canonical substring that appears in issuer/name, extra searchable aliases]
const ISSUER_ALIASES: [string, string][] = [
  ['american express', 'amex'],
  ['bank of america', 'boa bofa'],
  ['capital one', 'capone cap1'],
  ['wells fargo', 'wf'],
  ['u.s. bank', 'usb us bank'],
  ['us bank', 'usb'],
  ['citibank', 'citi'],
];

function haystack(card: Pick<CreditCard, 'name' | 'issuer'>): string {
  let h = `${card.name} ${card.issuer}`.toLowerCase();
  for (const [canon, alias] of ISSUER_ALIASES) {
    if (h.includes(canon)) h += ' ' + alias;
  }
  return h;
}

export function cardMatchesQuery(card: Pick<CreditCard, 'name' | 'issuer'>, query: string): boolean {
  const tokens = query.toLowerCase().match(/[a-z0-9]+/g) || [];
  if (tokens.length === 0) return false;
  const h = haystack(card);
  return tokens.every((t) => h.includes(t));
}
