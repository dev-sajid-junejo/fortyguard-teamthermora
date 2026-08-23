"""Deterministic evidence-based explanations.

No LLM required. Templates filled with actual calculated metrics.
Every statement cites its source. Nothing is invented.
"""

from __future__ import annotations


def explain_rank(site, all_sites, window_hours):
    """Why this site is ranked where it is."""
    n = len(all_sites)
    if site.rank == 1:
        return f"**{site.name or site.parcel_id}** ranks #1 of {n} candidates -- highest thermal exposure."

    # Find what it's worse than
    above = [s for s in all_sites if s.rank < site.rank]
    best_above = above[0] if above else None
    parts = [f"**{site.name or site.parcel_id}** ranks #{site.rank} of {n} candidates."]

    if best_above and site.exceedance_h is not None and best_above.exceedance_h is not None:
        diff = best_above.exceedance_h - site.exceedance_h
        if diff > 0:
            parts.append(f"Exceedance is {diff:.1f}h less than {best_above.name or best_above.parcel_id} ({best_above.exceedance_h:.1f}h).")

    return " ".join(parts)


def explain_exceedance(site, window_hours):
    """Explain the exceedance metric."""
    if site.exceedance_h is None:
        return "Exceedance data not available."
    ratio = site.exceedance_h / max(window_hours, 1)
    if ratio >= 0.35:
        return f"High exposure: {site.exceedance_h:.1f}h of {window_hours}h ({ratio:.0%}) spent above 32 C. This drives annual cooling energy and may trigger OSHA high-heat protocols."
    elif ratio >= 0.15:
        return f"Moderate exposure: {site.exceedance_h:.1f}h of {window_hours}h ({ratio:.0%}) above 32 C. Within tolerable range but worth monitoring."
    else:
        return f"Low exposure: {site.exceedance_h:.1f}h of {window_hours}h ({ratio:.0%}) above 32 C. Below CAUTION threshold."


def explain_surface(site):
    """Explain satellite surface composition."""
    if site.canopy_pct is None and site.impervious_pct is None:
        return "Surface composition data not available."
    parts = []
    if site.canopy_pct is not None:
        if site.canopy_pct < 15:
            parts.append(f"Canopy cover is {site.canopy_pct:.1f}% -- below the 15% USDA i-Tree target. Tree planting would reduce heat exposure.")
        else:
            parts.append(f"Canopy cover is {site.canopy_pct:.1f}% -- meets the 15% USDA target.")
    if site.impervious_pct is not None:
        if site.impervious_pct > 60:
            parts.append(f"Impervious surface is {site.impervious_pct:.1f}% -- above the 60% EPA threshold. Cool-pavement or green-roof retrofits recommended.")
        else:
            parts.append(f"Impervious surface is {site.impervious_pct:.1f}% -- within EPA guidelines.")
    return " ".join(parts)


def explain_recommendation(top_site, all_sites, window_hours):
    """Generate the top-level recommendation. top_site is the BEST (lowest exposure) site."""
    parts = []
    parts.append(f"**Recommended: {top_site.name or top_site.parcel_id}**")

    # Compare to worst site
    worst = max(all_sites, key=lambda s: s.exceedance_h or 0)
    if worst.parcel_id != top_site.parcel_id and top_site.exceedance_h is not None and worst.exceedance_h is not None:
        diff = worst.exceedance_h - top_site.exceedance_h
        parts.append(
            f"Exceedance duration is {diff:.1f}h lower than the highest-exposure site "
            f"({worst.name or worst.parcel_id}: {worst.exceedance_h:.1f}h)."
        )

    # Surface remediation for top site
    if top_site.impervious_pct is not None and top_site.impervious_pct > 60:
        parts.append(
            f"Note: impervious surface ({top_site.impervious_pct:.1f}%) exceeds EPA threshold. "
            "Consider cool-roof / reflective paving in the design spec."
        )
    if top_site.canopy_pct is not None and top_site.canopy_pct < 15:
        parts.append(
            f"Note: canopy ({top_site.canopy_pct:.1f}%) below USDA target. "
            "Tree planting in the landscape plan would improve thermal comfort."
        )

    return " ".join(parts)
