-- CardScope database schema
--
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
-- Design notes:
--   - `cards` is the "latest.json" equivalent: one row per card URL, kept
--     up to date in place. It's what the cardscope frontend reads.
--   - `card_history` is an append-only log of every daily run, mirroring
--     data/{provider}/history/{date}.json — useful for auditing/rollback,
--     not read by the frontend.
--   - `card_rejections` mirrors data/{provider}/history/{date}_rejected.json
--     so you can see what failed validation and why, without it ever
--     reaching the published table.
--   - RLS is enabled with a public read-only policy on `cards`. Writes are
--     only ever performed by the crawler using the service_role key, which
--     bypasses RLS by design -- never expose the service_role key to the
--     frontend, only the anon key.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- cards: current published state, one row per product URL
-- ---------------------------------------------------------------------
create table if not exists cards (
  id                        uuid primary key default gen_random_uuid(),
  url                       text not null unique,
  provider                  text not null,
  card_name                 text,
  issuer                    text,
  annual_fee                numeric,
  apr_range                 text,
  rewards_summary           text,
  signup_bonus              text,
  recommended_credit_score  text,
  foreign_transaction_fee   text,
  extraction_method         text,
  extraction_confidence     numeric,
  validation_flags          jsonb not null default '[]'::jsonb,
  tags                      text[] not null default '{}'::text[],
  best_for                  text,
  top_perk                  text,
  image_url                 text,
  is_active                 boolean not null default true,
  first_seen_at             timestamptz not null default now(),
  last_seen_at              timestamptz not null default now(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists cards_provider_idx on cards (provider);
create index if not exists cards_is_active_idx on cards (is_active);
create index if not exists cards_tags_idx on cards using gin (tags);

-- keep updated_at current on every write
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists cards_set_updated_at on cards;
create trigger cards_set_updated_at
  before update on cards
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------
-- card_history: append-only snapshot per crawl run (auditing/rollback)
-- ---------------------------------------------------------------------
create table if not exists card_history (
  id          bigint generated always as identity primary key,
  run_date    date not null default current_date,
  url         text not null,
  provider    text not null,
  snapshot    jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists card_history_provider_date_idx
  on card_history (provider, run_date);

-- ---------------------------------------------------------------------
-- card_rejections: records that failed validation, for debugging
-- ---------------------------------------------------------------------
create table if not exists card_rejections (
  id                bigint generated always as identity primary key,
  run_date          date not null default current_date,
  url               text not null,
  provider          text not null,
  rejection_reason  text,
  snapshot          jsonb not null,
  created_at        timestamptz not null default now()
);

create index if not exists card_rejections_provider_date_idx
  on card_rejections (provider, run_date);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table cards enable row level security;
alter table card_history enable row level security;
alter table card_rejections enable row level security;

-- Public (anon + authenticated) can read active, published cards only.
drop policy if exists "public read active cards" on cards;
create policy "public read active cards"
  on cards for select
  to anon, authenticated
  using (is_active = true);

-- No insert/update/delete/select policies are defined for anon on
-- card_history/card_rejections or for writes on cards -- only the
-- service_role key (used solely by the crawler, never the frontend)
-- can touch those, since service_role bypasses RLS entirely.
