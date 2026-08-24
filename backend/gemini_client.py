"""Gemini AI Copilot for SiteVerdict.

Wraps the Google Gemini API to provide an AI copilot layer on top of
the deterministic SiteVerdict analysis. The API key stays server-side.

Architecture:
  FortyGuard measurements -> SiteVerdict calculations -> Gemini explanation

Gemini MUST NOT invent measurements, temperatures, scores, or thresholds.
It reasons only from the structured analysis context supplied by the backend.
"""

from __future__ import annotations

import json
import os
from typing import Any

from google import genai
from google.genai import types

# ── Configuration ──────────────────────────────────────────────────────

_MODEL_NAME = "gemini-3.5-flash-lite"

_SYSTEM_PROMPT = """You are the SiteVerdict AI Copilot — an enterprise heat-risk analyst embedded in the SiteVerdict due-diligence platform.

Your role is to interpret and explain structured heat-risk analysis results. You do NOT generate measurements. You reason exclusively from the data provided in the analysis context.

CORE RULES:
1. NEVER invent temperatures, hours, scores, thresholds, or any numerical values. If a value is not in the supplied data, say: "I don't have enough data from the current SiteVerdict analysis to answer that."
2. Distinguish clearly between:
   - FortyGuard = source of temperature/environmental MEASUREMENTS
   - SiteVerdict = interpretation/SCORING layer applying independently sourced thresholds
   - Your analysis = AI INTERPRETATION of the above
3. When discussing thresholds, always cite the source (NOAA, OSHA, EPA, USDA) as present in the data.
4. NEVER claim a threshold is an official FortyGuard threshold. FortyGuard provides measurements; SiteVerdict applies external authority thresholds.
5. Prioritize DURATION-FIRST ranking: exceedance duration > persistence > peak temperature.
6. Be concise, professional, evidence-based, and decision-oriented.
7. When making a recommendation, cite the specific SiteVerdict metrics used and explain trade-offs.
8. If asked about something outside your data, acknowledge the limitation clearly.

STYLE:
- Enterprise analyst, not chatbot
- Use specific numbers from the data
- Reference site names and ranks
- Explain WHY, not just WHAT
- Keep responses focused and actionable"""

_REPORT_PROMPT = """Generate a formal enterprise due-diligence report based on the SiteVerdict analysis context provided.

The report MUST contain these sections, in order:
1. Executive Summary
2. Recommended Site
3. Why It Was Recommended
4. Site-by-Site Comparison
5. Heat Exposure Findings
6. Persistence Findings
7. Environmental/Satellite Findings
8. Worker Safety Considerations
9. Key Risks
10. Confidence / Data Limitations
11. Final Recommendation

RULES:
- Use ONLY the metrics from the supplied data
- Clearly label: "Measured by FortyGuard", "Derived by SiteVerdict", "AI interpretation by Gemini"
- Cite thresholds with their authority source (NOAA, OSHA, EPA, USDA)
- Reference the duration-first ranking methodology
- Be specific with numbers — do not round away precision
- If data is missing for a section, state what is available and note the gap
- Professional, audit-ready language"""


# ── Client setup ───────────────────────────────────────────────────────

_client: genai.Client | None = None
_configured = False
_has_key = False


def _ensure_configured() -> bool:
    global _client, _configured, _has_key
    if _configured:
        return _has_key
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        _client = genai.Client(api_key=api_key)
        _has_key = True
    _configured = True
    return _has_key


def is_available() -> bool:
    """Check if Gemini API key is configured."""
    return _ensure_configured()


# ── Context builder ────────────────────────────────────────────────────

def build_analysis_context(analysis: dict) -> str:
    """Build a compact structured JSON context from an AnalysisResponse dict.

    Only includes fields relevant for AI reasoning. Strips geometry and
    other large payloads.
    """
    sites_context = []
    for site in analysis.get("sites", []):
        site_data: dict[str, Any] = {
            "name": site.get("name") or site.get("parcel_id", ""),
            "parcel_id": site.get("parcel_id", ""),
            "rank": site.get("rank", 0),
            "area_acres": site.get("area_acres", 0),
        }

        # Core heatmap metrics (measured by FortyGuard)
        for field in ("peak_c", "min_c", "mean_c", "swing_c", "exceedance_h", "persistence_h"):
            val = site.get(field)
            if val is not None:
                site_data[field] = val

        # Environmental enrichment (measured by FortyGuard)
        for field in ("hi_c_at_hot_hour", "apparent_c"):
            val = site.get(field)
            if val is not None:
                site_data[field] = val

        # Satellite enrichment (measured by FortyGuard)
        for field in ("canopy_pct", "impervious_pct"):
            val = site.get(field)
            if val is not None:
                site_data[field] = val

        # Derived by SiteVerdict
        if site.get("composite_score") is not None:
            site_data["siteverdict_score"] = site["composite_score"]

        # Verdicts (derived by SiteVerdict from authority thresholds)
        verdicts = []
        for v in site.get("verdicts", []):
            if v.get("verdict") and v["verdict"] != "N/A":
                verdicts.append({
                    "metric": v.get("metric", ""),
                    "value": v.get("value"),
                    "unit": v.get("unit", ""),
                    "verdict": v.get("verdict", ""),
                    "authority": v.get("authority", ""),
                })
        if verdicts:
            site_data["verdicts"] = verdicts

        # Risk factors (derived)
        risks = []
        if site.get("impervious_pct") and site["impervious_pct"] > 60:
            risks.append(f"Impervious surface {site['impervious_pct']}% exceeds EPA 60% threshold")
        if site.get("canopy_pct") and site["canopy_pct"] < 15:
            risks.append(f"Canopy cover {site['canopy_pct']}% below USDA 15% target")
        if site.get("hi_c_at_hot_hour") and site["hi_c_at_hot_hour"] >= 32.2:
            risks.append(f"Heat index {site['hi_c_at_hot_hour']}°C triggers OSHA high-heat protocol")
        if site.get("exceedance_h") and analysis.get("window_hours"):
            ratio = site["exceedance_h"] / analysis["window_hours"]
            if ratio >= 0.35:
                risks.append(f"High exposure: {site['exceedance_h']}h of {analysis['window_hours']}h above 32°C")
        if risks:
            site_data["risk_factors"] = risks

        sites_context.append(site_data)

    context = {
        "analysis_metadata": {
            "study_date": analysis.get("study_date", ""),
            "window": f"{analysis.get('window_start', '')} to {analysis.get('window_end', '')}",
            "window_hours": analysis.get("window_hours", 0),
            "exceedance_threshold_c": analysis.get("exceedance_threshold_c", 32.0),
            "n_tiles": analysis.get("n_tiles", 0),
            "region": "New York, USA",
        },
        "scoring_methodology": {
            "ranking_order": "exceedance_duration > persistence > peak_temperature",
            "duration_first": True,
            "verdict_thresholds": {
                "NOAA_heat_index": "27°C Caution, 32°C Extreme Caution",
                "OSHA_high_heat": "32.2°C (90°F)",
                "EPA_impervious_limit": "60%",
                "USDA_canopy_target": "15%",
            },
            "composite_score": "SiteVerdict Derived Score (0-100, higher = better). NOT an official FortyGuard standard.",
        },
        "recommended_site": analysis.get("top_site_id", ""),
        "recommendation_text": analysis.get("recommendation", ""),
        "sites": sites_context,
    }

    return json.dumps(context, indent=2, default=str)


# ── Chat ───────────────────────────────────────────────────────────────

def chat(
    user_message: str,
    analysis_context: str,
    conversation_history: list[dict] | None = None,
) -> str:
    """Send a chat message to Gemini with the analysis context.

    Args:
        user_message: The user's question.
        analysis_context: Compact JSON from build_analysis_context().
        conversation_history: Optional list of {"role": "user"|"model", "parts": [...]}.

    Returns:
        Gemini's response text.

    Raises:
        RuntimeError: If Gemini is unavailable or returns an error.
    """
    if not _ensure_configured():
        raise RuntimeError("GEMINI_API_KEY is not configured. AI Copilot is unavailable.")

    # Build the prompt with context
    full_prompt = f"""SITEVERDICT ANALYSIS CONTEXT:
{analysis_context}

CONVERSATION HISTORY:
{json.dumps(conversation_history[-10:] if conversation_history else [], default=str)}

USER QUESTION:
{user_message}

Answer based ONLY on the analysis context above. Do not invent any values."""

    try:
        response = _client.models.generate_content(
            model=_MODEL_NAME,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM_PROMPT,
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )
        if response.text:
            return response.text
        return "I was unable to generate a response. Please try rephrasing your question."
    except Exception as e:
        error_msg = str(e).lower()
        if "api_key" in error_msg or "permission" in error_msg or "invalid" in error_msg:
            raise RuntimeError(f"Gemini API authentication failed. Check GEMINI_API_KEY. ({e})")
        if "quota" in error_msg or "rate" in error_msg:
            raise RuntimeError(f"Gemini API rate limit exceeded. Please wait and try again. ({e})")
        if "timeout" in error_msg or "deadline" in error_msg:
            raise RuntimeError(f"Gemini API request timed out. Please try again. ({e})")
        raise RuntimeError(f"Gemini API error: {e}")


# ── Report generation ──────────────────────────────────────────────────

def generate_report(analysis_context: str) -> str:
    """Generate a formal due-diligence report using Gemini.

    Args:
        analysis_context: Compact JSON from build_analysis_context().

    Returns:
        Full due-diligence report text.

    Raises:
        RuntimeError: If Gemini is unavailable or returns an error.
    """
    if not _ensure_configured():
        raise RuntimeError("GEMINI_API_KEY is not configured. AI Copilot is unavailable.")

    full_prompt = f"""SITEVERDICT ANALYSIS CONTEXT:
{analysis_context}

Generate a formal enterprise due-diligence report using ONLY the data above.
Follow the exact section structure specified in your instructions.
Do not invent any values not present in the context."""

    try:
        response = _client.models.generate_content(
            model=_MODEL_NAME,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                system_instruction=_REPORT_PROMPT,
                temperature=0.3,
                max_output_tokens=4096,
            ),
        )
        if response.text:
            return response.text
        return "Unable to generate report. Please try again."
    except Exception as e:
        error_msg = str(e).lower()
        if "api_key" in error_msg or "permission" in error_msg or "invalid" in error_msg:
            raise RuntimeError(f"Gemini API authentication failed. Check GEMINI_API_KEY. ({e})")
        if "quota" in error_msg or "rate" in error_msg:
            raise RuntimeError(f"Gemini API rate limit exceeded. Please wait and try again. ({e})")
        if "timeout" in error_msg or "deadline" in error_msg:
            raise RuntimeError(f"Gemini API request timed out. Please try again. ({e})")
        raise RuntimeError(f"Gemini API error: {e}")
