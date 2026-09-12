"""Small HTTP adapter from the contract API to the XGBoost engine service."""

import json
import os
from typing import Any, Optional
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ML_ENGINE_URL = os.getenv("ML_ENGINE_URL", "http://127.0.0.1:8001").rstrip("/")


def get_model_forecast(site_id: str, hours: int) -> Optional[dict[str, Any]]:
    url = f"{ML_ENGINE_URL}/api/forecast/{quote(site_id)}?hours={hours}"
    try:
        with urlopen(url, timeout=8) as response:
            if response.status != 200:
                return None
            payload = json.loads(response.read().decode("utf-8"))
            return payload if isinstance(payload, dict) else None
    except (URLError, TimeoutError, json.JSONDecodeError):
        return None


def get_model_intelligence(site_id: str) -> Optional[dict[str, Any]]:
    url = f"{ML_ENGINE_URL}/api/intelligence/{quote(site_id)}"
    try:
        with urlopen(url, timeout=12) as response:
            if response.status != 200:
                return None
            payload = json.loads(response.read().decode("utf-8"))
            return payload if isinstance(payload, dict) else None
    except (URLError, TimeoutError, json.JSONDecodeError):
        return None


def run_model_scenario(payload: dict[str, Any]) -> Optional[dict[str, Any]]:
    request = Request(
        f"{ML_ENGINE_URL}/api/scenario",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            if response.status != 200:
                return None
            result = json.loads(response.read().decode("utf-8"))
            return result if isinstance(result, dict) else None
    except (URLError, TimeoutError, json.JSONDecodeError):
        return None
