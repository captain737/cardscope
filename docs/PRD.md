# Product Requirements Document (PRD) — CardFit Feature Enhancements

> Source spec for CardFit's feature roadmap. Tracks what's built vs. planned.

## Objective
Improve CardFit's usefulness, transparency, and user retention by making
recommendations more personalized, searchable, and easier to understand —
without adding friction or turning the product into a marketing site.

## Build status (as of this commit)
| Feature | PRD Phase | Status |
|---|---|---|
| **F1 Smart Search** — NL → filters, issuer/segment aware | 1 | ✅ AISearchBar + `parse-search` Edge Function + issuer aliases (`cardSearch.ts`) |
| **F5 Smart Recommendation Explanations** — "Why this card", tradeoffs | 1 | ✅ "Why this fits you" bullets + AI advisor note; tradeoffs via `insights.ts` |
| **F4 Recently Viewed Cards** — last 5–10, persisted | 1 | ✅ `recentlyViewed.ts` + Compare rail + carousel tracking |
| **F2 Enhanced Card Profiles** — pros/cons, best-for, approval, reward examples, redemption, similar | 2 | ✅ Deterministic profile via `insights.ts` + `CardInsightsPanel` (full card *pages* still future) |
| **F3 Contextual Guidance** — fee break-even, first-year value, no-fee tradeoff | 2 | ✅ `insights.ts` contextual insights |

Deferred / future: offer-vs-historical-average insights (needs price history),
dedicated per-card routes/pages, "why this beats Card B" head-to-head ranking,
Supabase-synced recently-viewed for signed-in users.

---

## Feature 1: Smart Search
Natural-language search → structured filters/recommendations. Parse annual fee,
reward category, issuer, card type, user segment. Show interpreted filters so
users can edit. Fall back gracefully on ambiguity.

## Feature 2: Enhanced Card Profiles
Overview, Pros & Cons, Best For, Not Ideal For, Approval Difficulty, Reward
Examples ("$500/mo groceries → ~X/yr"), Redemption Options, Similar
Alternatives, Frequently Compared Cards.

## Feature 3: Contextual Recommendation Guidance
Per-card insights: annual-fee break-even, offer-vs-historical, estimated
first-year value, no-fee-version tradeoff.

## Feature 4: Recently Viewed Cards
Last 5–10 cards viewed; persist across sessions (localStorage for anon,
Supabase for signed-in); removable.

## Feature 5: Smart Recommendation Explanations
"Why this card?", ranking comparisons ("why this beats Card B"), tradeoff
indicators, recommendation score, best-fit indicators, similar alternatives.

---

## Long-Term Vision
CardFit evolves from a searchable card database into an intelligent
recommendation platform that identifies the best card, explains the reasoning
behind every recommendation, highlights tradeoffs, and educates users through
the decision.
