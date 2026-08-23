# SiteVerdict — Technical Discovery Report

> Product-discovery deliverable for TeamThermora's hackathon'26 submission. Companion to `FORTYGUARD_HACKATHON_CONTEXT.md` (research baseline). This report is **research + design only — no application code, no implementation plan.**
>
> **Label legend** (same convention as the context file):
> - `[OFFICIAL]` — official FortyGuard sources (hackathon team, docs, website, quickstart repo).
> - `[TECHNICAL]` — from the FortyGuard Assistant (organizer-operated support bot); organizer guidance, not a formal ruling.
> - `[PARTICIPANT]` — hackathon participant reports; unconfirmed.
> - `[INFERENCE]` — our own analysis/derivation; explicitly opinion, not official.
>
> **Verification base:** a fresh clone of `FortyGuard-Tech/temperature-api-quickstart` (30 IPs cached under the repo's `data/`) was inspected on 21 Aug 2026. All response schemas below were read from **real cached API responses**, not docs or guesses.
>
> **Security note:** no API keys or credentials in this file.

---

## 1. Executive summary

**SiteVerdict** is a heat-risk due-diligence copilot for real-estate/development teams comparing several candidate sites before committing diligence budget. Given a set of parcel boundaries, it:

1. Reuses the official **portfolio-screening pattern** (one AOI-wide heatmap → area-weighted mean per parcel) to rank candidates on a common scale.
2. Turns each measurement into **traceable verdicts** (PASS / CAUTION / FAIL) anchored to thresholds some authority published — NOAA, OSHA, EPA, USDA, ASHRAE — *never* fabricated numbers.
3. Explains **why** the top sites are hot via satellite + street-view segmentation (hardscape vs. canopy), so the shortlist survives an investment-committee question.
4. Is **cost-staged on purpose**: cheap AOI heatmaps bill once for the whole portfolio; expensive per-point endpoints run only on the top-N candidates.
5. Ships a committee-ready bundle (ranked shortlist, verdict table, maps, CSV, narrative PDF) — matching the demo-friendly `reportAll` pattern the official repo uses.

**Why now:** the official quickstart repo ships *two real-estate use-case notebooks* (`parcel_site_due_diligence.ipynb`, `parcel_portfolio_heat_screening.ipynb`) — the organizers themselves demonstrate FortyGuard's commercial pull in exactly this buyer. SiteVerdict formalizes the multi-parcel screening flow into a re-runnable, rankable, defensible tool.

---

## 2. Confirmed API ground truth (from cached responses, quickstart repo)

> All facts here are `[OFFICIAL]` (repo README/client) or `[TECHNICAL]` (Assistant) unless tagged otherwise; schema keys were read directly from cached JSON files in `data/`.

### 2.1 Request / response flow

- All analysis endpoints are **asynchronous**: `POST /v1/<endpoint>` returns `{data: {activity_id}}`; you poll `GET /v1/status/{activity_id}` until the task terminates. The repo client wraps this (`create_heatmap`, `environmental_parameters`, `satellite_segmentation`, `street_view_segmentation`, `heat_intelligence`, `fetch_api_key_usage`, `fetch_api_key_custom_usage`). [OFFICIAL]
- Status strings matched case-insensitively (`Completed`/`completed`/`succeeded`). [OFFICIAL]
- **Failed tasks are free; credits deduct only at `Completed`.** [OFFICIAL — README + context]
- Coverage is **U.S. only**; catalog covers **2021-01-01 → today** (future dates fail). GeoJSON coordinates are `[longitude, latitude]`. [OFFICIAL]

### 2.2 `POST /v1/heatmap` — base thermal layer

Request (from client + samples):
```json
{
  "polygon_aoi": {"type":"FeatureCollection","features":[{...Polygon...}]},
  "date_time": {"start_date":"2024-07-15","filter_type":3},
  "granularity": 100,
  "analytic_type": "tcm",
  "threshold": null, "direction": null
}
```
- `filter_type`: 1=single hour, 2=range of hours, 3=single day (full 24 h), 4=range of days (`end_date`, window capped ~31 days). [OFFICIAL]
- `granularity`: 60 / 80 / 100 m. [OFFICIAL]
- `analytic_type`: `tcm` (default snapshot) | `time_of_measure` | `exceedance` | `persistence`. [OFFICIAL]

**`tcm` response (real cached file)** — `map_data` GeoJSON FeatureCollection; each feature:
```
properties: { "tile_id": int, "average_temperature": float, "min_temperature": float, "max_temperature": float }   // all °C
```
`stats_data`:
```
temperature_stats:  { "minimum", "maximum", "mean", "standard_deviation" }
overall_temperature_distribution          // histogram bins
normal_temperature_distribution: { "x_axis": [], "y_axis": [] }
temperature_frequency:              { "x_axis": [], "y_axis": [] }
```
Cached parcel AOI (Diridon, 2024-07-15, 60 m): **329 tiles**; stats mean 20.71 °C, sd 0.13 °C; single-tile mean 20.86 °C with min 16.35 / max 27.60 °C. Peak spread across the whole AOI: **< 1 °C**.

**Analysis heatmaps (exceedance / persistence / time_of_measure) — different schema.** [OFFICIAL — README + cached files]
Each feature: `properties: { "tile_id": int, "value": float }` — interpret via `stats_data.units`.
`stats_data`: `{ activity_id, analytic_type, units:"hour", n_cells, min, max, mean }`.
- `threshold` is in **°C** (default 30), `direction` `"above"`/`"below"` — required for exceedance/persistence.
- **`exceedance` is a count of hours (not degree-hours)**; `persistence` is the longest unbroken run of such hours.
- Cached portfolio cache: exceedance `min 25.5 → max 40.7 h` of `168` window hours ⇒ ~1.5× contrast range; peak-temp range only 0.94 °C. **Duration is the discriminating layer at parcel scale.**

### 2.3 `POST /v1/env_params` — comfort & air at a point

Request: `{latitude, longitude, temperature, date_time, analysis?}` (`temperature` is a **single anchor value**). `analysis` may restrict to a subset of these exact parameter names: [OFFICIAL]
```
heat_index_celsius, apparent_temperature_celsius, wet_bulb_temperature_celsius,
relative_humidity_percent, precipitation_mm, cloud_cover_octas,
air_quality:idx, air_quality_no2:idx, air_quality_o3:idx, air_quality_pm2p5:idx,
air_quality_pm10:idx, air_quality_so2:idx, aqi_us_co, methane_ppb, co2_ppm,
elevation, solar_irradiance
```
Response (real cached file):
```
metadata: { timezone, timezone_offset_hours, time_range:{start,end,interval,count}, timestamps[24] }
locations: [ { lat, lon, elevation, temperature,           // the anchor echoed
               parameters: { <each param>: [24 hourly values] },
               solar_irradiance: { clear_sky: {ghi, dni, dhi}, description } } ]
```
**Two documented traps (must inform the model):**
- The endpoint applies the **single `temperature` anchor across all 24 h** and varies only humidity ⇒ `heat_index_celsius` peaks ~02:00 (H2) and bottoms mid-afternoon. It is a **humidity-sensitivity curve, not a diurnal forecast**. [TECHNICAL + README] SiteVerdict compares comfort metrics **at the "hot hour" = argmax(apparent_temperature_celsius)** — the one series that follows the real diurnal cycle — and takes *duration* from the heatmap `exceedance` layer, never from this series.
- env_params resolves on a weather grid **coarser than parcel scale**: two cached portfolio parcels 1.36 km apart return byte-identical arrays. Use it to characterise the **district**, not to discriminate between sites. [TECHNICAL + README]
- `solar_irradiance.clear_sky` is a **single daily summary** (ghi/dni/dhi), not an hourly series. [INFERENCE — read from cache, semantics not documented]

### 2.4 `POST /v1/satellite` — land cover (Premium)

Request: `{ sat:{latitude,longitude}, date_time, granularity }`.
Response (real cached file, mode `sat`):
```
coordinates: { latitude, longitude }        // tile centre
original_image, orignal_image             // base64 PNG list — API emits both spellings (typo is theirs)
image_year: int
segmentation:
  { request_id, processing_time_seconds (~16 s),
    image_dimensions: {width,height},
    mode: "sat",
    segments: { "building": %, "tree": %, "earth, ground": %, "plant": %, "others": % },
    image_legend: { "building":[R,G,B], ... },
    image_content                       // base64 segmented overlay
  }
```
- The **endpoint segments a tile centred on the point you give it, not the parcel polygon** ⇒ treat shares as *site-vicinity* composition, not a parcel-exact take-off. [OFFICIAL notebook]
- Surface-composition levers used by the notebooks: `building`/`road`/`sidewalk`/`pavement` ⇒ **impervious %**; `tree` ⇒ **canopy %**; heating/cooling/sky class groupings. [OFFICIAL notebook]

### 2.5 `POST /v1/streetview` — ground level (Premium)

Request: `{latitude, longitude, vertical_angle=0, horizontal_angle=0, back_view=false}`.
Response (real cached file):
```
coordinates: { latitude, longitude }
front: { original_image,                    // base64
         segments: { "building":%, "sky":%, "tree":%, "road":%, "sidewalk":%, "others":% },
         image_legend, segmented_image,
         image_date: "2026-03-01" }
```
- Imagery is **not available everywhere** ⇒ always `skip_on_failure=True`; the pipeline continues without it. [OFFICIAL notebook]

### 2.6 `POST /v1/heat_intelligence` — narrative PDF (Premium)

- Request: `{latitude, longitude, temperature, date, analysis:[...]}`; analyses = `geographic | environmental | urban | events | anthropogenic`. [OFFICIAL]
- **Plan limit: up to 2 analysis categories per request** on Premium — more returns `400: analysis types exceed current model limit of 2 types`. SiteVerdict will use `environmental` + `urban` for the lead candidate (matches the official notebooks). [OFFICIAL notebook]
- Returns a **PDF**, not JSON (current API: pre-signed `download_link` in the status result; legacy: streamed body). [OFFICIAL]

### 2.7 System / credits

- `POST /v1/system/fetch-api-key-usage` (`{api_key}`) → billing-cycle summary; `fetch-api-key-custom-usage` (`{api_key, start_date, end_date}` ISO). [OFFICIAL]
- Hackathon key: **2,000,000 credits, 5 weeks, all endpoints Premium, free**. [OFFICIAL]
- **Failed tasks are free — credits only deduct at `Completed`.** [OFFICIAL]

### 2.8 Forecast decision (Track 5 dependency, now resolved)

| Question | Finding | Label |
|---|---|---|
| Does +12 h forecast exist on Create Heatmap? | Assistant says yes; forecast product announced officially | `[TECHNICAL]`/`[OFFICIAL]` |
| Is it reliable right now? | 20 Aug forecast endpoints under maintenance; participant reports of completed-but-empty billed future-window calls | `[OFFICIAL]` + `[PARTICIPANT]` |
| Does SiteVerdict need it? | **No.** SiteVerdict is a *historical due-diligence* product; it scores real measured days, and multi-day outlooks are explicitly "model from historical patterns" per guidance (`[TECHNICAL]`) | `[INFERENCE]` |

**Decision: forecast is EXCLUDED from SiteVerdict's core; it is at most a later nice-to-have after a live +12 h verification test with the hackathon key.** This insulates the submission from the known forecast fragility (`[PARTICIPANT]` empty/billed calls). `[INFERENCE]`

---

## 3. Product concept

### 3.1 What it is
An **AI heat-risk due-diligence copilot**: upload candidate parcel boundaries → get a ranked shortlist of sites by thermal exposure, with a traceable verdict table and a why-it's-hot explanation, packaged for a lender/committee.

### 3.2 Who it's for (buyer)
Development and acquisitions teams screening a pipeline ("which of these sites should I pursue?"), asset managers diligenceing a holding list, and the brokers/lenders who need the same answer on paper. This is the exact persona of the official `parcel_portfolio_heat_screening` notebook. [OFFICIAL]

### 3.3 Track alignment
- **Primary: Track 3 (Industrial & Enterprise)** — enterprise due-diligence workflow, clear commercial buyer (RE/insurance), FG-native metrics. `[INFERENCE]`
- **Secondary: Track 7 (Data Analysis & Correlation)** — ranking/correlation of site heat against composition and district. `[INFERENCE]`

### 3.4 What it is NOT (guardrails from the repo)
The official notebooks explicitly refuse to "invent composite indices and fabricated dollar figures" — every finding is *if measurement X crosses published threshold Y, recommend program Z*. SiteVerdict honors this principle and adds the **comparison layer** the notebooks deliberately do not build. `[OFFICIAL]`

---

## 4. Candidate-slot data model

One normalized **site record** per parcel (all from confirmed fields):

| Field | Source endpoint(s) | Type | Notes |
|---|---|---|---|
| `parcel_id`, name, geometry | user GeoJSON | str / Polygon | `[longitude, latitude]` |
| area_acres | geometry | float | |
| `peak_c`, `min_c`, `mean_c`, `swing_c` | heatmap `tcm` **area-weighted** clip | float °C | per-tile `average_temperature` |
| `city_pctile_peak` | citywide baseline heatmap (cached) | float 0–100 | no extra credits |
| `exceedance_h` | heatmap `exceedance` clip | float h | count of hours, not degree-hours |
| `persistence_h` | heatmap `persistence` clip | float h | longest run |
| `hot_hour`, `hi_c_at_hot_hour`, `wb_c`, `aqi`, `solar_ghi` | env_params at centroid, anchored to area-weighted peak | float | compare at argmax(apparent) |
| `impervious_pct`, `canopy_pct` | satellite segments (site-vicinity) | float % | |
| `sv_hard_pct`, `sv_veg_pct`, `sv_image_date` | street-view segments (optional) | float % | skip on missing imagery |
| verdicts & composite | derived (§5) | PASS/CAUTION/FAIL + 0–100 | every sub-block traceable |

---

## 5. Scoring model — the centerpiece

### 5.1 Design principle (inherited from the official notebooks)
> "No invented composite index and no fabricated dollar figures. Each threshold is one somebody else published — NOAA, OSHA, EPA, USDA, ASHRAE — so a finding can be traced and defended." `[OFFICIAL notebook]`

SiteVerdict implements **three layers**:

### 5.2 Layer A — Verdict bins (threshold-triggered, fully traceable)
Each metric is binned PASS / CAUTION / FAIL against published thresholds. `[INFERENCE] for binning structure` on top of `[OFFICIAL]` thresholds:

| # | Metric | Source endpoint → field | Calculation | Bin thresholds | Authority |
|---|---|---|---|---|---|
| 1 | Peak exposure | heatmap tcm → `average_temperature`, area-weighted | parcel peak °C | PASS < 27; CAUTION 27–32; FAIL ≥ 32 °C | NOAA heat-index Caution 27 °C (80.6 °F) / Extreme Caution 32 °C (89.6 °F) `[OFFICIAL notebook]` |
| 2 | Duration exposure | heatmap exceedance → `properties.value`, area-weighted | hours above threshold over window | compare to peer distribution + site cap `[INFERENCE]` | threshold *counts hours above* NOAA Extreme 32 °C `[OFFICIAL notebook EXCEEDANCE_C]` |
| 3 | Persistence | heatmap persistence → area-weighted | longest unbroken run (h) | tiered vs peer + caps `[INFERENCE]` | drives overnight heat-shed / OSHA consecutive-day thinking `[OFFICIAL notebook]` |
| 4 | Comfort at hot hour | env_params → `heat_index_celsius` at argmax(`apparent_temperature_celsius`) | heat index °C | PASS < 27; CAUTION 27–32; FAIL ≥ 32 | NOAA heat-index bands `[OFFICIAL notebook]` |
| 5 | Outdoor-work trigger | env_params hot-hour heat index | °C | CAUTION ≥ 32.2 (OSHA high-heat) | OSHA 90 °F trigger `[OFFICIAL notebook OSHA_HIGH_C]` |
| 6 | Canopy | satellite → `tree` share | % | FAIL < 15 % canopy | USDA i-Tree planting indication `[OFFICIAL notebook CANOPY_TARGET]` |
| 7 | Impervious | satellite → building+road+sidewalk | % | FAIL > 60 % impervious | EPA Heat Island cool-surface retrofit `[OFFICIAL notebook IMPERVIOUS_LIMIT]` |
| 8 | Frontage (vertical view) | street-view → building+road+sidewalk share | % | comparative only; no single published threshold `[INFERENCE]` | ground-level tenant-experience input `[OFFICIAL notebook]` |

**Every bin cites its authority; none is invented.** Metrics with no published single threshold (2, 3, 8) carry an explicit `[INFERENCE]` note in the output so a memo author can defend or override them.

### 5.3 Layer B — Comparative ranking (the SiteVerdict value-add)
Because a single parcel sits in a nearly flat peak field (0.94 °C across 14 km² `[OFFICIAL]`), the **shortlist order comes from duration + relative position**:
- Rank each parcel by `exceedance_h`, `persistence_h`, then `peak_c` (tiebreak by `city_pctile_peak`).
- Report each metric as **percentile of the candidate set** (and vs. the cached citywide baseline where available — no extra credits).
- **If the temperature-rank and duration-rank disagree, that disagreement is an explicit finding** (the notebooks treat it the same way). `[OFFICIAL notebook]`

### 5.4 Layer C — SiteVerdict Composite Index (optional, transparent) `[INFERENCE]`
For committee readability only, and explicitly disclosed as a derived score, not a standard:
- Each component normalized **0–100 with anchors at published thresholds** (e.g., exceedance hours: 0 h → 100, ≥ window hours above NOAA Extreme → 0; peak °C: ≤ 27 → 100, ≥ 32 → 0; comfort heat index likewise; canopy ≥ 15 % → 100; impervious ≤ 60 % → 100).
- Default weights `[INFERENCE]` (duration 30, peak 20, comfort 20, surface 20, persistence 10), **user-overridable**.
- **Rank-stability check:** recompute order under ±20 % weight perturbation; report any rank flips as ties so the committee sees instability rather than a false certainty.

### 5.5 Why this survives scrutiny
- Every score component is either a measured number or a percentile — never a guess.
- Verdicts cite external authorities (`[OFFICIAL]` thresholds), satisfying "defensible in front of a lender or planning commission."
- The composite is optional, disclosed, sensitivity-tested, and sourced — it does not violate the repo's no-invented-numbers rule. `[INFERENCE]`

---

## 6. Candidate-site workflow (8 steps)

Mirrors the official multi-parcel notebook with SiteVerdict's staging and scoring:

1. **Ingest** candidate parcel boundaries (GeoJSON/CSV), optional `name`, `parcel_id`; validate U.S., `[lon,lat]`, area.
2. **Build one AOI** = convex hull of all parcels + `BUFFER_M` ring (~400 m), granularity 80 m for a 14 km² portfolio (or 60 m for tighter sites). One request, one common scale. `[OFFICIAL notebook]`
3. **Heat layer**: one `tcm` heatmap over the AOI, `filter_type=3`, plus **exceedance + persistence** over the 7-day window ending on `STUDY_DATE` at the NOAA Extreme threshold (32 °C). `[OFFICIAL notebook]`
4. **Area-weighted clip** to every parcel: mean of overlapping tile values weighted by overlap area — never centroid lookup (a 2–4 acre parcel spans only a handful of 80 m tiles). `[OFFICIAL notebook]`
5. **Rank** (Layer B) + **verdicts** (Layer A) + optional composite (Layer C); surface any temperature-vs-duration rank disagreement as a finding.
6. **Why-hot (top-N only)**: satellite segmentation + street-view (skip-on-failure) on the top 3 — per-site hardscape vs. canopy, heating/cooling/sky classes, frontage view. `[OFFICIAL notebook]`
7. **Comfort (top-N only)**: env_params at each top parcel centroid, anchored to *that parcel's* area-weighted peak; comfort comparisons at the hot hour only; duration taken from Step 3. District-coarseness warning when two sites return identical env arrays. `[OFFICIAL notebook] + [TECHNICAL]`
8. **Deliverable**: ranked shortlist + verdict table + findings CSV + per-site evaluation CSV + HTML maps + branded PDF + (lead site) heat-intelligence narrative (`environmental` + `urban`, 2-category limit). `[OFFICIAL notebook pattern]`

---

## 7. Differentiation (≥ 5)

1. **Comparison-native, not one-shot** — the official multi-parcel notebook is a linear script; SiteVerdict is a re-runnable *screening engine* with a persisted candidate pipeline (new sites enter, AOI regrows) and a stable scoring contract.
2. **Traceable verdicts with citation** — every bin names its authority (NOAA/OSHA/EPA/USDA/ASHRAE); output prints the source. Competitor dashboards show numbers; we show *sourced* numbers.
3. **Cost-staged by design** — one AOI heatmap for the whole portfolio; satellite/street-view/env_params only on top-N; per-run credit trace via `fetch-api-key-usage`. `[OFFICIAL notebook]`
4. **Composite with sensitivity** — the optional SiteVerdict Index is weight-transparent and rank-stability-tested, so it is honest about uncertainty — rare in hackathon submissions. `[INFERENCE]`
5. **Why-hot decomposition** — satellite + street-view *surface* explanation and remediation signals (canopy target, impervious limit), not just risk scores.
6. **Replayable/credits-safe** — caching-first like the official notebooks (demo runs without burning points; `REFRESH` switch for live calls).
7. **Buyer-ready bundle** — ranked shortlist + evaluation CSV + findings CSV + maps + narrative PDF, mirroring the `reportAll` pattern the organizers themselves demo to clients. `[OFFICIAL notebook]`

---

## 8. MVP vs. nice-to-haves

**MVP (build window, 12 days):**
- Step 1–5 (ingest → AOI heatmaps → area-weighted clips → ranks + verdicts → output CSV/PDF bundle) with the two cached San Jose sample portfolios as the demo dataset.
- Caching layer and `REFRESH` flag.
- Verdict + shortlist tables; one branded PDF.

**Nice-to-haves (if time/credits allow):**
- env_params comfort panels + OSHA trigger for top-N.
- Satellite/street-view why-hot composition charts for top-N.
- Heat-intelligence PDF for the lead site.
- Citywide percentile baseline (cached San Jose heatmap — free).
- Live +12 h forecast preview **only if** a verification test with the hackathon key passes (§2.8). `[INFERENCE]`

---

## 9. Technical risks & mitigations

| Risk | Evidence | Mitigation |
|---|---|---|
| Parcel-scale peak is flat (`<1 °C`) | `[OFFICIAL]` cached data | Lead with exceedance/persistence (§5.3), treat peak as secondary |
| `heat_index` artifact (02:00 peak) | `[OFFICIAL]` + `[TECHNICAL]` | Compare at hot hour only; never count hours in this series |
| env_params coarser than parcels | `[TECHNICAL]` + cached identical arrays | Use for district character; never for site discrimination; auto-detect identical arrays and warn |
| Satellite = site-vicinity, not parcel-exact | `[OFFICIAL notebook]` | Label as vicinity composition in output |
| Street-view missing imagery | `[OFFICIAL]` | `skip_on_failure=True`; optional column |
| Forecast fragility | `[OFFICIAL]` + `[PARTICIPANT]` | Excluded from core (§2.8) |
| Credit burn during dev | `[OFFICIAL]` | Caching-first, sample portfolios, log per-call costs via usage endpoint |
| Heat-intelligence 2-category limit | `[OFFICIAL notebook]` | Use `environmental` + `urban`; one call, lead site only |

---

## 10. Credits & cost posture

- Hackathon key: 2,000,000 credits, Premium, free. `[OFFICIAL]`
- Strategy: **heatmaps are the cheap, shared layer (few calls); per-point endpoints run only on top-N.**
- Hard per-call credit costs are not published; capture them live from `fetch-api-key-usage` after each endpoint and record in `[INFERENCE]` log in the context file (next step).
- Demo discipline: cache everything; run the demo tracked against the cached replica unless `REFRESH=True`.

---

## 11. Demo flow (3-minute pitch + live run)

1. **Hook (30 s):** "Our team has six candidate sites and budget for two. Which should we pursue?"
2. **Show (60 s):** load the 6-parcel San Jose portfolio → one AOI heatmap → ranked shortlist with duration-first order → verdict table with cited thresholds (NOAA/OSHA/EPA/USDA).
3. **Why (45 s):** top parcel's satellite hardscape/canopy split + street-view frontage → the fix is in the paving/planting spec.
4. **Proof (45 s):** flip to the single-parcel notebook output to show per-site evaluation CSV + findings CSV + PDF bundle ready for a lender.

---

## 12. Judging-weight alignment (official)

- **Impact & Relevance (40 %):** enterprise RE/insurance due-diligence with a demonstrated official market pull (`[OFFICIAL]` RE notebooks); real money at stake.
- **Technical Execution (35 %):** multi-endpoint orchestration (heatmap ×3 analytic types + satellite + streetview + env_params + heat_intelligence + usage tracking), area-weighted geometry, caching, sensitivity-tested scoring.
- **Innovation (15 %):** the comparison layer + the transparency-tested composite (§5.4) — honest about uncertainty in a field of tuneless dashboards.
- **Communication (10 %):** committee-ready bundle (PDF+CSV+maps) mirrors the repo's best-practice deliverable format.

---

## 13. Next steps (post-approval)

1. Verify the hackathon API key end-to-end: run the two parcel notebooks live once, confirm response shapes match §2 and capture real credit costs.
2. Record hard per-call credit costs in the context file (`[INFERENCE]` cost log).
3. Approve the layered scoring model (§5) and 8-step workflow (§6) as the design contract.
4. This report intentionally contains **no implementation plan** — that is a separate artifact, only after design approval.

---

*End of discovery report. Design-only; no code, no credentials.*