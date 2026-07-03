"""
test_offline.py — fast sanity checks that need NO network access and NO
API key. Run this first, every time, before spending any quota on a real
crawl. If anything here fails, the bug is in your logic, not a flaky
website or a rate limit.

Usage:
    python -m pytest tests/test_offline.py -v
or, without pytest installed:
    python tests/test_offline.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import settings
from src.discovery import coarse_filter
from src.validate import validate_card, _parse_apr_high
from src.extract import CardData, _parse_dollar
from src.storage import _slug


def test_providers_yaml_loads():
    providers = settings.load_providers()
    assert len(providers) > 0, "providers.yaml loaded zero enabled providers"
    for p in providers:
        assert "name" in p and "base_url" in p
        assert p.get("sitemap") or p.get("fallback_hub"), f"{p['name']} has neither sitemap nor fallback_hub"
    print(f"OK: {len(providers)} providers loaded")


def test_coarse_filter_keeps_product_pages():
    provider = {"url_include": ["/cards/"], "url_exclude": ["/compare", "/blog"]}
    urls = [
        "https://example.com/cards/sapphire-preferred",
        "https://example.com/cards/compare",
        "https://example.com/blog/how-to-choose",
        "https://example.com/cards/freedom-unlimited",
    ]
    result = coarse_filter(urls, provider)
    assert len(result) == 2, f"expected 2 URLs, got {result}"
    print("OK: coarse_filter correctly excludes catalog/blog URLs")


def test_coarse_filter_dedupes_and_caps():
    provider = {"url_include": [], "url_exclude": []}
    urls = ["https://example.com/a"] * 5
    result = coarse_filter(urls, provider)
    assert len(result) == 1, "duplicate URLs should be deduped"
    print("OK: coarse_filter dedupes")


def test_validate_rejects_implausible_fee():
    bad = CardData(url="x", provider="test", card_name="Test", annual_fee=99999, extraction_confidence=0.9)
    result = validate_card(bad, None)
    assert result.accepted is False
    print("OK: validate_card rejects implausible annual_fee")


def test_validate_rejects_implausible_apr():
    bad = CardData(url="x", provider="test", card_name="Test", apr_range="150%-200% Variable", extraction_confidence=0.9)
    result = validate_card(bad, None)
    assert result.accepted is False
    print("OK: validate_card rejects implausible APR")


def test_validate_rejects_missing_name():
    bad = CardData(url="x", provider="test", card_name=None, extraction_confidence=0.9)
    result = validate_card(bad, None)
    assert result.accepted is False
    print("OK: validate_card rejects missing card_name")


def test_validate_accepts_reasonable_card():
    good = CardData(url="x", provider="test", card_name="Test Rewards Card",
                     annual_fee=95, apr_range="19.99%-27.99% Variable", extraction_confidence=0.9)
    result = validate_card(good, None)
    assert result.accepted is True
    print("OK: validate_card accepts plausible data")


def test_validate_flags_large_swing():
    previous = {"annual_fee": 95, "apr_range": "19.99%-27.99%", "card_name": "Test Card"}
    new = CardData(url="x", provider="test", card_name="Test Card",
                    annual_fee=300, apr_range="19.99%-27.99%", extraction_confidence=0.9)
    result = validate_card(new, previous)
    assert result.accepted is True, "large swings should be flagged, not rejected"
    assert len(result.flags) > 0, "expected a flag for the 3x fee jump"
    print("OK: validate_card flags (but doesn't reject) large day-over-day swings")


def test_apr_parsing():
    assert _parse_apr_high("19.99%-27.99% Variable") == 27.99
    assert _parse_apr_high(None) is None
    assert _parse_apr_high("No stated APR") is None
    print("OK: APR parsing handles normal, null, and unparseable cases")


def test_dollar_parsing():
    assert _parse_dollar("$95") == 95.0
    assert _parse_dollar("No annual fee") == 0.0
    assert _parse_dollar("") is None
    print("OK: dollar parsing handles normal, 'no fee', and empty cases")


def test_slug_generation():
    assert _slug("Chase Sapphire Preferred® Card") == "chase-sapphire-preferred-card"
    print("OK: slug generation")


def run_all():
    tests = [v for k, v in globals().items() if k.startswith("test_") and callable(v)]
    failed = []
    for t in tests:
        try:
            t()
        except AssertionError as e:
            print(f"FAIL: {t.__name__}: {e}")
            failed.append(t.__name__)
        except Exception as e:
            print(f"ERROR: {t.__name__}: {type(e).__name__}: {e}")
            failed.append(t.__name__)

    print(f"\n{len(tests) - len(failed)}/{len(tests)} passed")
    if failed:
        print(f"Failed: {failed}")
        sys.exit(1)


if __name__ == "__main__":
    run_all()
