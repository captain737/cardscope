// APR is always shown as two labelled subsections — an intro/promotional
// rate and the ongoing/standard rate — so the layout is consistent card to
// card. The crawler splits these into facts.aprIntro / facts.aprRegular.
//
// Intro resolves to one of three states:
//   • the offer text   e.g. "0% for the first 15 months"
//   • "Not applicable" the card explicitly has no intro APR offer
//   • "Unsure"         we don't have the data yet (un-recrawled / placeholder)
// Regular is the ongoing APR, or "Unsure" when unknown.

import { CardFacts } from '../types';

export interface AprSection {
  label: string;
  value: string;
}

// Placeholder / unknown values — no real data to show.
const UNKNOWN = /^\s*$|see issuer|not specified|unsure|unknown|tbd/i;
// The card was checked and has no intro offer.
const NO_INTRO = /^(none|no\b|no intro|not applicable|n\/a)/i;

function introValue(raw?: string): string {
  const t = (raw || '').trim();
  if (!t || UNKNOWN.test(t)) return 'Unsure';
  if (NO_INTRO.test(t)) return 'Not applicable';
  return t;
}

function regularValue(facts: CardFacts): string {
  const t = (facts.aprRegular || facts.apr || '').trim();
  if (!t || UNKNOWN.test(t)) return 'Unsure';
  return t;
}

export function aprSections(facts: CardFacts): AprSection[] {
  return [
    { label: 'Intro', value: introValue(facts.aprIntro) },
    { label: 'Regular', value: regularValue(facts) },
  ];
}
