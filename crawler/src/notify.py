"""
notify.py — sends a Slack alert when a run needs human attention.

"No admin input" for day-to-day operation still means someone needs to
find out when a provider's site redesigns and breaks extraction. This is
the one place that's allowed to interrupt a human, and only for real
signal: zero URLs discovered, high reject rate, or a hard pipeline error.
"""
import logging

import requests

from src.config import settings

logger = logging.getLogger("notify")


def send_alert(message: str) -> None:
    logger.error(f"ALERT: {message}")
    if not settings.slack_webhook_url:
        logger.warning("SLACK_WEBHOOK_URL not configured — alert logged only, not sent")
        return
    try:
        requests.post(settings.slack_webhook_url, json={"text": f":rotating_light: {message}"}, timeout=10)
    except requests.RequestException as e:
        logger.error(f"failed to send Slack alert: {e}")
