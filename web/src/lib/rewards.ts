// Turns a rewards summary sentence into site-styled bullet points, one per
// earn tier (and per trailing sentence like a bonus clause). This is the
// client-side fallback: if the crawler later stores an LLM-generated
// `rewards_bullets` array in Supabase, the UI prefers that (see
// cardMapper + the Rewards renderers). Until then, this keeps the display
// consistent without a re-crawl.
//
// Example:
//   "Earn 5% cash back on various categories throughout the year, such as
//    gas stations, grocery stores, restaurants, and more, and 1% cash back
//    on all other purchases."
// becomes:
//   ["5% cash back on various categories throughout the year, such as gas
//     stations, grocery stores, restaurants, and more",
//    "1% cash back on all other purchases"]

// A reward *rate* token — the thing that marks the start of a new earn tier.
// Handles decimals across all forms ("1.5%", "1.5 points", "2.5x").
const RATE = String.raw`\d+(?:\.\d+)?%|\d+(?:\.\d+)?x\b|\d+(?:\.\d+)?\s+(?:points?|miles?|avios|thankyou|cash\b)`;

// Qualifier words issuers slip between the connector and the rate, e.g.
// "and unlimited 1.5 points", "plus a 5% bonus".
const QUALIFIER = String.raw`(?:unlimited\s+|an?\s+)?`;

// A tier boundary: a connector (comma / "and" / "plus" / "with") immediately
// before a (optionally qualified) rate token. Splitting here keeps mid-tier
// lists (", dining, and grocery purchases") intact while breaking between
// distinct rates ("…, and 1% cash back …", "…plus earn 2%…").
const BOUNDARY = new RegExp(
  String.raw`(?:,\s+and\s+|,\s+|\s+and\s+|\s+plus\s+(?:earn\s+)?|\s+with\s+)(?=${QUALIFIER}(?:${RATE}))`,
  'i',
);

const NO_DATA = /see issuer|not specified|^none$|^n\/a$/i;

function tidy(part: string): string {
  const t = part.trim().replace(/[.;,]+$/, '').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Restates a fact so it leads with its number — "Earn 3X Membership
 * Rewards points on travel" reads "3X Membership Rewards points on
 * travel", "Earn a $200 statement credit after…" reads "$200 statement
 * credit after…". Text without a number passes through unchanged.
 */
export function leadWithNumber(text: string): string {
  const m = text.match(/\$?\d/);
  if (!m || m.index === undefined || m.index === 0) return text;
  return text.slice(m.index).trim();
}

/**
 * A card's rewards as display bullets — the hard rule is that the rewards
 * section is always a bulleted list and every bullet leads with its rate
 * ("3X miles…", "6% cash back…"). Prefers the crawler's LLM bullets when
 * present, otherwise splits the prose; [] only when there's no real data
 * (callers then fall back to the raw text).
 */
export function cardRewardBullets(facts: {
  rewards: string;
  rewardsBullets?: string[];
}): string[] {
  const bullets = (facts.rewardsBullets?.length
    ? facts.rewardsBullets
    : rewardBullets(facts.rewards)
  ).map((b) => tidy(leadWithNumber(b)));
  // Rate bullets only — descriptive trailers ("Points don't expire…") are
  // dropped when real rates exist. A card with no numeric rewards at all
  // (e.g. a pure low-APR card) keeps its descriptive text as the list.
  const numeric = bullets.filter((b) => /^\$?\d/.test(b));
  return numeric.length ? numeric : bullets;
}

/**
 * The Top Perk cell: when the crawler's top perk is just the sign-up bonus
 * restated, say "The sign-up bonus" instead of repeating the whole clause;
 * a distinct perk (a particular reward, a credit, lounge access) shows as
 * itself, number first.
 */
export function topPerkDisplay(facts: { topPerk: string; bonus: string }): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const perk = norm(facts.topPerk);
  const bonus = norm(facts.bonus);
  if (perk && bonus && (perk === bonus || perk.includes(bonus) || bonus.includes(perk))) {
    return 'The sign-up bonus';
  }
  return leadWithNumber(facts.topPerk);
}

/**
 * Splits a rewards summary into bullet points. Returns [] when there's
 * nothing meaningful to show (missing / placeholder text). Returns a single
 * item when the text doesn't break into tiers — callers can then choose to
 * render it as prose instead of a one-item list.
 */
export function rewardBullets(summary?: string | null): string[] {
  if (!summary) return [];
  const s = summary.trim();
  if (!s || NO_DATA.test(s)) return [];

  const bullets: string[] = [];
  // Sentences first (a bonus/"Receive …" clause becomes its own bullet),
  // then earn tiers within each sentence. The lookbehinds keep abbreviation
  // periods intact — "U.S. supermarkets" and "Gap Inc. family of brands"
  // are not sentence boundaries.
  for (const sentence of s.split(/(?<!\b[A-Z])(?<!\b(?:Inc|Ltd|Corp|Co|No|etc))\.\s+/)) {
    const cleaned = sentence.replace(/^earn\s+(?:a\s+)?/i, '').trim();
    if (!cleaned) continue;
    for (const tier of cleaned.split(BOUNDARY)) {
      const b = tidy(tier);
      if (b) bullets.push(b);
    }
  }
  return bullets;
}
