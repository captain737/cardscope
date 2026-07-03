---
name: CardScope
description: A premium fintech card comparison tool with the confidence of an established issuer
colors:
  bg: "#020202"
  surface: "#0D0C0B"
  surface-raised: "#171614"
  border: "#2A2927"
  border-strong: "#3D3B37"
  ink: "#F3F1F0"
  muted: "#95928E"
  primary: "#DC932E"
  primary-deep: "#BB6802"
  accent: "#0096B8"
  accent-deep: "#00708A"
  success: "#54B05A"
  danger: "#DE4E4B"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.25rem, 5vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "normal"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 2.5vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    typography: "{typography.title}"
    rounded: "{rounded.full}"
    padding: "12px 28px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.bg}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "12px 28px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  badge-status:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: CardScope

## 1. Overview

**Creative North Star: "Midnight Gold"**

CardScope should feel like handling a premium metal card in low light: a near-black surface, precise typography, and a single warm gold accent that catches like brushed metal rather than shouting like a gradient. The reference points are Chase, Amex, Stripe, and Brex — institutions whose interfaces earn trust through restraint, not decoration. Every screen should read as something a real card issuer shipped, not a prototype.

This system explicitly rejects the saturated fuchsia/cyan gradient-and-glow language and the geometric-startup Space Grotesk display face the product launched with — that combination reads as a hackathon demo, not a financial product a user would trust with a credit decision. It also rejects cold, purely monochrome "enterprise bank" austerity: gold is used deliberately, not sparingly to the point of disappearing, so the product still feels warm and human.

Density serves three audiences at once (first-time cardholders, everyday comparison shoppers, points/miles enthusiasts): numbers and facts are always legible and scannable first, decoration second. Structure and page flow are unchanged from the current build — this system governs surface, color, type, elevation, and component finish only.

**Key Characteristics:**
- Near-black surface (`bg` / `surface` / `surface-raised`), zero hue tint — the mood lives in the accent, not the background.
- One warm gold `primary` used deliberately (CTAs, active states, key highlights) — never as a background wash.
- One cool `accent` (steel-teal) reserved for status/informational pills, distinct from `primary` in both hue and role.
- Single grotesk family (Inter) for both display and body, at real weight contrast — no second display face.
- Subtle 1px borders (`border`) replace neon glow as the primary way cards separate from the surface; glow is reserved for one focal element at a time.
- Pill shapes for buttons and filters, rounded-lg/xl cards, consistent radius scale throughout.

## 2. Colors

Restrained strategy: near-pure neutrals carry the surface, gold carries the brand, teal carries status. No warmth in the background — warmth comes entirely from `primary`.

### Primary
- **Brushed Gold** (`#DC932E` / `oklch(0.72 0.14 70)`): the single brand color. Primary buttons, active/selected states, focus accents, key numerals (annual fee, APR) when they need to stand out, the "Apply Now" CTA. Used deliberately, never as a fill for large surfaces.
- **Brushed Gold, Deep** (`#BB6802` / `oklch(0.60 0.14 60)`): hover/pressed state for anything filled with Brushed Gold.

### Secondary / Accent
- **Steel Teal** (`#0096B8` / `oklch(0.62 0.12 220)`): status and informational pills — filter chips when active in a secondary context, "verified data" indicators, links. Distinct hue and role from gold so the two never compete for the same meaning.
- **Steel Teal, Deep** (`#00708A` / `oklch(0.50 0.10 220)`): hover/pressed state for Steel Teal fills.

### Semantic
- **Success** (`#54B05A` / `oklch(0.68 0.15 145)`): positive states only — "no annual fee," successful watchlist add. Always paired with an icon or label, never color alone.
- **Danger** (`#DE4E4B` / `oklch(0.62 0.18 25)`): errors and destructive actions only.

### Neutral
- **Void** (`#020202` / `oklch(0.09 0 0)`): page background. True near-black, zero chroma.
- **Surface** (`#0D0C0B` / `oklch(0.155 0.003 70)`): card and panel backgrounds. A hair above `bg`, carrying a whisper of the gold hue so it never reads cold-blue-black.
- **Surface Raised** (`#171614` / `oklch(0.20 0.004 70)`): nested surfaces — hover states, popovers, the search modal.
- **Border** (`#2A2927` / `oklch(0.28 0.004 70)`): default 1px borders. Deliberately low-contrast against `bg` (~1.4:1) — present on close inspection, invisible from a glance, exactly the "subtle border" a premium product uses instead of a shadow.
- **Border Strong** (`#3D3B37`): hover/focus border state, and dividers that need to actually register.
- **Ink** (`#F3F1F0` / `oklch(0.96 0.003 70)`): primary text. 18.4:1 against `bg`.
- **Muted** (`#95928E` / `oklch(0.66 0.006 70)`): secondary text, labels, timestamps. 6.7:1 against `bg` — comfortably above the 4.5:1 floor.

**Text-on-fill rule (verified, not assumed):** both `primary` and `accent` are light/warm enough that white text fails AA against them (2.5:1 and 3.5:1 respectively). Use `bg` (`#020202`) as text color on any `primary` or `accent` fill — 8.2:1 and 6.0:1 respectively. This isn't the generic "saturated fill → white text" default; it was measured for this specific palette and the measurement wins.

## 3. Typography

Serif display over grotesk body: Fraunces (an optical-size serif in the GT Alpina/Mercury-bank tradition) carries display moments — card names, page headings, the wordmark — at weights 500-700 and normal letter-spacing (serifs don't take tight tracking). Inter carries everything functional: body, labels, buttons, data, at real weight contrast (400/500/600/700). JetBrains Mono stays reserved for tabular numerals. The two display/body faces contrast on a real axis (serif vs grotesk), never compete. Space Grotesk remains fully retired.

- **Display** (`clamp(2.25rem, 5vw, 3.5rem)`, weight 700, tracking -0.03em): page-level moments only — not present on most screens in this product, reserved if a hero-style moment is ever needed.
- **Headline** (`clamp(1.5rem, 2.5vw, 2rem)`, weight 600, tracking -0.02em): section titles ("Do you have a credit card right now?", "Your Watchlist").
- **Title** (18px, weight 600, tracking -0.01em): card names, button labels, prominent numerals.
- **Body** (15px, weight 400, line-height 1.55): descriptive copy, card fact values.
- **Label** (11px, weight 600, tracking 0.06em, uppercase): fact labels ("ANNUAL FEE", "REWARDS RATE") and status pills only. This is data labeling, not a decorative section eyebrow — it already exists once per fact card, not stacked above every section.
- **Mono** (13px, JetBrains Mono): card last-4 digits, and any dense tabular figure in the Compare view where numerals benefit from fixed-width alignment.

Font loading: both families already load via the existing Google Fonts `@import` in `index.css`; Space Grotesk's `@import` weight range is removed since it's no longer referenced.

## 4. Elevation

Philosophy: **flat by default, glow as a single focal accent, never ambient.** The previous system applied a saturated colored `shadow-*/40` glow to every card in the deck simultaneously; that's the "everything is trying to be the hero" tell. This system keeps exactly one glow moment (the centered carousel card) and replaces every other card's separation with a 1px `border` plus a neutral, low-opacity shadow.

- **Flat** (default card/panel): `border: 1px solid var(--border)`, no shadow. Cards separate from `bg` by the `surface`/`bg` value step and the border, not by elevation.
- **Raised** (hover state, popovers, the search modal): `border: 1px solid var(--border-strong)` + `shadow-lg` in neutral black at low opacity (`0 8px 30px -8px rgb(0 0 0 / 0.5)`), never colored.
- **Focal glow** (the single centered carousel card only): a soft, low-opacity gold-tinted shadow (`shadow-primary/20`-equivalent, not `/40`), reduced from the current implementation. This is the one place brand color is allowed in a shadow, and only ever on one element at a time.
- **Backdrop blur**: retained for the search modal and nav bar only (`backdrop-blur-xl` + `bg-surface/80`) — glass is a functional device for content-over-content legibility here, not a decorative default applied everywhere.

## 5. Components

Component feel in one phrase: **tactile but quiet** — every interactive element responds (hover, focus, press), but nothing moves or glows unless the user is actually touching it.

- **button-primary**: pill (`rounded-full`), `bg-primary`, `text-bg` (dark text per the verified contrast rule above), weight 600, `12px 28px` padding. Hover → `bg-primary-deep`. This is the single highest-emphasis action per screen ("Apply Now", "Continue", "Find My Matches").
- **button-secondary**: pill, `bg-surface`, `1px solid border`, `text-ink`. Hover → `bg-surface-raised`, `border-strong`. Used for "Watchlist", "Back", "Shuffle Deck".
- **card** (CardFacts fact tiles, Compare rows): `bg-surface`, `1px solid border`, `rounded-lg` (16px), `20px` padding. No shadow at rest.
- **badge-status** (BubbleFilters chips, tag pills): pill, `bg-surface-raised` at rest / `bg-primary` `text-bg` when active — one clear active state, not a gradient wash.
- **card-visual** (the physical credit card render): keeps its existing per-issuer gradient identity (that's product data, not chrome) but the chip, contactless icon, and card-number type move to the shared Ink/Mono tokens instead of ad hoc opacity values, and the surrounding glow is reined in per the Elevation section.
- **nav**: `bg-bg/80` + `backdrop-blur-xl`, `border-b border-border`, no longer relies on glow for definition.
- **inputs / search**: `bg-surface-raised`, `1px solid border`, `rounded-lg`, focus ring in `primary` at 2px offset — focus must always be visible, never removed.
- **icons**: monochrome (`text-muted` at rest, `text-ink` or `text-primary` on active/selected), consistent stroke weight (`lucide-react` defaults), never mixed styles.

## 6. Do's and Don'ts

**Do:**
- Use `primary` (gold) for exactly one action's worth of emphasis per screen. If two things are gold, one of them is wrong.
- Pair every `success`/`danger` use with an icon or label — never color alone.
- Keep borders at `border` (subtle) by default; reserve `border-strong` for hover/focus/active.
- Use dark (`bg`) text on any `primary` or `accent` fill, per the verified contrast rule.
- Let each `CreditCard.gradient` (the physical card art) keep its own identity — that variety is the product's data, not a chrome inconsistency.
- Respect `prefers-reduced-motion`: swap carousel/step transitions for instant or crossfade equivalents.

**Don't:**
- Don't reintroduce Space Grotesk, and don't add faces beyond the committed three (Fraunces display / Inter body / JetBrains Mono numerals).
- Don't apply tight letter-spacing to Fraunces; tracking-tight is an Inter-only device.
- Don't apply the focal glow to more than one card at a time.
- Don't use `background-clip: text` gradient headings — solid `ink` or `primary`, weight/size for emphasis.
- Don't default to `backdrop-blur` on every panel; it's reserved for nav and the search modal/popover layer.
- Don't put muted gray text directly on a `primary` or `accent` fill — always `bg`.
- Don't add a new saturated color without a defined role; this palette is closed at gold + teal + the two semantic colors.
