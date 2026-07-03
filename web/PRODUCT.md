# Product

## Register

product

## Users
CardScope serves anyone shopping for a credit card, across a spread of sophistication: people comparing fees/rewards/APR who don't want to miss a better option or fine print, people newer to credit who want reassurance and clarity over dense jargon, and points/miles enthusiasts who want density and speed over hand-holding. The product has to read as credible and clear to a first-time cardholder while still respecting a power user's time — no single persona is favored over the others. Core flows: browse/shuffle a deck of cards, run the guided "Find My Card" quiz, and compare two cards head-to-head with a watchlist.

## Product Purpose
Helps someone pick a credit card with confidence: see key facts (fee, APR, rewards, bonus, credit needed) at a glance, filter by what matters to them, and compare finalists side by side. Success looks like a user leaving with a clear favorite and no sense they missed something important in the fine print. Card data is sourced by an automated crawler reading real issuer sites, so the product also has to read as trustworthy about where its numbers come from.

## Brand Personality
Premium, trustworthy, refined — institutional fintech confidence in the vein of Chase, Amex, Stripe, and Brex — but warmer and more approachable than a pure enterprise-bank feel. Polished, not cold. Credible without being intimidating.

## Anti-references
Not experimental, gamified, or amateur. The current build leans toward a flashy consumer-app/gaming aesthetic (saturated fuchsia/cyan gradients, heavy glow, a Space Grotesk display face) — that reads as a prototype, not a financial product a user would trust with their credit decisions. Avoid generic SaaS-template default look; avoid anything that feels like a hackathon demo.

## Design Principles
- Institutional confidence over novelty: every visual choice should read as "an established fintech shipped this," not "someone tried something new."
- Serve three literacy levels at once: clear enough for a first-time cardholder, dense enough for a points optimizer, without a mode switch between them.
- Numbers are the product: fees, APR, rewards, and bonuses must be scannable and unambiguous — hierarchy and contrast serve legibility of financial facts first.
- Warm precision, not cold formality: premium and refined, but approachable — avoid austere all-black-and-gold luxury cliché.
- Trustworthy data provenance: since card data comes from a live crawler, the UI should never overstate certainty (e.g. always leave room for "see issuer site" fallbacks) and should feel current, not stale.

## Accessibility & Inclusion
WCAG AA contrast minimum throughout (body text ≥4.5:1, large text ≥3:1). Respect `prefers-reduced-motion` with crossfade/instant alternatives for all animations. No color-only status/state indicators — pair color with icon, label, or text. Solid defaults, no additional specific requirements beyond that.
