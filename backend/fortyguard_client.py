"""FortyGuard API client wrapper.

Wraps the official FortyGuardClient with caching, retry, and
the submit-then-poll pattern. All API calls go through this module
so the API key never reaches the browser.
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path

import requests

from .cache import load_cache, save_cache

log = logging.getLogger("siteverdict.fortyguard")

_RETRYABLE = {429, 500, 502, 503, 504}
_MAX_RETRIES = 2

DEFAULT_BASE_URL = "https://api.fortyguard.com"
_TERMINAL_SUCCESS = {"succeeded", "completed"}
_TERMINAL_FAILURE = {"failed", "error"}


class FortyGuardClient:
    """Thin wrapper around the FortyGuard tOS Enterprise API.

    Handles submit → poll → result, with disk caching.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 60.0,
    ):
        self.api_key = api_key or os.getenv("FORTYGUARD_API_KEY")
        self.base_url = (base_url or os.getenv("FORTYGUARD_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()
        if self.api_key:
            self._session.headers.update({
                "api-key": self.api_key,
                "Content-Type": "application/json",
            })

    def check_connectivity(self) -> bool:
        """Quick DNS/connect check (2s timeout). Returns True if API is reachable."""
        import socket as _socket
        from urllib.parse import urlparse
        try:
            parsed = urlparse(self.base_url)
            host = parsed.hostname
            port = parsed.port or (443 if parsed.scheme == "https" else 80)
            sock = _socket.create_connection((host, port), timeout=2.0)
            sock.close()
            return True
        except (OSError, _socket.timeout):
            return False

    def _request(self, method: str, path: str, retries: int = _MAX_RETRIES, **kwargs) -> requests.Response:
        url = f"{self.base_url}{path}"
        kwargs.setdefault("timeout", self.timeout)
        last_err = None
        for attempt in range(1 + retries):
            try:
                resp = self._session.request(method, url, **kwargs)
                if resp.status_code in _RETRYABLE and attempt < retries:
                    wait = 2 ** attempt
                    log.warning("[FortyGuard] %s %s -> %d (retry %d/%d in %ds)",
                                method, path, resp.status_code, attempt + 1, retries, wait)
                    time.sleep(wait)
                    continue
                if not resp.ok:
                    raise RuntimeError(f"{method} {path} -> {resp.status_code}: {resp.text[:500]}")
                return resp
            except (requests.ConnectionError, requests.Timeout) as e:
                last_err = e
                if attempt < retries:
                    wait = 2 ** attempt
                    log.warning("[FortyGuard] %s %s -> %s (retry %d/%d in %ds)",
                                method, path, e, attempt + 1, retries, wait)
                    time.sleep(wait)
                    continue
                raise
        raise last_err  # unreachable but keeps type checkers happy

    def _submit(self, path: str, payload: dict) -> str:
        log.info("[FortyGuard] POST %s (analytic=%s)", path, payload.get("analytic_type", "?"))
        body = self._request("POST", path, json=payload).json()
        if body.get("error"):
            raise RuntimeError(body.get("message", "Submission failed"))
        aid = body["data"]["activity_id"]
        log.info("[FortyGuard] Submitted -> activity_id=%s", aid)
        return aid

    def _poll(self, activity_id: str, poll_interval: float = 3.0, timeout: float = 600.0) -> dict:
        deadline = time.monotonic() + timeout
        while True:
            resp = self._session.get(
                f"{self.base_url}/v1/status/{activity_id}", timeout=self.timeout
            )
            if resp.status_code == 404:
                if time.monotonic() >= deadline:
                    raise TimeoutError(f"Activity {activity_id} never became visible")
                time.sleep(poll_interval)
                continue
            if not resp.ok:
                raise RuntimeError(f"Status {activity_id} -> {resp.status_code}: {resp.text[:300]}")
            body = resp.json()
            if body.get("error"):
                raise RuntimeError(body.get("message", "Status failed"))
            data = body.get("data", {})
            status = str(data.get("status", "")).lower()
            if status in _TERMINAL_FAILURE:
                raise RuntimeError(f"Activity {activity_id} failed: {data.get('message') or data}")
            if status in _TERMINAL_SUCCESS:
                result = data.get("result")
                if result:
                    log.info("[FortyGuard] Activity %s completed (%.1fs)", activity_id, time.monotonic() - (deadline - timeout))
                    return result
                if time.monotonic() >= deadline:
                    raise TimeoutError(f"Activity {activity_id} succeeded but result never appeared after {timeout:.0f}s")
                time.sleep(poll_interval)
                continue
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Activity {activity_id} still '{status}' after {timeout:.0f}s")
            time.sleep(poll_interval)

    def _submit_and_wait(self, path: str, payload: dict, **kwargs) -> dict:
        activity_id = self._submit(path, payload)
        result = self._poll(activity_id, **kwargs)
        return {"activity_id": activity_id, "result": result}

    # ── Analysis endpoints ──────────────────────────────────────────────

    def create_heatmap(
        self,
        polygon_aoi: dict,
        start_date: str,
        filter_type: int,
        granularity: int = 80,
        analytic_type: str = "tcm",
        end_date: str | None = None,
        threshold: float | None = None,
        direction: str | None = None,
        wait: bool = True,
        **kwargs,
    ) -> dict | str:
        payload: dict = {
            "polygon_aoi": polygon_aoi,
            "date_time": {"start_date": start_date, "filter_type": filter_type},
            "granularity": granularity,
            "analytic_type": analytic_type,
        }
        if end_date:
            payload["date_time"]["end_date"] = end_date
        if threshold is not None:
            payload["threshold"] = threshold
        if direction is not None:
            payload["direction"] = direction
        log.info("[FortyGuard] create_heatmap: analytic=%s, start=%s, end=%s, filter=%d, gran=%d",
                 analytic_type, start_date, end_date, filter_type, granularity)
        if not wait:
            return self._submit("/v1/heatmap", payload)
        return self._submit_and_wait("/v1/heatmap", payload, **kwargs)

    def environmental_parameters(
        self,
        latitude: float,
        longitude: float,
        temperature: float,
        start_date: str,
        filter_type: int,
        **kwargs,
    ) -> dict:
        payload = {
            "latitude": latitude,
            "longitude": longitude,
            "temperature": temperature,
            "date_time": {"start_date": start_date, "filter_type": filter_type},
        }
        return self._submit_and_wait("/v1/env_params", payload, **kwargs)

    def satellite_segmentation(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        filter_type: int,
        granularity: int = 100,
        **kwargs,
    ) -> dict:
        payload = {
            "sat": {"latitude": latitude, "longitude": longitude},
            "date_time": {"start_date": start_date, "filter_type": filter_type},
            "granularity": granularity,
        }
        return self._submit_and_wait("/v1/satellite", payload, **kwargs)

    def street_view_segmentation(
        self,
        latitude: float,
        longitude: float,
        **kwargs,
    ) -> dict:
        payload = {
            "latitude": latitude,
            "longitude": longitude,
            "vertical_angle": 0,
            "horizontal_angle": 0,
            "back_view": False,
        }
        return self._submit_and_wait("/v1/streetview", payload, **kwargs)

    def fetch_api_key_usage(self) -> dict:
        body = self._request("POST", "/v1/system/fetch-api-key-usage", json={"api_key": self.api_key}).json()
        return body


class CachingClient:
    """Wraps FortyGuardClient with transparent disk caching.

    When refresh=False, cached responses are returned without API calls.
    When refresh=True, live calls are made and results cached for next time.
    """

    def __init__(self, api_key: str | None = None, base_url: str | None = None, refresh: bool = False):
        self.client = FortyGuardClient(api_key, base_url)
        self.refresh = refresh

    def create_heatmap(self, polygon_aoi, start_date, filter_type, granularity=80,
                       analytic_type="tcm", end_date=None, threshold=None, direction=None, **kw):
        payload = {"polygon_aoi": "truncated", "start_date": start_date, "filter_type": filter_type,
                   "granularity": granularity, "analytic_type": analytic_type, "end_date": end_date,
                   "threshold": threshold, "direction": direction}
        subdir = "heatmaps"
        if not self.refresh:
            cached = load_cache("heatmap", payload, subdir)
            if cached is not None:
                return cached
        result = self.client.create_heatmap(
            polygon_aoi, start_date, filter_type, granularity, analytic_type,
            end_date, threshold, direction, **kw,
        )
        save_cache("heatmap", payload, result, subdir)
        return result

    def environmental_parameters(self, latitude, longitude, temperature, start_date, filter_type, **kw):
        payload = {"latitude": latitude, "longitude": longitude, "temperature": round(temperature, 2),
                   "start_date": start_date, "filter_type": filter_type}
        subdir = "env_params"
        if not self.refresh:
            cached = load_cache("env_params", payload, subdir)
            if cached is not None:
                return cached
        result = self.client.environmental_parameters(latitude, longitude, temperature, start_date, filter_type, **kw)
        save_cache("env_params", payload, result, subdir)
        return result

    def satellite_segmentation(self, latitude, longitude, start_date, filter_type, granularity=100, **kw):
        payload = {"latitude": latitude, "longitude": longitude, "start_date": start_date,
                   "filter_type": filter_type, "granularity": granularity}
        subdir = "satellite"
        if not self.refresh:
            cached = load_cache("satellite", payload, subdir)
            if cached is not None:
                return cached
        result = self.client.satellite_segmentation(latitude, longitude, start_date, filter_type, granularity, **kw)
        save_cache("satellite", payload, result, subdir)
        return result

    def street_view_segmentation(self, latitude, longitude, **kw):
        payload = {"latitude": latitude, "longitude": longitude}
        subdir = "street_view"
        if not self.refresh:
            cached = load_cache("streetview", payload, subdir)
            if cached is not None:
                return cached
        result = self.client.street_view_segmentation(latitude, longitude, **kw)
        save_cache("streetview", payload, result, subdir)
        return result

    def fetch_api_key_usage(self):
        return self.client.fetch_api_key_usage()
