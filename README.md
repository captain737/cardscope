# CardScope

A credit-card discovery tool: browse, filter, and compare cards, or take a
short "Find Me a Card" quiz to get ranked, personalized matches. Card data
is collected automatically from issuer websites by the crawler and served
to the frontend through Supabase.

This repository is a monorepo with two parts:

```
cardscope/
├── web/        # React + Vite + Tailwind frontend (reads cards from Supabase)
└── crawler/    # Python pipeline that scrapes issuer sites and publishes to Supabase
```

## How it fits together

```
issuer websites  ──▶  crawler (discover → classify → extract → validate)
                              │
                              ▼
                        Supabase  (cards table)
                              │
                              ▼
                        web  (browse · Find Me a Card · Compare)
```

The crawler writes to the `cards` table; the web app reads from it with a
public read-only key. Neither piece needs the other running to develop —
the frontend falls back to built-in mock cards when Supabase isn't configured.

## Quick start

Both parts need environment variables. Copy the templates and fill them in
(never commit the real `.env` files — they're gitignored):

```bash
cp web/.env.example web/.env
cp crawler/.env.example crawler/.env
```

### Frontend (`web/`)

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the public anon
key). Without them the app runs on mock data.

### Crawler (`crawler/`)

```bash
cd crawler
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m src.pipeline --provider chase   # test one issuer
.venv/bin/python -m src.pipeline                     # run all enabled
```

Requires a free LLM key (`GROQ_API_KEY`, with `LLM_PROVIDER=groq`) plus
`SUPABASE_URL` and the `SUPABASE_SERVICE_KEY` (server-side only — never ship
this to the browser). Run `crawler/supabase/schema.sql` in your Supabase SQL
editor once before the first crawl.

See `crawler/README.md` for the full pipeline design, provider config, and
cost/rate-limit notes.

## Database

One-time setup: run `crawler/supabase/schema.sql` in Supabase. It creates the
`cards`, `card_history`, and `card_rejections` tables with row-level security
(public can read active cards; only the crawler's service key can write).
