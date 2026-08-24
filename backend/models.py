"""Pydantic models for SiteVerdict API requests and responses."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# ── Request models ──────────────────────────────────────────────────────────

class ParcelInput(BaseModel):
    """A single candidate parcel boundary."""
    parcel_id: str = Field(..., description="Unique identifier for this parcel")
    name: str = Field("", description="Human-readable name")
    geometry: dict = Field(..., description="GeoJSON Polygon (coordinates: [lon, lat])")
    properties: dict[str, Any] = Field(default_factory=dict, description="Extra metadata (lot_acres, zoning, etc.)")


class AnalyzeRequest(BaseModel):
    """Request to analyze a portfolio of candidate parcels."""
    parcels: list[ParcelInput] = Field(..., min_length=2, description="Candidate sites to compare")
    study_date: str = Field(..., description="YYYY-MM-DD — the day to analyse")
    window_start: str = Field("", description="YYYY-MM-DD — exceedance/persistence window start (default: study_date - 6 days)")
    window_end: str = Field("", description="YYYY-MM-DD — exceedance/persistence window end (default: study_date)")
    granularity: int = Field(80, description="Spatial resolution in metres (60, 80, or 100)")
    buffer_m: int = Field(400, description="Buffer around convex hull in metres")
    exceedance_threshold_c: float = Field(32.0, description="Heat threshold for exceedance/persistence (°C)")
    refresh: bool = Field(False, description="True = live API calls; False = use cached responses")


# ── Response models ─────────────────────────────────────────────────────────

class Verdict(BaseModel):
    """A single PASS / CAUTION / FAIL verdict for one metric."""
    metric: str
    value: float | None = None
    unit: str = ""
    verdict: str = ""  # PASS, CAUTION, FAIL, N/A
    threshold: str = ""
    authority: str = ""


class SiteMetrics(BaseModel):
    """All computed metrics for one candidate site."""
    parcel_id: str
    name: str = ""
    area_acres: float = 0.0
    geometry: dict | None = None
    # Heatmap metrics (area-weighted)
    peak_c: float | None = None
    min_c: float | None = None
    mean_c: float | None = None
    swing_c: float | None = None
    exceedance_h: float | None = None
    persistence_h: float | None = None
    # Derived
    rank: int = 0
    percentile: float = 0.0
    composite_score: float | None = None
    verdicts: list[Verdict] = Field(default_factory=list)
    # Enrichment (optional)
    impervious_pct: float | None = None
    canopy_pct: float | None = None
    hi_c_at_hot_hour: float | None = None
    apparent_c: float | None = None
    explanation: str = ""


class AnalysisResponse(BaseModel):
    """Full analysis result for a portfolio."""
    study_date: str
    window_start: str
    window_end: str
    window_hours: int
    exceedance_threshold_c: float
    granularity: int
    n_tiles: int = 0
    sites: list[SiteMetrics] = Field(default_factory=list)
    recommendation: str = ""
    top_site_id: str = ""
    # Heatmap layers from FortyGuard (for map visualization)
    heatmap_tcm: dict | None = None  # GeoJSON FeatureCollection with average_temperature
    heatmap_exceedance: dict | None = None  # GeoJSON FeatureCollection with exceedance hours
    heatmap_persistence: dict | None = None  # GeoJSON FeatureCollection with persistence hours
    # AOI geometry for map bounds
    aoi_geometry: dict | None = None  # GeoJSON polygon of the analysis area


class HealthResponse(BaseModel):
    status: str = "ok"
    cached: bool = True


# ── Copilot models ─────────────────────────────────────────────────────

class CopilotChatRequest(BaseModel):
    """Request to chat with the AI Copilot about a completed analysis."""
    message: str = Field(..., min_length=1, description="User's question about the analysis")
    analysis: dict = Field(..., description="The full AnalysisResponse dict from the current session")
    history: list[dict] = Field(default_factory=list, description="Recent conversation history [{role, parts}]")

    model_config = {"json_schema_extra": {"examples": [{"message": "Which site should we choose?", "analysis": {}, "history": []}]}}


class CopilotChatResponse(BaseModel):
    """AI Copilot chat response."""
    reply: str = Field(..., description="Gemini's response text")
    available: bool = Field(True, description="Whether Gemini is available")
