"""Quick live API test script."""
import os, sys, json, time
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

sys.path.insert(0, str(Path(__file__).parent))
from backend.fortyguard_client import FortyGuardClient
from backend.geometry import build_aoi

api_key = os.getenv("FORTYGUARD_API_KEY")
client = FortyGuardClient(api_key=api_key, timeout=15.0)

parcels = json.loads(Path("data/parcels/parcel_portfolio_nyc_sample.geojson").read_text())["features"]
all_parcels = [
    {"parcel_id": f["properties"]["parcel_id"], "name": f["properties"].get("name", ""),
     "geometry": f["geometry"], "properties": f["properties"]}
    for f in parcels
]
aoi, aoi_km2, _ = build_aoi(all_parcels, 400)
print(f"AOI type: {aoi.get('type')}, area: {aoi_km2:.2f} km2")

fc = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry": aoi}]}

for analytic in ["tcm", "exceedance", "persistence"]:
    threshold = 32.0 if analytic != "tcm" else None
    direction = "above" if analytic != "tcm" else None
    print(f"\n--- {analytic} ---")
    t0 = time.time()
    try:
        result = client.create_heatmap(
            fc, "2026-08-03", filter_type=4, granularity=80,
            analytic_type=analytic, end_date="2026-08-03",
            threshold=threshold, direction=direction, timeout=30.0,
        )
        elapsed = time.time() - t0
        map_data = result.get("map_data", {})
        feats = map_data.get("features", [])
        stats = result.get("stats_data", {})
        print(f"  Done in {elapsed:.1f}s: {len(feats)} tiles, stats_keys={list(stats.keys())[:3]}")
        if feats:
            props = feats[0].get("properties", {})
            lat = feats[0]["geometry"]["coordinates"][0][0][1]
            print(f"  First tile: lat={lat:.4f}, props={list(props.keys())}")
    except Exception as e:
        elapsed = time.time() - t0
        print(f"  FAILED in {elapsed:.1f}s: {e}")

# Also test satellite and env_params
print("\n--- satellite (NYC-001 centroid) ---")
centroid = parcels[0]["geometry"]["coordinates"][0][0]
t0 = time.time()
try:
    result = client.satellite_segmentation(
        latitude=centroid[1], longitude=centroid[0],
        start_date="2026-08-03", filter_type=3, granularity=100, timeout=30.0,
    )
    elapsed = time.time() - t0
    seg = result.get("segmentation", {})
    if "segments" in seg:
        seg = seg["segments"]
    print(f"  Done in {elapsed:.1f}s: segments={list(seg.keys())[:5]}")
except Exception as e:
    elapsed = time.time() - t0
    print(f"  FAILED in {elapsed:.1f}s: {e}")

print("\n--- env_params (NYC-001 centroid) ---")
t0 = time.time()
try:
    result = client.environmental_parameters(
        latitude=centroid[1], longitude=centroid[0],
        temperature=25.0, start_date="2026-08-03", filter_type=3, timeout=30.0,
    )
    elapsed = time.time() - t0
    locs = result.get("locations", [])
    print(f"  Done in {elapsed:.1f}s: locations={len(locs)}")
except Exception as e:
    elapsed = time.time() - t0
    print(f"  FAILED in {elapsed:.1f}s: {e}")
