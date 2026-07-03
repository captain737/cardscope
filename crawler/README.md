# Credit Card Crawler

Automated daily pipeline that discovers, classifies, extracts, and validates
credit card product data from major issuer websites — no admin input needed
for routine operation.

## Architecture

```
providers.yaml (curated seed list)
        │
        ▼
┌───────────────┐   sitemap.xml or hub-page crawl, URL pattern filter
│  discovery.py │   → candidate URLs (still unfiltered by content)
└───────┬───────┘
        ▼
┌───────────────┐   heuristic prefilter (H1/CTA count) + LLM classification
│  classify.py  │   → confirmed single-card product pages only
└───────┬───────┘
        ▼
┌───────────────┐   optional hand-written CSS selectors (top issuers)
│  extract.py   │   + LLM extraction as default/fallback
└───────┬───────┘   → structured CardData (fee, APR, rewards, etc.)
        ▼
┌───────────────┐   range checks + day-over-day anomaly detection
│  validate.py  │   → accepted / rejected, with flags
└───────┬───────┘
        ▼
┌───────────────┐   JSON storage, dated history, raw HTML snapshots
│  storage.py   │
└───────┬───────┘
        ▼
┌───────────────┐   Slack alert only when something needs a human
│  notify.py    │
└───────────────┘
```

Orchestrated end-to-end by `pipeline.py`, run daily via GitHub Actions
(`.github/workflows/daily_scrape.yml`).

## Why this design

- **Sitemaps over blind crawling.** Sitemaps are structured and far more
  stable than parsing nav menus, which break on every redesign.
- **Two-pass classification.** A free heuristic pass (URL shape, H1/CTA
  counts) eliminates most junk before any LLM call. The LLM pass handles
  the genuinely ambiguous cases — "is this one card or a comparison of
  five" is a semantic judgment that varies by site design, which is
  exactly where pattern matching alone gets unreliable.
- **Never auto-publish blind.** `validate.py` hard-rejects implausible
  values (APR of 200%, a $50,000 annual fee) and soft-flags large
  day-over-day swings for review, rather than either blocking the whole
  run or silently trusting bad extractions.
- **LLM extraction by default, selectors as an optimization.** Every
  provider gets LLM-based structured extraction out of the box. You can
  register faster/cheaper hand-written CSS selectors per issuer in
  `extract.py`'s `SELECTOR_EXTRACTORS` once you've validated them against
  live pages — this is optional, not required to launch.
- **Alerts only on real signal.** No admin input is needed for normal
  operation, but you'll get a Slack ping if a provider returns zero URLs,
  classification finds zero product pages, or the reject rate spikes —
  all signs a site redesigned and something needs a fix.

## LLM provider (free tier)

This crawler uses a free LLM backend for classification and extraction —
no paid API required. Two options, switchable via one env var:

| | Gemini (default) | Groq |
|---|---|---|
| Free key | https://aistudio.google.com/apikey | https://console.groq.com/keys |
| Approx. free daily volume | ~1,000-1,500 req/day (Flash-Lite) | ~1,000 req/day per model |
| Notes | Free-tier prompts may be used by Google for training | Not used for training; very fast inference |

Set in `.env`:
```bash
LLM_PROVIDER=gemini          # or "groq"
GEMINI_API_KEY=your-key-here # or GROQ_API_KEY if using groq
```

Free-tier rate limits change fairly often on both platforms — check the
provider's current published limits before relying on exact numbers here.
`src/llm_client.py` paces calls (`LLM_CALL_DELAY_S`) and retries with
backoff on 429s as a safety net regardless of the current limit.

For ~10 providers × ~60 candidate URLs each, expect roughly 400-700
classification calls and 50-200 extraction calls per daily run — comfortably
within free tier for either provider, but pacing means a full run takes a
while (calls are deliberately spaced out, not fired concurrently).

## Setup

```bash
git clone <this-repo>
cd credit-card-crawler
pip install -r requirements.txt
cp .env.example .env   # fill in GEMINI_API_KEY (or GROQ_API_KEY) at minimum
```

Test a single provider before running everything:

```bash
python -m src.pipeline --provider chase
```

Run the full pipeline:

```bash
python -m src.pipeline
```

## Automating the daily run

The included GitHub Actions workflow (`.github/workflows/daily_scrape.yml`)
runs the pipeline every morning at 9:00 AM UTC, commits updated data back to
the repo under `data/`, and uploads logs as a build artifact. To enable it:

1. Add `GEMINI_API_KEY` (and optionally `SLACK_WEBHOOK_URL`) as repo
   secrets under **Settings → Secrets and variables → Actions**.
2. Push to GitHub — the schedule activates automatically.
3. Trigger a manual test run anytime from the **Actions** tab
   ("Run workflow" button) without waiting for the 9 AM schedule.

## Data output

```
data/{provider}/latest.json           # current published state — read this from your frontend
data/{provider}/history/{date}.json   # full snapshot per day, for auditing/rollback
data/{provider}/history/{date}_rejected.json  # what got rejected and why
data/{provider}/raw/{card-slug}.html  # last raw HTML fetched, for debugging extraction
```

`latest.json` is a flat array of card records:

```json
[
  {
    "url": "https://creditcards.chase.com/cards/sapphire-preferred",
    "provider": "chase",
    "card_name": "Chase Sapphire Preferred® Card",
    "issuer": "Chase",
    "annual_fee": 95,
    "apr_range": "19.99%-27.99% Variable",
    "rewards_summary": "5x on travel through Chase Travel, 3x on dining...",
    "signup_bonus": "60,000 bonus points after spending $4,000 in 3 months",
    "recommended_credit_score": "Good/Excellent",
    "foreign_transaction_fee": "None",
    "extraction_method": "llm",
    "extraction_confidence": 0.92,
    "validation_flags": []
  }
]
```

## Database (Supabase)

`storage.py` writes flat-file JSON under `data/` unconditionally (fast to
run locally, easy to diff in git) and *also* publishes accepted records to
a Supabase Postgres database when `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`
are set in `.env` — that database is what the cardscope frontend reads
from directly, so this is the crawler's actual production storage path.

Setup:

1. Create a project at https://supabase.com (free tier is enough).
2. Dashboard → SQL Editor → paste and run `supabase/schema.sql` (creates
   `cards`, `card_history`, `card_rejections`, and read-only RLS policies).
3. Dashboard → Project Settings → API → copy the **Project URL** and the
   **service_role** secret key into `.env` as `SUPABASE_URL` and
   `SUPABASE_SERVICE_KEY`. The service_role key bypasses Row Level
   Security so the crawler can write — never put it in the frontend; the
   frontend only ever uses the public **anon** key for read-only access.
4. Run the pipeline as usual (`python -m src.pipeline`) — accepted records
   are upserted into `cards` by URL, tagged via `src/tagging.py`
   (`tags`, `best_for`, `top_perk` — the fields issuer pages don't state
   explicitly), and cards no longer seen for a provider are marked
   `is_active = false` rather than deleted, so history stays intact.

If `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` aren't set, the crawler runs
exactly as before, writing only to `data/`. The public interface
(`load_latest`, `save_run`, `save_rejections`) is unchanged either way.

## Adding a new provider

1. Add an entry to `config/providers.yaml` with `sitemap` (preferred) or
   `fallback_hub`, plus `url_include`/`url_exclude` patterns.
2. Set `enabled: false` initially and run with `--provider <name>` to
   inspect discovery/classification/extraction output before trusting it
   in the daily run.
3. Flip to `enabled: true` once you've spot-checked a few extracted cards
   against the live page.

## Legal note

Check `robots.txt` (the crawler does this automatically and skips
disallowed providers) and each issuer's terms of use before scraping — some
financial sites explicitly prohibit automated collection. Also worth
evaluating whether an official affiliate/data-feed API exists for major
issuers before scraping their sites directly; that can be more stable than
scraping and may be required by their ToS anyway.
