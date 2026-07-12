"""
refresh_apr.py — targeted re-scrape of ONLY the APR fields for every active
card, without re-running the full discover→classify→extract pipeline.

For each active card in Supabase it:
  1. fetches the product page (headless render for providers that need it),
  2. runs one small LLM call to pull apr_intro / apr_regular / apr_range,
  3. updates just those three columns on the card's row.

Nothing else on the row is touched, so it can't disturb names, images,
rewards, tags, or the active/soft-delete state.

Usage:
    python -m scripts.refresh_apr --dry-run           # fetch+extract, print, NO writes
    python -m scripts.refresh_apr --dry-run --limit 5 # just the first 5
    python -m scripts.refresh_apr --provider chase    # one provider, writes
    python -m scripts.refresh_apr                      # all active cards, writes

Per the project's cost rule, run this on Groq (LLM_PROVIDER=groq) — it's an
update check, not a fresh seed.
"""
import argparse
import logging
import sys

from src.config import settings
from src.fetch import fetch_page
from src.extract import extract_apr_only

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("refresh_apr")


def _render_flags() -> dict[str, bool]:
    """provider name -> whether it needs headless rendering."""
    return {p["name"]: p.get("render_js", False) for p in settings.load_providers()}


def _active_cards(client, provider: str | None) -> list[dict]:
    q = client.table("cards").select("id,url,provider,apr_range").eq("is_active", True)
    if provider:
        q = q.eq("provider", provider)
    return q.execute().data or []


def main() -> int:
    ap = argparse.ArgumentParser(description="Refresh only APR fields for active cards.")
    ap.add_argument("--dry-run", action="store_true", help="fetch + extract + print, but do not write to Supabase")
    ap.add_argument("--provider", help="limit to a single provider slug (e.g. chase)")
    ap.add_argument("--limit", type=int, help="only process the first N cards")
    args = ap.parse_args()

    if not settings.supabase_enabled:
        logger.error("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY). Aborting.")
        return 1

    from src.storage import _get_supabase_client
    client = _get_supabase_client()
    render = _render_flags()

    cards = _active_cards(client, args.provider)
    if args.limit:
        cards = cards[: args.limit]
    logger.info(f"{'DRY RUN — ' if args.dry_run else ''}refreshing APR for {len(cards)} active card(s) "
                f"using LLM_PROVIDER={settings.llm_provider}.")

    updated = failed = 0
    for i, card in enumerate(cards, 1):
        url, provider = card["url"], card.get("provider", "")
        try:
            _, text = fetch_page(url, render=render.get(provider, False))
            if not text:
                logger.warning(f"[{i}/{len(cards)}] no page text for {url}; skipping")
                failed += 1
                continue
            apr = extract_apr_only(url, text)
            logger.info(f"[{i}/{len(cards)}] {provider} {url}\n"
                        f"    intro   : {apr.get('apr_intro')!r}\n"
                        f"    regular : {apr.get('apr_regular')!r}")
            if not args.dry_run:
                client.table("cards").update({
                    "apr_intro": apr.get("apr_intro"),
                    "apr_regular": apr.get("apr_regular"),
                    "apr_range": apr.get("apr_range"),
                }).eq("id", card["id"]).execute()
            updated += 1
        except Exception as e:  # noqa: BLE001 — one bad page shouldn't halt the batch
            logger.warning(f"[{i}/{len(cards)}] failed for {url}: {e}")
            failed += 1

    verb = "would update" if args.dry_run else "updated"
    logger.info(f"Done. {verb} {updated} card(s), {failed} failure(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
