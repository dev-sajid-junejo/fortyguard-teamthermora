"""Quick smoke test for live mode — minimal request to verify API auth + response structure."""
import sys, json, os
sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv(".env")

from backend.fortyguard_client import FortyGuardClient

api_key = os.getenv("FORTYGUARD_API_KEY")
client = FortyGuardClient(api_key=api_key, timeout=60.0)

# Small test: single point heatmap for one parcel using client's submit+poll
aoi = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-121.898, 37.328],
                [-121.892, 37.328],
                [-121.892, 37.334],
                [-121.898, 37.334],
                [-121.898, 37.328]
            ]]
        }
    }]
}

print(f"Calling create_heatmap (submit+poll, timeout=120s)...")
try:
    # Step 1: submit only
    activity_id = client._submit("/v1/heatmap", {
        "polygon_aoi": aoi,
        "date_time": {"start_date": "2026-07-28", "end_date": "2026-08-03", "filter_type": 4},
        "granularity": 80,
        "analytic_type": "tcm",
    })
    print(f"activity_id: {activity_id}")

    # Step 2: poll status
    import time
    for attempt in range(20):
        time.sleep(5)
        resp = client._session.get(f"{client.base_url}/v1/status/{activity_id}", timeout=30)
        body = resp.json()
        data = body.get("data", {})
        status = str(data.get("status", "unknown")).lower()
        print(f"  [{attempt+1}] status={status} data_keys={list(data.keys())}")
        if status in ("succeeded", "completed"):
            print(f"  Full data: {json.dumps(data, indent=2)[:2000]}")
            # Try result endpoint
            resp2 = client._session.get(f"{client.base_url}/v1/result/{activity_id}", timeout=30)
            print(f"  /v1/result status: {resp2.status_code}")
            if resp2.ok:
                body2 = resp2.json()
                print(f"  result body: {json.dumps(body2, indent=2)[:2000]}")
            print("DONE")
            break
        if status in ("failed", "error"):
            print(f"  FAILED: {data}")
            break
except Exception as e:
    import traceback; traceback.print_exc()
    print(f"ERROR: {type(e).__name__}: {e}")
