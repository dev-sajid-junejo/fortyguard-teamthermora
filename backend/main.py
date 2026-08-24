"""SiteVerdict — FastAPI backend. Core analysis pipeline + API routes.

Supports two modes:
- DEMO: uses pre-cached FortyGuard responses (zero credits)
- LIVE: calls FortyGuard API in real-time via CachingClient
"""

from __future__ import annotations

import asyncio
import json
import math
import os
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from shapely.geometry import Polygon, shape, mapping

from .models import AnalyzeRequest, AnalysisResponse, SiteMetrics, CopilotChatRequest, CopilotChatResponse
from .geometry import build_aoi, area_weighted_mean, tile_polygons_from_heatmap
from .scoring import compute_verdicts, rank_sites, compute_composite
from .explanations import explain_rank, explain_surface, explain_recommendation
from .fortyguard_client import CachingClient, FortyGuardClient
from . import gemini_client

# Load .env for API key
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="SiteVerdict API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SATELLITE_DIR = DATA_DIR / "satellite"
ENV_PARAMS_DIR = DATA_DIR / "env_params"
PARCEL_FILE = DATA_DIR / "parcels" / "parcel_portfolio_nyc_sample.geojson"
REGION = "New York"

# ── FortyGuard client key ─────────────────────────────────────────────
_api_key = os.getenv("FORTYGUARD_API_KEY")
if not _api_key:
    print("[SiteVerdict] WARNING: FORTYGUARD_API_KEY not set. Live mode disabled; demo-only available. Set FORTYGUARD_API_KEY in .env to enable live analysis.")


# ── Helpers ──────────────────────────────────────────────────────────

def _extract_tile_values(map_data, field):
    result = []
    for feature in map_data.get("features", []):
        props = feature.get("properties", {})
        value = props.get(field)
        if value is None:
            continue
        result.append((shape(feature["geometry"]), float(value)))
    return result


def _compute_satellite_metrics(sat_data):
    seg = sat_data.get("result", sat_data).get("segmentation", {})
    if not seg:
        return None, None
    if "segments" in seg:
        seg = seg["segments"]
    if not seg:
        return None, None
    canopy = seg.get("tree", 0.0)
    impervious = sum(seg.get(k, 0.0) for k in ["building", "road", "sidewalk", "pavement", "route", "road, route"])
    return round(canopy, 1), round(impervious, 1)


def _compute_env_params_metrics(env_data):
    result = env_data.get("result", env_data)
    locs = result.get("locations", [])
    if not locs:
        return None, None
    params = locs[0].get("parameters", {})
    apparent = params.get("apparent_temperature_celsius", [])
    hi = params.get("heat_index_celsius", [])
    if not apparent:
        return None, None
    hot_idx = max(range(len(apparent)), key=lambda i: apparent[i] if apparent[i] is not None else -999)
    hi_c = hi[hot_idx] if hot_idx < len(hi) and hi[hot_idx] is not None else None
    apparent_c = apparent[hot_idx]
    return round(hi_c, 2) if hi_c is not None else None, round(apparent_c, 2) if apparent_c is not None else None


def _compute_parcel_area(geometry):
    poly = shape(geometry)
    centroid = poly.centroid
    cx, cy = centroid.x, centroid.y
    M = 111132.0
    coords = list(poly.exterior.coords)
    projected = Polygon([(c[0] * M * math.cos(math.radians(cy)), c[1] * M) for c in coords])
    return projected.area, projected.length


def _validate_us_coordinates(parcels_data: list[dict]) -> None:
    """Validate that all parcel coordinates are within the continental US.

    Raises HTTPException 400 if any parcel is outside US bounds.
    FortyGuard API only supports US locations.
    """
    US_BOUNDS = {"lon_min": -125.0, "lon_max": -66.0, "lat_min": 24.0, "lat_max": 49.5}
    for parcel in parcels_data:
        geom = parcel.get("geometry", {})
        coords = geom.get("coordinates", [[]])
        # Handle both Polygon and MultiPolygon
        if geom.get("type") == "Polygon":
            ring = coords[0] if coords else []
        elif geom.get("type") == "MultiPolygon":
            ring = coords[0][0] if coords and coords[0] else []
        else:
            ring = []
        for lon, lat in ring:
            if not (US_BOUNDS["lon_min"] <= lon <= US_BOUNDS["lon_max"] and
                    US_BOUNDS["lat_min"] <= lat <= US_BOUNDS["lat_max"]):
                raise HTTPException(
                    400,
                    f"FortyGuard Temperature API currently supports U.S. locations only. "
                    f"Parcel '{parcel.get('name', parcel.get('parcel_id', ''))}' contains "
                    f"coordinates ({lat}, {lon}) outside the United States. "
                    f"Please provide a parcel within the continental U.S."
                )


def _fetch_heatmap(analytic_type, aoi_geojson, start_date, end_date, granularity, threshold, direction, refresh):
    """Fetch heatmap data — live API or cached file."""
    # FortyGuard API expects a FeatureCollection wrapping the polygon
    if aoi_geojson.get("type") == "Polygon":
        feature_collection = {
            "type": "FeatureCollection",
            "features": [{"type": "Feature", "properties": {}, "geometry": aoi_geojson}],
        }
    else:
        feature_collection = aoi_geojson

    mode = "LIVE" if refresh else "CACHED"
    client = CachingClient(api_key=_api_key, refresh=refresh)
    try:
        result = client.create_heatmap(
            polygon_aoi=feature_collection,
            start_date=start_date,
            filter_type=4,  # range of days
            granularity=granularity,
            analytic_type=analytic_type,
            end_date=end_date,
            threshold=threshold,
            direction=direction,
            timeout=30.0,
        )
        return result
    except Exception as e:
        print(f"[SiteVerdict] Heatmap ({analytic_type}) failed [{mode}]: {e}")
        return None


def _fetch_satellite(latitude, longitude, start_date, refresh):
    """Fetch satellite segmentation — live API or cached file."""
    if not refresh:
        # Demo/cached mode: find matching cached file by lat/lon
        for f in sorted(SATELLITE_DIR.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                coords = data.get("result", data).get("coordinates", {})
                lat_match = abs(float(coords.get("latitude", 0)) - latitude) < 0.001
                lon_match = abs(float(coords.get("longitude", 0)) - longitude) < 0.001
                if lat_match and lon_match:
                    return data
            except Exception:
                continue
        return None

    client = CachingClient(api_key=_api_key, refresh=True)
    try:
        return client.satellite_segmentation(
            latitude=latitude, longitude=longitude,
            start_date=start_date, filter_type=3,
            granularity=100, timeout=30.0,
        )
    except Exception as e:
        print(f"[SiteVerdict] Live satellite failed: {e}")
        return None


def _fetch_env_params(latitude, longitude, temperature, start_date, refresh):
    """Fetch environmental parameters — live API or cached file."""
    if not refresh:
        for f in sorted(ENV_PARAMS_DIR.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                locs = data.get("result", data).get("locations", [])
                if locs:
                    loc = locs[0]
                    lat_match = abs(float(loc.get("lat", 0)) - latitude) < 0.001
                    lon_match = abs(float(loc.get("lon", 0)) - longitude) < 0.001
                    if lat_match and lon_match:
                        return data
            except Exception:
                continue
        return None

    client = CachingClient(api_key=_api_key, refresh=True)
    try:
        return client.environmental_parameters(
            latitude=latitude, longitude=longitude,
            temperature=temperature, start_date=start_date,
            filter_type=3, timeout=30.0,
        )
    except Exception as e:
        print(f"[SiteVerdict] Live env_params failed: {e}")
        return None


# ── Core analysis pipeline ───────────────────────────────────────────

async def _run_analysis(parcels_data, study_date, window_start, window_end,
                        granularity, buffer_m, exceedance_threshold_c, refresh, mode):
    """Shared analysis pipeline for both demo and live modes."""
    window_hours = (datetime.strptime(window_end, "%Y-%m-%d") - datetime.strptime(window_start, "%Y-%m-%d")).days * 24 + 24

    # Fast-fail: check API key and FortyGuard connectivity before starting live analysis
    if refresh:
        # If no API key configured, clearly report that live mode is unavailable
        if not _api_key:
            raise HTTPException(
                503,
                detail={
                    "code": "NO_API_KEY",
                    "message": "FORTYGUARD_API_KEY not configured; LIVE mode unavailable.",
                    "resolution": "Set FORTYGUARD_API_KEY in .env and restart the server. You can still use Demo Mode with cached data."
                }
            )

        client = FortyGuardClient(api_key=_api_key)
        if not client.check_connectivity():
            raise HTTPException(
                503,
                detail={
                    "code": "API_UNREACHABLE",
                    "message": "FortyGuard API is unreachable from this machine.",
                    "resolution": "Check network connectivity and DNS resolution for api.fortyguard.com. You can still use Demo Mode with cached data."
                }
            )

    # Step 1: Build AOI
    aoi_geojson, aoi_km2, centroid = build_aoi(parcels_data, buffer_m)

    # Step 2: Fetch heatmap layers
    tcm_data = _fetch_heatmap("tcm", aoi_geojson, window_start, window_end, granularity, None, None, refresh)
    exc_data = _fetch_heatmap("exceedance", aoi_geojson, window_start, window_end, granularity, exceedance_threshold_c, "above", refresh)
    per_data = _fetch_heatmap("persistence", aoi_geojson, window_start, window_end, granularity, exceedance_threshold_c, "above", refresh)

    if not tcm_data:
        if refresh:
            # Distinguish missing API key vs upstream failure
            if not _api_key:
                raise HTTPException(503, detail={
                    "code": "NO_API_KEY",
                    "message": f"Heatmap tcm data unavailable (LIVE mode). FORTYGUARD_API_KEY not configured.",
                    "resolution": "Set FORTYGUARD_API_KEY in .env and restart the server."
                })
            else:
                raise HTTPException(503, detail={
                    "code": "HEATMAP_LIVE_FAILED",
                    "message": f"Heatmap tcm data unavailable (LIVE mode). Upstream FortyGuard call failed or returned no result.",
                    "resolution": "Check server logs for FortyGuard response details and verify the API key is valid."
                })
        else:
            raise HTTPException(500, detail={
                "code": "NO_CACHED_DATA",
                "message": f"Heatmap tcm data unavailable (CACHED mode). No cached data found.",
            })

    # Handle different response shapes: live returns {result: {map_data, stats_data}}, cached may be flat
    tcm_map = tcm_data.get("result", tcm_data).get("map_data", tcm_data.get("map_data", tcm_data))
    exc_map = exc_data.get("result", exc_data).get("map_data", exc_data.get("map_data", exc_data)) if exc_data else None
    per_map = per_data.get("result", per_data).get("map_data", per_data.get("map_data", per_data)) if per_data else None
    
    # Store raw GeoJSON for frontend visualization
    heatmap_tcm_geojson = tcm_map if tcm_map and tcm_map.get("type") == "FeatureCollection" else None
    heatmap_exc_geojson = exc_map if exc_map and exc_map.get("type") == "FeatureCollection" else None
    heatmap_per_geojson = per_map if per_map and per_map.get("type") == "FeatureCollection" else None

    tcm_tiles = _extract_tile_values(tcm_map, "average_temperature")
    exc_tiles = _extract_tile_values(exc_map, "value") if exc_map else []
    per_tiles = _extract_tile_values(per_map, "value") if per_map else []

    n_tiles = len(tcm_tiles)

    # Step 3: Area-weighted clip to each parcel
    sites = []
    for parcel in parcels_data:
        geom = parcel["geometry"]
        props = parcel.get("properties", {})
        area_m2, _ = _compute_parcel_area(geom)

        peak_c = area_weighted_mean(tcm_tiles, geom)
        exc_h = area_weighted_mean(exc_tiles, geom) if exc_tiles else None
        per_h = area_weighted_mean(per_tiles, geom) if per_tiles else None

        parcel_tiles_vals = [v for tile, v in tcm_tiles if tile.intersects(shape(geom))]
        min_c = min(parcel_tiles_vals) if parcel_tiles_vals else None
        swing = (peak_c - min_c) if peak_c is not None and min_c is not None else None

        site = SiteMetrics(
            parcel_id=parcel["parcel_id"],
            name=parcel.get("name", ""),
            area_acres=props.get("lot_acres", area_m2 / 4047),
            geometry=geom,
            peak_c=round(peak_c, 2) if peak_c is not None else None,
            min_c=round(min_c, 2) if min_c is not None else None,
            mean_c=round(sum(parcel_tiles_vals) / len(parcel_tiles_vals), 2) if parcel_tiles_vals else None,
            swing_c=round(swing, 2) if swing is not None else None,
            exceedance_h=round(exc_h, 1) if exc_h is not None else None,
            persistence_h=round(per_h, 1) if per_h is not None else None,
        )

        # Step 4: Satellite enrichment (top-3 only, to save credits)
        centroid_coords = shape(geom).centroid
        sat = _fetch_satellite(centroid_coords.y, centroid_coords.x, study_date, refresh)
        if sat:
            site.canopy_pct, site.impervious_pct = _compute_satellite_metrics(sat)

        # Step 5: env_params enrichment (top-3 only)
        if peak_c:
            env = _fetch_env_params(centroid_coords.y, centroid_coords.x, peak_c, study_date, refresh)
            if env:
                site.hi_c_at_hot_hour, site.apparent_c = _compute_env_params_metrics(env)

        sites.append(site)

    # Step 6: Rank + verdicts + composite
    ranked = rank_sites(sites)
    for site in ranked:
        site.verdicts = compute_verdicts(site, window_hours)
        site.composite_score = compute_composite(site, window_hours)
        site.explanation = explain_rank(site, ranked, window_hours)

    top = ranked[-1] if ranked else None
    recommendation = explain_recommendation(top, ranked, window_hours) if top else ""

    return AnalysisResponse(
        study_date=study_date,
        window_start=window_start,
        window_end=window_end,
        window_hours=window_hours,
        exceedance_threshold_c=exceedance_threshold_c,
        granularity=granularity,
        n_tiles=n_tiles,
        sites=ranked,
        recommendation=recommendation,
        top_site_id=top.parcel_id if top else "",
        heatmap_tcm=heatmap_tcm_geojson,
        heatmap_exceedance=heatmap_exc_geojson,
        heatmap_persistence=heatmap_per_geojson,
        aoi_geometry=mapping(shape(aoi_geojson)) if aoi_geojson else None,
    )


# ── API Routes ───────────────────────────────────────────────────────

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(req: AnalyzeRequest):
    """Analyze a portfolio of parcels. Uses live FortyGuard API when refresh=true,
    cached responses when refresh=false."""
    study_date = req.study_date
    window_start = req.window_start or (datetime.strptime(study_date, "%Y-%m-%d") - timedelta(days=6)).strftime("%Y-%m-%d")
    window_end = req.window_end or study_date

    parcels_data = [{"parcel_id": p.parcel_id, "name": p.name, "geometry": p.geometry, "properties": p.properties} for p in req.parcels]

    # Validate US coordinates before calling FortyGuard
    _validate_us_coordinates(parcels_data)

    mode = "LIVE" if req.refresh else "CACHED"
    try:
        # Live mode needs much longer timeout: 3 heatmaps + 6 satellite + 6 env_params
        # Each API call can take 10-60 seconds, so we need 5+ minutes for live
        timeout = 300.0 if req.refresh else 30.0  # 5 min live, 30 sec cached
        return await asyncio.wait_for(
            _run_analysis(
                parcels_data, study_date, window_start, window_end,
                req.granularity, req.buffer_m, req.exceedance_threshold_c,
                refresh=req.refresh, mode=mode,
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, {
            "code": "ANALYSIS_TIMEOUT",
            "message": f"Analysis timed out after {timeout:.0f} seconds. FortyGuard API may be slow or unreachable.",
            "resolution": "Try again in a few minutes. If the issue persists, the FortyGuard API may be experiencing high load."
        })


class DemoAnalyzeRequest(BaseModel):
    """Optional request body for demo analysis with custom parcels."""
    parcels: list[dict] | None = None
    study_date: str = "2026-08-03"
    window_start: str = "2026-08-03"
    window_end: str = "2026-08-03"
    granularity: int = 80
    buffer_m: int = 400
    exceedance_threshold_c: float = 32.0


@app.post("/api/demo/analyze", response_model=AnalysisResponse)
async def analyze_demo(req: DemoAnalyzeRequest | None = None):
    """Run demo analysis using cached FortyGuard data (zero API credits).
    Accepts optional custom parcels in request body."""
    # Use custom parcels from request if provided, otherwise fall back to NYC defaults
    if req and req.parcels:
        parcels = req.parcels
        study_date = req.study_date
        window_start = req.window_start
        window_end = req.window_end
        granularity = req.granularity
        buffer_m = req.buffer_m
        exceedance_threshold_c = req.exceedance_threshold_c
    else:
        if not PARCEL_FILE.exists():
            raise HTTPException(404, "Demo parcel data not found.")
        parcels_data = json.loads(PARCEL_FILE.read_text(encoding="utf-8"))
        parcels = [{"parcel_id": f["properties"]["parcel_id"], "name": f["properties"].get("name", ""),
                    "geometry": f["geometry"], "properties": f["properties"]} for f in parcels_data["features"]]
        study_date = "2026-08-03"
        window_start = "2026-08-03"
        window_end = "2026-08-03"
        granularity = 80
        buffer_m = 400
        exceedance_threshold_c = 32.0

    return await _run_analysis(
        parcels, study_date=study_date, window_start=window_start, window_end=window_end,
        granularity=granularity, buffer_m=buffer_m, exceedance_threshold_c=exceedance_threshold_c,
        refresh=False, mode="DEMO",
    )


@app.get("/api/demo/parcels")
async def get_demo_parcels():
    """Return demo parcel boundaries."""
    if not PARCEL_FILE.exists():
        raise HTTPException(404, "Demo parcel data not found.")
    return json.loads(PARCEL_FILE.read_text(encoding="utf-8"))


@app.get("/api/health")
async def health():
    """Health check. Reports whether API keys are configured."""
    return {
        "status": "ok",
        "api_key_configured": bool(_api_key),
        "mode": "live-ready" if _api_key else "demo-only",
        "region": REGION,
        "gemini_configured": gemini_client.is_available(),
    }


# ── AI Copilot routes ─────────────────────────────────────────────────

@app.post("/api/copilot/chat", response_model=CopilotChatResponse)
async def copilot_chat(req: CopilotChatRequest):
    """Chat with the SiteVerdict AI Copilot about the current analysis."""
    if not gemini_client.is_available():
        return CopilotChatResponse(
            reply="AI Copilot is temporarily unavailable. "
                  "Your SiteVerdict analysis is still available. "
                  "Configure GEMINI_API_KEY in .env to enable the AI Copilot.",
            available=False,
        )

    analysis_context = gemini_client.build_analysis_context(req.analysis)

    # Build compact conversation history for Gemini
    history = []
    for msg in req.history[-10:]:  # Keep last 10 messages for context
        history.append({
            "role": msg.get("role", "user"),
            "parts": [msg.get("parts", [""])[0]] if isinstance(msg.get("parts"), list) else [msg.get("parts", "")],
        })

    try:
        reply = gemini_client.chat(req.message, analysis_context, history)
        return CopilotChatResponse(reply=reply, available=True)
    except RuntimeError as e:
        raise HTTPException(502, detail=f"AI Copilot error: {e}")


@app.post("/api/copilot/report")
async def copilot_report(req: CopilotChatRequest):
    """Generate an AI due-diligence report for the current analysis."""
    if not gemini_client.is_available():
        return CopilotChatResponse(
            reply="AI Copilot is temporarily unavailable. "
                  "Your SiteVerdict analysis is still available. "
                  "Configure GEMINI_API_KEY in .env to enable the AI Copilot.",
            available=False,
        )

    analysis_context = gemini_client.build_analysis_context(req.analysis)

    try:
        report = gemini_client.generate_report(analysis_context)
        return CopilotChatResponse(reply=report, available=True)
    except RuntimeError as e:
        raise HTTPException(502, detail=f"AI Copilot error: {e}")
