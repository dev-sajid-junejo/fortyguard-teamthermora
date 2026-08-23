"""Disk-based caching for FortyGuard API responses.

Cached files are keyed by endpoint + request params so identical requests
never re-burn credits. The REFRESH flag bypasses the cache entirely.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _cache_key(endpoint: str, payload: dict) -> str:
    """Deterministic short hash from endpoint + sorted payload."""
    raw = json.dumps({"ep": endpoint, "p": payload}, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def cache_path(endpoint: str, payload: dict, subdir: str = "") -> Path:
    """Return the file path where a cached response would live."""
    base = DATA_DIR / subdir if subdir else DATA_DIR
    base.mkdir(parents=True, exist_ok=True)
    return base / f"{endpoint}_{_cache_key(endpoint, payload)}.json"


def load_cache(endpoint: str, payload: dict, subdir: str = "") -> dict | None:
    """Return cached response or None."""
    p = cache_path(endpoint, payload, subdir)
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return None


def save_cache(endpoint: str, payload: dict, result: dict, subdir: str = "") -> Path:
    """Persist an API response to disk."""
    p = cache_path(endpoint, payload, subdir)
    p.write_text(json.dumps(result, default=str), encoding="utf-8")
    return p
