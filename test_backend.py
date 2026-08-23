"""Quick smoke test for the SiteVerdict backend."""
import sys
sys.path.insert(0, ".")

from backend.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

# Health check
r = client.get("/api/health")
print("Health:", r.json())

# Demo analysis
r2 = client.post("/api/demo/analyze")
print("Status:", r2.status_code)

if r2.status_code == 200:
    data = r2.json()
    print("Study date:", data["study_date"])
    wh = data["window_hours"]
    print("Window:", data["window_start"], "-", data["window_end"], f"({wh}h)")
    print("Tiles:", data["n_tiles"])
    print("Sites:", len(data["sites"]))
    for s in data["sites"]:
        name = s["name"]
        peak = s["peak_c"]
        exc = s["exceedance_h"]
        per = s["persistence_h"]
        comp = s["composite_score"]
        print(f"  #{s['rank']} {name:25s} peak={peak}C exc={exc}h per={per}h composite={comp}")
        for v in s.get("verdicts", []):
            print(f"       {v['metric']}: {v['value']} {v['unit']} -> {v['verdict']}")
    print("Top:", data["top_site_id"])
    print()
    print("Recommendation:", data["recommendation"][:300])
else:
    print("Error:", r2.text[:500])
