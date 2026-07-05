"""
render.py — optional headless-browser fetch for JS-rendered issuer pages.

Some issuers inject content via JavaScript that a static HTTP fetch never
sees. The clearest case is Discover: the real flat card-art image
(`cardart-...-620-382.png`) is lazy-loaded on scroll via an
IntersectionObserver, so neither `requests` nor a plain render surfaces it —
only rendering the page AND scrolling it does. Bank of America / Amex hide
their product links behind JS the same way.

For providers flagged `render_js: true` in providers.yaml, fetch_page routes
through render_html() here: load in headless Chromium, scroll top-to-bottom
to trip lazy-loaders, then return the settled HTML.

Playwright + Chromium are optional deps:
    pip install playwright && playwright install chromium
If either is missing, render_html() returns None and fetch_page falls back
to the static request — the crawler still runs, just without JS rendering.
"""
import logging

from src.config import settings

logger = logging.getLogger("render")

_pw = None
_browser = None


def _get_browser():
    global _pw, _browser
    if _browser is None:
        from playwright.sync_api import sync_playwright
        _pw = sync_playwright().start()
        _browser = _pw.chromium.launch(args=["--no-sandbox"])
    return _browser


def render_html(url: str) -> str | None:
    """Fully-rendered HTML (post-JS, post-scroll), or None on any failure so
    the caller can fall back to a static fetch."""
    try:
        browser = _get_browser()
    except Exception as e:
        logger.warning(f"playwright unavailable ({e}) — install with "
                       f"`pip install playwright && playwright install chromium`")
        return None

    page = None
    try:
        page = browser.new_page(
            viewport={"width": 1400, "height": 1000},
            user_agent=settings.user_agent,
        )
        # networkidle never settles on ad/analytics-heavy issuer sites, so we
        # wait for the DOM and then drive lazy-loading manually by scrolling.
        page.goto(url, wait_until="domcontentloaded", timeout=settings.render_timeout_ms)
        for _ in range(settings.render_scroll_steps):
            page.mouse.wheel(0, 800)
            page.wait_for_timeout(250)
        page.wait_for_timeout(settings.render_settle_ms)
        return page.content()
    except Exception as e:
        logger.warning(f"render failed for {url}: {e}")
        return None
    finally:
        if page is not None:
            try:
                page.close()
            except Exception:
                pass


def close_browser() -> None:
    """Tear down the shared browser at the end of a run."""
    global _pw, _browser
    if _browser is not None:
        try:
            _browser.close()
        except Exception:
            pass
    if _pw is not None:
        try:
            _pw.stop()
        except Exception:
            pass
    _browser = None
    _pw = None
