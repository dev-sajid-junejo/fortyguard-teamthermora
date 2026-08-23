"""Quick smoke test for demo mode."""
import sys
sys.path.insert(0, ".")

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

# 1. Health
r = client.get("/api/health")
assert r.status_code == 200
h = r.json()
print(f"Health: {h}")
assert h["api_key_configured"] is True

# 2. Demo parcels
r = client.get("/api/demo/parcels")
assert r.status_code == 200
p = r.json()
print(f"Parcels: {len(p['features'])} features")
assert len(p["features"]) == 6

# 3. Demo analyze
print("Running demo analysis (cached, no API credits)...")
r = client.post("/api/demo/analyze", timeout=120)
assert r.status_code == 200, f"Demo failed: {r.status_code} {r.text[:500]}"
d = r.json()
print(f"Sites: {len(d['sites'])} | Top: {d['top_site_id']} | Tiles: {d['n_tiles']}")
assert len(d["sites"]) == 6
for s in d["sites"]:
    canopy = s.get("canopy_pct", "N/A")
    imp = s.get("impervious_pct", "N/A")
    hi = s.get("hi_c_at_hot_hour", "N/A")
    print(f"  #{s['rank']} {s['name']}: exc={s['exceedance_h']}h per={s['persistence_h']}h score={s['composite_score']} canopy={canopy}% imp={imp}% hi={hi}")

print("\n--- Recommendation ---")
print(d["recommendation"][:300])

# Check satellite enrichment worked
has_canopy = any(s.get("canopy_pct") is not None for s in d["sites"])
print(f"\nSatellite enrichment: {'OK' if has_canopy else 'MISSING'}")

print("\nDEMO MODE: ALL TESTS PASSED")
