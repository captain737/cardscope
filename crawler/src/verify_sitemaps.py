"""
verify_sitemaps.py — one-off utility, NOT part of the daily pipeline.

Checks robots.txt for every provider in providers.yaml and reports whether
the configured `sitemap:` URL actually matches what the site declares, so
you catch stale/guessed URLs (like the Amex one that turned out to be
en-us/sitemap.xml when it should have been index-sitemap.xml) before they
cause silent zero-URL discovery failures in production.

Usage:
    python -m src.verify_sitemaps
"""
import re
import xml.etree.ElementTree as ET

import requests

from src.config import settings

HEADERS = {"User-Agent": settings.user_agent}


def get_declared_sitemaps(base_url: str) -> list[str]:
    robots_url = base_url.rstrip("/") + "/robots.txt"
    try:
        resp = requests.get(robots_url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return []
    except requests.RequestException:
        return []
    return re.findall(r"(?i)sitemap:\s*(\S+)", resp.text)


def check_root_tag(url: str) -> str | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return f"HTTP {resp.status_code}"
        root = ET.fromstring(resp.content)
        tag = root.tag.split("}")[-1]  # strip XML namespace
        return tag  # "urlset" or "sitemapindex"
    except ET.ParseError:
        return "not valid XML"
    except requests.RequestException as e:
        return f"error: {e}"


def main():
    providers = settings.load_providers()
    print(f"{'provider':<18} {'configured URL matches robots.txt?':<38} {'actual root tag':<20} {'is_index in config?'}")
    print("-" * 100)

    for p in providers:
        name = p["name"]
        configured = p.get("sitemap")
        if not configured:
            print(f"{name:<18} {'N/A (uses fallback_hub)':<38}")
            continue

        declared = get_declared_sitemaps(p["base_url"])
        matches = "YES" if configured in declared else (
            f"NO — robots.txt says: {declared}" if declared else "robots.txt has no Sitemap: line"
        )

        actual_tag = check_root_tag(configured)
        expected_tag = "sitemapindex" if p.get("sitemap_index") else "urlset"
        tag_ok = "OK" if actual_tag == expected_tag else f"MISMATCH (config says {expected_tag})"

        print(f"{name:<18} {matches:<38} {actual_tag or 'N/A':<20} {tag_ok}")


if __name__ == "__main__":
    main()
