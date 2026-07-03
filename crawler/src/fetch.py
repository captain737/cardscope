"""
fetch.py — shared page-fetching and text-cleaning helper.

Both classify.py and extract.py need the same "get me the readable text
of this page" logic, so it lives here once rather than being duplicated
(and drifting) in two places.
"""
import logging
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from src.config import settings

logger = logging.getLogger("fetch")
HEADERS = {"User-Agent": settings.user_agent}


def fetch_page(url: str) -> tuple[str | None, str | None]:
    """Returns (raw_html, cleaned_text) or (None, None) on failure."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=settings.request_timeout_s)
        resp.raise_for_status()
    except requests.RequestException as e:
        logger.warning(f"fetch failed for {url}: {e}")
        return None, None
    finally:
        time.sleep(settings.request_delay_s)  # politeness delay regardless of outcome

    html = resp.text
    cleaned = clean_html_to_text(html)
    return html, cleaned


def clean_html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "svg", "noscript", "iframe"]):
        tag.decompose()
    # collapse whitespace, keep it readable for the LLM
    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line]
    return "\n".join(lines)


# Asset filename/path fragments that are never a single flat card face:
# nav banners, multi-card arrays, logos, angled 3D photos, digital-wallet
# marketing (phone/device renders), etc. Rotating an angled photo or a
# banner 90deg in the frontend is exactly what produced the "sideways"
# and garbled images, so we drop these outright.
_IMAGE_BLOCKLIST = (
    "banner", "array", "logo", "hero", "device", "sphere", "half-sphere",
    "apple", "google-pay", "googlepay", "paypal", "wallet", "icon",
    "angle", "angled", "photo-", "-photo", "lifestyle", "background",
)


def _is_bad_asset(src: str) -> bool:
    s = src.lower()
    return s.split("?")[0].endswith(".svg") or any(term in s for term in _IMAGE_BLOCKLIST)


def extract_card_image(html: str, page_url: str) -> str | None:
    """Best-effort *flat card-art* URL from a product page — no LLM involved.

    Signal strength, strongest first:
      1. An <img> served from a dedicated card-art asset path (Chase et al.
         use /card-art/ directories — the most reliable signal there is).
      2. og:image / twitter:image social-preview meta, which issuer product
         pages usually point at the card art.
      3. Any raster <img> with "card" in its alt text or src.
    Blocklisted assets (banners, card arrays, logos, angled photos, device
    marketing, SVG icons) are skipped throughout. Returns an absolute URL,
    or None — the frontend renders its stylized gradient face whenever this
    is missing, so None is always the safe fallback.
    """
    soup = BeautifulSoup(html, "html.parser")

    scored: list[tuple[int, str]] = []
    for img in soup.find_all("img", src=True):
        src = img["src"]
        if _is_bad_asset(src):
            continue
        alt = (img.get("alt") or "").lower()
        src_l = src.lower()
        score = 0
        if "card-art" in src_l or "card_art" in src_l or "cardart" in src_l:
            score += 4
        if "card" in alt:
            score += 2
        if "card" in src_l:
            score += 1
        if score:
            scored.append((score, src))

    if scored and max(s for s, _ in scored) >= 4:
        best = max(scored, key=lambda t: t[0])[1]
        return urljoin(page_url, best)

    for prop in ("og:image", "twitter:image"):
        tag = soup.find("meta", attrs={"property": prop}) or soup.find("meta", attrs={"name": prop})
        content = tag.get("content") if tag else None
        if content and not _is_bad_asset(content):
            return urljoin(page_url, content)

    if scored:
        best = max(scored, key=lambda t: t[0])[1]
        return urljoin(page_url, best)

    return None


def count_h1_and_ctas(html: str) -> tuple[int, int]:
    soup = BeautifulSoup(html, "html.parser")
    h1_count = len(soup.find_all("h1"))
    cta_count = len(
        soup.find_all(string=lambda s: s and "apply now" in s.lower())
    )
    return h1_count, cta_count
