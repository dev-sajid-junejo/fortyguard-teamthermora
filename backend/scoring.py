"""SiteVerdict scoring model — Layer A/B/C.

Layer A: Traceable PASS / CAUTION / FAIL verdicts against published thresholds.
Layer B: Comparative ranking (exceedance -> persistence -> peak).
Layer C: Optional transparent composite index (0-100).

Every threshold cites its authority. Nothing is invented.
"""

from __future__ import annotations

from .models import SiteMetrics, Verdict

# Published thresholds [OFFICIAL notebook constants]
NOAA_CAUTION_C = 27.0
NOAA_EXTREME_C = 32.0
OSHA_HIGH_C = 32.2
EXCEEDANCE_C = 32.0
CANOPY_TARGET = 15.0
IMPERVIOUS_LIMIT = 60.0


# Layer A: Verdict bins

def _verdict_peak(peak_c):
    if peak_c is None:
        return Verdict(metric="Peak Temperature", unit="C", verdict="N/A")
    v = "PASS" if peak_c < NOAA_CAUTION_C else ("CAUTION" if peak_c < NOAA_EXTREME_C else "FAIL")
    return Verdict(metric="Peak Temperature", value=round(peak_c, 2), unit="C", verdict=v,
                   threshold=f"< {NOAA_CAUTION_C}C PASS | {NOAA_CAUTION_C}-{NOAA_EXTREME_C}C CAUTION | >= {NOAA_EXTREME_C}C FAIL",
                   authority="NOAA heat-index Caution (27 C) / Extreme Caution (32 C)")


def _verdict_exceedance(exceedance_h, window_hours):
    if exceedance_h is None:
        return Verdict(metric="Exceedance Duration", unit="h", verdict="N/A")
    ratio = exceedance_h / max(window_hours, 1)
    v = "PASS" if ratio < 0.15 else ("CAUTION" if ratio < 0.35 else "FAIL")
    lo = window_hours * 0.15
    hi = window_hours * 0.35
    return Verdict(metric="Exceedance Duration", value=round(exceedance_h, 1), unit="h", verdict=v,
                   threshold=f"< {lo:.0f}h PASS | {lo:.0f}-{hi:.0f}h CAUTION | >= {hi:.0f}h FAIL",
                   authority=f"Hours above {EXCEEDANCE_C}C (NOAA Extreme threshold)")


def _verdict_persistence(persistence_h, window_hours):
    if persistence_h is None:
        return Verdict(metric="Persistence", unit="h", verdict="N/A")
    ratio = persistence_h / max(window_hours, 1)
    v = "PASS" if ratio < 0.05 else ("CAUTION" if ratio < 0.15 else "FAIL")
    lo = window_hours * 0.05
    hi = window_hours * 0.15
    return Verdict(metric="Persistence", value=round(persistence_h, 1), unit="h", verdict=v,
                   threshold=f"< {lo:.0f}h PASS | {lo:.0f}-{hi:.0f}h CAUTION | >= {hi:.0f}h FAIL",
                   authority=f"Longest run above {EXCEEDANCE_C}C (overnight heat-shed / OSHA consecutive-day)")


def _verdict_comfort(hi_c):
    if hi_c is None:
        return Verdict(metric="Comfort (Heat Index at Hot Hour)", unit="C", verdict="N/A")
    v = "PASS" if hi_c < NOAA_CAUTION_C else ("CAUTION" if hi_c < NOAA_EXTREME_C else "FAIL")
    return Verdict(metric="Comfort (Heat Index at Hot Hour)", value=round(hi_c, 2), unit="C", verdict=v,
                   threshold=f"< {NOAA_CAUTION_C}C PASS | {NOAA_CAUTION_C}-{NOAA_EXTREME_C}C CAUTION | >= {NOAA_EXTREME_C}C FAIL",
                   authority="NOAA heat-index bands (at argmax apparent temperature)")


def _verdict_osha(hi_c):
    if hi_c is None:
        return Verdict(metric="OSHA High-Heat Trigger", unit="C", verdict="N/A")
    v = "CAUTION" if hi_c >= OSHA_HIGH_C else "PASS"
    return Verdict(metric="OSHA High-Heat Trigger", value=round(hi_c, 2), unit="C", verdict=v,
                   threshold=f">= {OSHA_HIGH_C}C triggers OSHA high-heat protocol",
                   authority="OSHA 90 F (32.2 C) high-heat trigger")


def _verdict_canopy(canopy_pct):
    if canopy_pct is None:
        return Verdict(metric="Canopy Cover", unit="%", verdict="N/A")
    v = "PASS" if canopy_pct >= CANOPY_TARGET else "FAIL"
    return Verdict(metric="Canopy Cover", value=round(canopy_pct, 1), unit="%", verdict=v,
                   threshold=f">= {CANOPY_TARGET}% PASS | < {CANOPY_TARGET}% FAIL",
                   authority="USDA i-Tree planting indication")


def _verdict_impervious(impervious_pct):
    if impervious_pct is None:
        return Verdict(metric="Impervious Surface", unit="%", verdict="N/A")
    v = "FAIL" if impervious_pct > IMPERVIOUS_LIMIT else "PASS"
    return Verdict(metric="Impervious Surface", value=round(impervious_pct, 1), unit="%", verdict=v,
                   threshold=f"<= {IMPERVIOUS_LIMIT}% PASS | > {IMPERVIOUS_LIMIT}% FAIL",
                   authority="EPA Heat Island cool-surface retrofit")


def compute_verdicts(site, window_hours):
    return [
        _verdict_peak(site.peak_c),
        _verdict_exceedance(site.exceedance_h, window_hours),
        _verdict_persistence(site.persistence_h, window_hours),
        _verdict_comfort(site.hi_c_at_hot_hour),
        _verdict_osha(site.hi_c_at_hot_hour),
        _verdict_canopy(site.canopy_pct),
        _verdict_impervious(site.impervious_pct),
    ]


# Layer B: Comparative ranking

def rank_sites(sites):
    """Rank by exceedance -> persistence -> peak (duration-first)."""
    def sort_key(s):
        exc = s.exceedance_h if s.exceedance_h is not None else 9999
        per = s.persistence_h if s.persistence_h is not None else 9999
        peak = s.peak_c if s.peak_c is not None else 9999
        return (-exc, -per, -peak)

    ranked = sorted(sites, key=sort_key)
    n = len(ranked)
    for i, site in enumerate(ranked):
        site.rank = i + 1
        site.percentile = round(100.0 * (n - 1 - i) / max(n - 1, 1), 1)
    return ranked


# Layer C: Composite index

DEFAULT_WEIGHTS = {"exceedance": 30, "peak": 20, "comfort": 20, "surface": 20, "persistence": 10}


def _normalize(value, low, high):
    if value is None:
        return 50.0
    clamped = max(low, min(high, value))
    return 100.0 * (high - clamped) / (high - low)


def compute_composite(site, window_hours, weights=None):
    """Transparent composite (0-100, higher = better). Each component normalized to published thresholds."""
    w = weights or DEFAULT_WEIGHTS
    total_w = sum(w.values()) or 1

    exc_score = _normalize(site.exceedance_h, 0, window_hours)
    peak_score = _normalize(site.peak_c, NOAA_CAUTION_C, NOAA_EXTREME_C)
    comfort_score = _normalize(site.hi_c_at_hot_hour, NOAA_CAUTION_C, NOAA_EXTREME_C)
    canopy_s = _normalize(site.canopy_pct, 0, CANOPY_TARGET) if site.canopy_pct is not None else 50
    imp_s = _normalize(site.impervious_pct, IMPERVIOUS_LIMIT, 100) if site.impervious_pct is not None else 50
    surface_score = (canopy_s + imp_s) / 2
    per_score = _normalize(site.persistence_h, 0, window_hours * 0.5)

    composite = (
        w.get("exceedance", 30) * exc_score +
        w.get("peak", 20) * peak_score +
        w.get("comfort", 20) * comfort_score +
        w.get("surface", 20) * surface_score +
        w.get("persistence", 10) * per_score
    ) / total_w
    return round(composite, 1)
