"""Comprehensive end-to-end test for SiteVerdict backend."""
import sys
sys.path.insert(0, ".")

from backend.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

print("=" * 60)
print("SITEVERDICT END-TO-END TEST")
print("=" * 60)

# 1. Health check
r = client.get("/api/health")
assert r.status_code == 200
print("[PASS] Health check:", r.json())

# 2. Demo parcels
r = client.get("/api/demo/parcels")
assert r.status_code == 200
parcels = r.json()
assert len(parcels["features"]) == 6
print(f"[PASS] Demo parcels: {len(parcels['features'])} parcels loaded")

# 3. Demo analysis
r = client.post("/api/demo/analyze")
assert r.status_code == 200
data = r.json()
print(f"[PASS] Demo analysis: {len(data['sites'])} sites ranked")

# 4. Verify study metadata
assert data["study_date"] == "2026-08-03"
assert data["window_hours"] == 168
assert data["n_tiles"] > 0
print(f"[PASS] Metadata: {data['study_date']}, {data['window_hours']}h, {data['n_tiles']} tiles")

# 5. Verify all 6 sites have metrics
for site in data["sites"]:
    assert site["peak_c"] is not None, f"{site['parcel_id']} missing peak_c"
    assert site["exceedance_h"] is not None, f"{site['parcel_id']} missing exceedance_h"
    assert site["persistence_h"] is not None, f"{site['parcel_id']} missing persistence_h"
    assert site["rank"] > 0
    assert len(site["verdicts"]) >= 5
    assert site["composite_score"] is not None
print("[PASS] All 6 sites have peak, exceedance, persistence, verdicts, composite")

# 6. Verify ranking is duration-first (exceedance descending)
exc_values = [s["exceedance_h"] for s in data["sites"]]
assert exc_values == sorted(exc_values, reverse=True), "Ranking not duration-first"
print(f"[PASS] Ranking is duration-first: {exc_values}")

# 7. Verify verdicts cite authorities
for site in data["sites"]:
    for v in site["verdicts"]:
        if v["verdict"] != "N/A":
            assert v["authority"], f"Verdict {v['metric']} missing authority"
            assert v["threshold"], f"Verdict {v['metric']} missing threshold"
print("[PASS] All verdicts have authority citations and thresholds")

# 8. Verify enrichment data for top-3 sites
enriched = [s for s in data["sites"] if s.get("canopy_pct") is not None]
assert len(enriched) >= 1, "No enrichment data found"
print(f"[PASS] Enrichment data found for {len(enriched)} sites")

# 9. Verify recommendation
assert data["recommendation"]
assert "Recommended:" in data["recommendation"]
assert data["top_site_id"]
print(f"[PASS] Recommendation: {data['top_site_id']}")

# 10. Verify composite scores are in 0-100 range
for site in data["sites"]:
    assert 0 <= site["composite_score"] <= 100, f"Score out of range: {site['composite_score']}"
print("[PASS] All composite scores in 0-100 range")

# 11. Verify best site (lowest exposure) is recommended
best = data["sites"][-1]
assert data["top_site_id"] == best["parcel_id"]
print(f"[PASS] Recommended site is lowest exposure: {best['name']} ({best['exceedance_h']}h)")

# 12. Verify explanations
for site in data["sites"]:
    assert site["explanation"], f"{site['parcel_id']} missing explanation"
print("[PASS] All sites have explanations")

print()
print("=" * 60)
print("ALL TESTS PASSED")
print("=" * 60)

# Summary
print()
print("SUMMARY:")
print(f"  Study: {data['study_date']} ({data['window_start']} to {data['window_end']})")
print(f"  Tiles: {data['n_tiles']}")
print(f"  Sites: {len(data['sites'])}")
print()
for site in data["sites"]:
    best_marker = " <-- RECOMMENDED" if site["parcel_id"] == data["top_site_id"] else ""
    print(f"  #{site['rank']} {site['name']:25s} peak={site['peak_c']:5.1f}C  exc={site['exceedance_h']:5.1f}h  per={site['persistence_h']:4.1f}h  score={site['composite_score']:5.1f}{best_marker}")
print()
print(f"  Recommendation: {data['recommendation'][:200]}")
