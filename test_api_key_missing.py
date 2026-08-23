"""Test that calling /api/analyze with refresh=true returns a clear 503 when FORTYGUARD_API_KEY is not configured."""
import os
import sys
import importlib

# Ensure the project root is on path
sys.path.insert(0, ".")

def test_analyze_no_api_key():
    # Force environment to have an empty API key so load_dotenv in backend.main does not overwrite it
    os.environ["FORTYGUARD_API_KEY"] = ""

    # Reload backend.main to pick up the current environment
    if "backend.main" in sys.modules:
        del sys.modules["backend.main"]
    import backend.main as main

    from fastapi.testclient import TestClient

    client = TestClient(main.app)

    # Minimal valid parcel inside US bounds
    parcels = [
        {
            "parcel_id": "test-1",
            "name": "Test Parcel",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-121.898, 37.328],
                    [-121.892, 37.328],
                    [-121.892, 37.334],
                    [-121.898, 37.334],
                    [-121.898, 37.328]
                ]]
            },
            "properties": {}
        }
    ]

    payload = {
        "parcels": parcels,
        "study_date": "2026-08-03",
        "granularity": 80,
        "buffer_m": 400,
        "exceedance_threshold_c": 32.0,
        "refresh": True
    }

    resp = client.post("/api/analyze", json=payload)
    assert resp.status_code == 503, resp.text
    body = resp.json()
    detail = body.get("detail")
    assert isinstance(detail, dict)
    assert detail.get("code") == "NO_API_KEY"
