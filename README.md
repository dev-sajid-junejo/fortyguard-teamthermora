# SiteVerdict

**Heat-Risk Due-Diligence Platform for Real-Estate Site Selection**

> FortyGuard Hackathon'26 — TeamThermora

---

## Problem

When companies evaluate candidate sites for new facilities, offices, or developments, they assess cost, zoning, and logistics — but rarely **hyperlocal heat risk**. Peak temperature alone is misleading: two sites 2 km apart can have identical peak temps but vastly different **exposure duration** (hours above dangerous thresholds). This directly impacts worker safety, cooling costs, and long-term viability.

## Solution

SiteVerdict is an AI heat-risk due-diligence copilot. Given a set of candidate parcel boundaries, it:

1. **Ingests** GeoJSON parcel boundaries
2. **Analyzes** each site using FortyGuard's hyperlocal temperature intelligence (heatmap tcm, exceedance, persistence)
3. **Ranks** sites by exposure duration — not just peak temperature
4. **Scores** with traceable PASS / CAUTION / FAIL verdicts anchored to NOAA, OSHA, EPA, and USDA thresholds
5. **Recommends** the lowest-exposure site with evidence

**Key insight:** At parcel scale, peak temperature varies by <1°C across an entire city. But exceedance duration (hours above 32°C) varies by 2x — that's the discriminating metric.

## FortyGuard APIs Used

| Endpoint | Purpose in SiteVerdict |
|---|---|
| `POST /v1/heatmap` (tcm) | Area-weighted peak temperature per parcel |
| `POST /v1/heatmap` (exceedance) | Hours above 32°C threshold per parcel |
| `POST /v1/heatmap` (persistence) | Longest unbroken heat stretch per parcel |
| `POST /v1/satellite` | Canopy cover and impervious surface composition (top-N sites) |
| `POST /v1/env_params` | Heat index and comfort metrics at hot hour (top-N sites) |
| `GET /v1/status/{id}` | Async polling for heatmap results |

All endpoints are called server-side. The API key never reaches the browser.

## Architecture

```
SiteVerdict/
├── backend/                    # Python FastAPI server
│   ├── main.py                 # FastAPI app + analysis pipeline
│   ├── fortyguard_client.py    # FortyGuard API wrapper (submit → poll → result)
│   ├── scoring.py              # Layer A/B/C scoring model
│   ├── geometry.py             # Convex hull, buffer, area-weighted mean
│   ├── explanations.py         # Deterministic evidence-based explanations
│   ├── models.py               # Pydantic request/response models
│   ├── cache.py                # Disk caching for API responses
│   └── requirements.txt        # Python dependencies
├── frontend/                   # React + Vite + Tailwind CSS
│   └── src/
│       ├── App.jsx             # Main app with analysis flow
│       └── components/
│           ├── Map.jsx              # Leaflet map with TCM/Exceedance/Persistence layers
│           ├── RankedResults.jsx    # Ranked site cards with verdicts
│           ├── Recommendation.jsx   # Recommendation banner
│           ├── ComparisonMatrix.jsx # Side-by-side site metrics comparison
│           ├── CostEstimator.jsx    # Heat risk financial impact estimation
│           ├── CopilotChat.jsx      # Gemini AI copilot chat
│           ├── VerdictBadge.jsx     # PASS/CAUTION/FAIL badges
│           └── VerdictLegend.jsx    # Threshold source citations
├── data/                       # Cached FortyGuard API responses (demo)
│   ├── heatmaps/               # tcm, exceedance, persistence
│   ├── satellite/              # land-cover segmentation
│   ├── env_params/             # comfort metrics
│   └── parcels/                # GeoJSON parcel boundaries
├── .env.example                # Environment variable template
├── .gitignore                  # Prevents credential leaks
├── run.bat                     # One-click startup (Windows)
├── test_backend.py             # Backend smoke test
└── test_e2e.py                 # 12-assertion end-to-end test
```

**Tech Stack:**
- **Backend:** Python 3.11+, FastAPI, Shapely, Pydantic
- **Frontend:** React 19, Vite, Tailwind CSS, Leaflet
- **Data:** Cached FortyGuard API responses (NYC portfolio)

## How to Run Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm

### Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd SiteVerdict

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. (Optional) Configure API key for live mode
cp .env.example .env
# Edit .env and add your FortyGuard API key
```

### Run

**Windows:**
```bash
run.bat
```

**Manual:**
```bash
# Terminal 1 — Backend
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

### Run Tests

```bash
# Backend smoke test
python test_backend.py

# Full end-to-end test (12 assertions)
python test_e2e.py
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FORTYGUARD_API_KEY` | No (demo mode) | — | Your FortyGuard API key for live analysis |
| `FORTYGUARD_BASE_URL` | No | `https://api.fortyguard.com` | FortyGuard API base URL |

**Demo mode** works without any API key — it uses pre-cached FortyGuard responses.

## Security

- **API key stays server-side** — the frontend communicates with our backend via `/api` proxy; the key is never sent to the browser
- **`.env` is git-ignored** — your key will never be committed
- **Cached responses** in `data/` contain no credentials — only temperature data
- **Rotate immediately** if you suspect exposure: Dashboard > Profile > Regenerate

## Demo Mode (Default)

The default mode uses **pre-cached FortyGuard API responses** — zero API credits consumed.

**What runs in demo mode:**
- 6 candidate parcels in New York, NY
- 4,912 heatmap tiles at 80m granularity
- Cached exceedance + persistence layers
- Satellite segmentation for all sites
- Environmental parameters for all sites

**To run demo:**
Click **"Analyze Demo Portfolio"** in the UI. The full analysis pipeline runs against cached data.

## Live Data Mode

To run against live FortyGuard API data:

1. Set your API key in `.env`:
   ```
   FORTYGUARD_API_KEY=fg_live_your_key_here
   ```
2. Restart the backend
3. The `/api/analyze` endpoint accepts custom parcel boundaries and will call the FortyGuard API live

**Note:** Live mode consumes API credits. Cache aggressively during development.

## Scoring Model

### Layer A — Verdict Bins (threshold-triggered)

Each metric is binned PASS / CAUTION / FAIL against published thresholds:

| Metric | Threshold | Authority |
|---|---|---|
| Peak Temperature | < 27°C PASS, 27–32°C CAUTION, ≥ 32°C FAIL | NOAA heat-index Caution / Extreme Caution |
| Exceedance Duration | Tiered vs window hours | NOAA Extreme threshold (32°C) |
| Persistence | Tiered vs window hours | OSHA consecutive-day heat exposure |
| Heat Index at Hot Hour | < 27°C PASS, 27–32°C CAUTION, ≥ 32°C FAIL | NOAA heat-index bands |
| OSHA High-Heat Trigger | ≥ 32.2°C | OSHA 90°F high-heat protocol |
| Canopy Cover | ≥ 15% PASS | USDA i-Tree planting target |
| Impervious Surface | ≤ 60% PASS | EPA Heat Island cool-surface retrofit |

### Layer B — Comparative Ranking

Sites are sorted by: **exceedance → persistence → peak** (duration-first).

### Layer C — Composite Score (transparent, optional)

A weighted blend normalized to published thresholds (0–100, higher = better). **Clearly labeled as a derived metric, not an official FortyGuard standard.** Weights: exceedance 30%, peak 20%, comfort 20%, surface 20%, persistence 10%.

## Real FortyGuard API Request + Response

The following is an actual exceedance heatmap request made against the FortyGuard API during development:

### Request

```bash
curl -X POST https://api.fortyguard.com/v1/heatmap \
  -H "api-key: <REDACTED>" \
  -H "Content-Type: application/json" \
  -d '{
    "polygon_aoi": {
      "type": "FeatureCollection",
      "features": [{
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [-74.010, 40.740],
            [-73.990, 40.740],
            [-73.990, 40.755],
            [-74.010, 40.755],
            [-74.010, 40.740]
          ]]
        }
      }]
    },
    "date_time": {
      "start_date": "2026-08-03",
      "end_date": "2026-08-03",
      "filter_type": 4
    },
    "granularity": 80,
    "analytic_type": "exceedance",
    "threshold": 32,
    "direction": "above"
  }'
```

### Response (cached)

```json
{
  "map_data": {
    "type": "FeatureCollection",
    "features": [
      {
        "id": "0",
        "type": "Feature",
        "properties": { "tile_id": 0, "value": 0.0 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [-74.005, 40.742],
            [-73.998, 40.742],
            [-73.998, 40.748],
            [-74.005, 40.748],
            [-74.005, 40.742]
          ]]
        }
      }
    ]
  },
  "stats_data": {
    "activity_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "analytic_type": "exceedance",
    "units": "hour",
    "n_cells": 4912,
    "min": 0.0,
    "max": 0.0,
    "mean": 0.0
  }
}
```

**Interpretation:** Each tile's `value` is the number of hours above 32°C during the window. NYC August temperatures stayed below the 32°C threshold, so all tiles show 0h exceedance — expected for this climate. In hotter regions (e.g., Phoenix, Miami), these values would be significantly higher.

## Known Limitations

- **Parcel-scale peak temperature is flat** — <1°C variation across a 14 km² area. This is why SiteVerdict leads with exceedance duration, not peak temperature.
- **env_params resolves on a coarser grid** — two sites 1.4 km apart can return identical arrays. Used only for district-level comfort characterisation, not site discrimination.
- **Satellite tiles are site-vicinity, not parcel-exact** — the tile is centred on the parcel centroid, covering the surrounding area.
- **Demo mode uses cached data** — the study date (2026-08-03) and results are fixed. Live mode required for current data.
- **U.S. locations only** — FortyGuard API coverage is limited to the United States.
- **No forecasting** — SiteVerdict is a historical due-diligence tool. FortyGuard's 12-hour forecast capability is not used.

## What Doesn't Work Yet

- Custom parcel analysis via the UI (only demo mode is wired to the frontend; the `/api/analyze` endpoint works but the UI doesn't have a parcel upload flow)
- PDF export of the analysis results
- Rank-stability sensitivity test under weight perturbation (planned Layer C feature)

## Credits

- FortyGuard API — hackathon participants receive Premium access with 2M credits
- Caching-first design: demo mode uses zero credits
- Failed API tasks are free; credits only deduct on successful completion

---

Built by TeamThermora for the FortyGuard Hackathon'26
