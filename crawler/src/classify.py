"""
classify.py — Stage 3 of the pipeline: is this a single-card product page,
a catalog/compare page, or something else entirely?

Two-pass approach:
  Pass A (heuristic, free): URL shape + H1 count + CTA count. Kills most
    obvious non-product pages without spending any API calls.
  Pass B (LLM, cheap model): anything that survives Pass A gets a real
    semantic judgment call, because "product page vs. catalog page" varies
    enough by site design that pattern matching alone is unreliable.
"""
import logging
from dataclasses import dataclass

from src.config import settings
from src.fetch import fetch_page, count_h1_and_ctas
from src.llm_client import complete_json

logger = logging.getLogger("classify")


@dataclass
class ClassificationResult:
    url: str
    page_type: str  # "single_card" | "catalog" | "other"
    card_name: str | None
    confidence: float
    raw_html: str | None = None
    cleaned_text: str | None = None


def heuristic_prefilter(html: str) -> bool:
    """Returns True if the page PASSES the cheap filter and should proceed
    to LLM classification. Returns False to reject immediately for free."""
    h1_count, cta_count = count_h1_and_ctas(html)
    # A single-card page should have exactly one H1 (the card name). Catalog
    # pages tend to have many H1s (one per card listed). The CTA count is a
    # weak signal — real product pages legitimately repeat "Apply Now" across
    # hero/sticky/footer (Discover's card pages have 5-6), so the cap is only
    # a coarse guard against huge listing pages; the LLM classifier is the
    # real catalog-vs-single-card gate and reliably rejects catalogs.
    if h1_count == 0 or h1_count > 2:
        return False
    if cta_count > 12:
        return False
    return True


CLASSIFY_PROMPT = """You are classifying a webpage from a credit card issuer's website.

URL: {url}

Page content (may be truncated):
---
{text}
---

Determine which category this page falls into:
- "single_card": the page is dedicated to ONE specific credit card product \
(e.g. "Chase Sapphire Preferred® Card"), with details like fees, rewards, or APR for that one card.
- "catalog": the page lists or compares MULTIPLE credit card products \
(e.g. "Compare all Chase cards", "Browse our credit cards").
- "other": anything else — blog post, help/support article, login page, \
application form, legal/terms page, homepage, etc.

Respond with ONLY a JSON object, no other text:
{{"type": "single_card" | "catalog" | "other", "card_name": "<exact product name or null>", "confidence": <0.0-1.0>}}
"""


def llm_classify(url: str, text: str) -> ClassificationResult:
    truncated = text[:4000]
    try:
        parsed = complete_json(
            CLASSIFY_PROMPT.format(url=url, text=truncated),
            model=settings.classify_model,
            max_tokens=200,
        )
        return ClassificationResult(
            url=url,
            page_type=parsed.get("type", "other"),
            card_name=parsed.get("card_name"),
            confidence=float(parsed.get("confidence", 0.0)),
        )
    except Exception as e:
        logger.warning(f"classification failure for {url}: {e}")
        return ClassificationResult(url=url, page_type="other", card_name=None, confidence=0.0)


def classify_url(url: str, cached: dict | None = None, render: bool = False) -> ClassificationResult:
    """Full classification pipeline for a single URL: fetch -> heuristic
    prefilter -> LLM classification. Returns a result even on rejection
    so callers can log why.

    `cached` is a prior verdict for this URL from the crawl cache (see
    src/cache.py). A cached non-card verdict skips even the fetch; a cached
    single_card verdict still fetches the page (extraction downstream needs
    its content) but skips the LLM call."""
    if cached is not None and cached.get("page_type") != "single_card":
        return ClassificationResult(
            url=url,
            page_type=cached["page_type"],
            card_name=cached.get("card_name"),
            confidence=cached.get("confidence", 1.0),
        )

    html, text = fetch_page(url, render=render)
    if html is None:
        return ClassificationResult(url=url, page_type="other", card_name=None, confidence=0.0)

    if cached is not None:
        result = ClassificationResult(
            url=url,
            page_type="single_card",
            card_name=cached.get("card_name"),
            confidence=cached.get("confidence", 1.0),
            raw_html=html,
            cleaned_text=text,
        )
        logger.info(f"[single_card:cached] {url} -> {result.card_name}")
        return result

    if not heuristic_prefilter(html):
        logger.debug(f"[reject:heuristic] {url}")
        return ClassificationResult(url=url, page_type="other", card_name=None, confidence=1.0)

    result = llm_classify(url, text)
    result.raw_html = html
    result.cleaned_text = text
    logger.info(f"[{result.page_type}:{result.confidence:.2f}] {url} -> {result.card_name}")
    return result


def classify_batch(urls: list[str], cache: dict | None = None, render: bool = False) -> list[ClassificationResult]:
    """Classify a list of URLs, returning only confident single_card results.
    Keeps rejected ones out of the return value but logs counts for visibility.

    When a crawl cache is passed, cached verdicts are reused and fresh
    confident verdicts are written back into it (mutated in place; the
    caller owns persisting it). Low-confidence results — fetch failures,
    LLM errors — are deliberately NOT cached so they retry next run."""
    url_cache = cache["urls"] if cache is not None else {}
    results = []
    llm_skipped = 0
    for u in urls:
        cached = url_cache.get(u)
        result = classify_url(u, cached=cached, render=render)
        if cached is not None:
            llm_skipped += 1
        elif cache is not None and result.confidence >= 0.6:
            url_cache[u] = {
                "page_type": result.page_type,
                "card_name": result.card_name,
                "confidence": result.confidence,
            }
        results.append(result)

    accepted = [r for r in results if r.page_type == "single_card" and r.confidence >= 0.6]
    logger.info(
        f"classified {len(urls)} URLs -> {len(accepted)} accepted single-card pages"
        + (f" ({llm_skipped} verdicts from cache)" if llm_skipped else "")
    )
    return accepted
