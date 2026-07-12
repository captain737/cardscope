import { CreditCard } from '../types';

// Row shape returned by Supabase's `cards` table (see
// credit-card-crawler/supabase/schema.sql). Crawled data has no concept of
// gradients/last4 — those are purely cosmetic and derived below.
export interface CardRow {
  id: string;
  url: string;
  provider: string;
  card_name: string | null;
  issuer: string | null;
  annual_fee: number | null;
  apr_range: string | null;
  apr_intro: string | null;
  apr_regular: string | null;
  rewards_summary: string | null;
  rewards_bullets: string[] | null;
  signup_bonus: string | null;
  recommended_credit_score: string | null;
  foreign_transaction_fee: string | null;
  tags: string[] | null;
  best_for: string | null;
  top_perk: string | null;
  image_url: string | null;
}

// Physical card gradients cards are assigned from, keyed by a hash of the
// issuer name so the same issuer always renders the same way across
// cards/loads. This is the one place per-card color variety lives — see
// DESIGN.md: the card art keeps its own identity, the surrounding UI
// chrome does not.
const PALETTE: string[] = [
  'bg-gradient-to-br from-neutral-800 via-neutral-900 to-black',
  'bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600',
  'bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700',
  'bg-gradient-to-br from-rose-400 via-red-500 to-rose-700',
  'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600',
  'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600',
  'bg-gradient-to-br from-amber-300 via-yellow-500 to-orange-600',
  'bg-gradient-to-br from-sky-500 via-indigo-600 to-blue-800',
  'bg-gradient-to-br from-lime-400 via-green-500 to-emerald-600',
  'bg-gradient-to-br from-purple-400 via-pink-500 to-rose-600',
  'bg-gradient-to-br from-blue-300 via-cyan-500 to-teal-500',
  'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700',
  'bg-gradient-to-br from-orange-400 via-red-500 to-pink-600',
  'bg-gradient-to-br from-violet-500 via-purple-700 to-indigo-900',
  'bg-gradient-to-br from-teal-300 via-green-400 to-emerald-500',
];

function hashString(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function gradientFor(issuer: string): string {
  return PALETTE[hashString(issuer) % PALETTE.length];
}

function last4For(seed: string): string {
  return String(hashString(seed) % 10000).padStart(4, '0');
}

function formatAnnualFee(fee: number | null): string {
  if (fee === null || fee === undefined) return 'See issuer site';
  return fee === 0 ? '$0' : `$${fee.toLocaleString()}`;
}

export function mapRowToCard(row: CardRow): CreditCard {
  const issuer = row.issuer || row.provider;
  const name = row.card_name || `${issuer} Card`;

  return {
    id: row.id,
    name,
    issuer: issuer.toUpperCase(),
    provider: row.provider,
    last4: last4For(row.url || row.id),
    tags: row.tags && row.tags.length > 0 ? row.tags : ['personal'],
    gradient: gradientFor(issuer),
    imageUrl: row.image_url || undefined,
    applyUrl: row.url || undefined,
    facts: {
      annualFee: formatAnnualFee(row.annual_fee),
      rewards: row.rewards_summary || 'See issuer site for rewards details',
      rewardsBullets: row.rewards_bullets && row.rewards_bullets.length > 0 ? row.rewards_bullets : undefined,
      bonus: row.signup_bonus || 'None',
      apr: row.apr_regular || row.apr_range || 'See issuer site',
      aprIntro: row.apr_intro || undefined,
      // Un-recrawled rows have no split field yet — fall back to apr_range so
      // the Regular subsection always has something to show.
      aprRegular: row.apr_regular || row.apr_range || undefined,
      bestFor: row.best_for || 'Everyday Spend',
      creditNeeded: row.recommended_credit_score || 'Not specified',
      foreignFee: row.foreign_transaction_fee || 'Not specified',
      topPerk: row.top_perk || 'See issuer site for full benefits',
    },
  };
}
