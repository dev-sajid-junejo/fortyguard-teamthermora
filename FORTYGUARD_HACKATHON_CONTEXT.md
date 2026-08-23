# FortyGuard Hackathon'26 — TeamThermora Context File

> Research knowledge base compiled from Slack channels, official FortyGuard sources, API docs, and the official quickstart repo.
>
> **Label legend:**
> - `[OFFICIAL]` — from the official Hackathon Team / FortyGuard staff / official FortyGuard website, docs, repo, or the participant submission form.
> - `[TECHNICAL]` — from the FortyGuard Assistant (organizer-operated support bot) in Slack; treat as organizer guidance but not a formally published ruling.
> - `[PARTICIPANT]` — reported by hackathon participants; not confirmed by organizers.
> - `[INFERENCE]` — our own analysis/derivation; explicitly opinion, not official.
>
> **Timeline context:** This file collected on 21 Aug 2026, during the build window (18–30 Aug 2026), before submission.
>
> **Security note:** No API keys, tokens, or credentials are stored here. If any are encountered in Slack/files later, they must be redacted and only the fact that credentials were referenced should be recorded.

---

## 1. Channels Reviewed

| Channel | Type | Notes |
|---|---|---|
| #announcements | public | Primary [OFFICIAL] source for updates (Aug 16–20 fully reviewed). |
| #help-general | public | Rules, submissions, judging, prizes Q&A. |
| #help-technical | public | API mechanics, endpoint Q&A, model/agentic guidance. |
| #introductions | public | Participant self-intros (mostly Pakistan/UAE/India cohort). |
| #looking-for-team | public | Team forming; many participant project ideas. |
| #team-707, #team-syc | public | Other teams' channels; minimal relevant content. |
| `#track-*` channels | private/not indexed | **Not accessible** from this account. Official track names + example projects recovered from Assistant answers instead. |

Also reviewed (web): fortyguard.com/hackathon26, fortyguard.com/news, fortyguard.com/api-pricing, docs-api.fortyguard.com (JS-rendered, partial), official Quickstart repo (FortyGuard-Tech/temperature-api-quickstart -> README + use-case docs), press (Entrepreneur Middle East, July 2026 — flagged as pre-reschedule).

**Blocked sources:** Slack Canvas ([TECHNICAL] not_supported_free_team), Participant Handbook PDF (Google Drive requires owner permission to download).

---

## 2. Official Updates (chronological, from #announcements)

- **[OFFICIAL]** 16 Aug: Quickstart repo published — <https://github.com/FortyGuard-Tech/temperature-api-quickstart>.
- **[OFFICIAL]** 17 Aug: Team Registration Form published — <https://forms.gle/CCCvSNgDsDiNZ2gk7>. API keys open the next day.
- **[OFFICIAL]** 18 Aug: API access live. Sign up free at dashboard.fortyguard.com -> Profile (bottom-left) -> Create API Key. Hackathon key = **2,000,000 credits, valid 5 weeks, fully Premium: all endpoints unlocked and completely free**. Coverage is US-wide.
- **[OFFICIAL]** 18–19 Aug: Webinars (recorded, shared afterward):
  - Onboarding & Kickoff (Jay Sadiq, Snehil Ahuja) — how the hackathon works, the 7 tracks, key dates, API access, prizes.
  - Building on the Temperature API (Fawad) — endpoint walkthrough.
  - Heat Intelligence Cloud (Aashan Javed) — what you can build.
  - Breaking Silos with Autodesk (Jordana Rosa, Autodesk Forma) — design/data pipes.
  - Coming: The Builder's Trap (Ahmed Abdelkhalek, Google Cloud); From Headlines to Impact (Tarek Fouad, PR/media).
- **[OFFICIAL]** 20 Aug: Forecasting endpoints under maintenance — latest available data `2026-08-20T15 UTC` at that time. Status update promised same day. (Temporary.)
- **[OFFICIAL]** 20 Aug: Heatmap/mapping endpoint outage — **resolved**; resubmit any failed earlier requests. (Temporary.)
- **[OFFICIAL]** 20 Aug: **Submission is live.** Form: `https://forms.gle/jLgBzVTG1NhJ3gNe6`. Deadline 30 Aug 2026 11:59 PM GST.

---

## 3. Rules, Deadlines, Submission

### Key dates
- **Kickoff:** 18 Aug 2026 (live onboarding + API walkthrough).
- **Build window:** 18–30 Aug 2026 (12 days). [TECHNICAL]
- **Submission deadline:** **30 Aug 2026, 11:59 PM GST** (UTC+4). No late submissions. [OFFICIAL — form + announcements]
- **Screening:** 1–7 Sep; **Judging:** 8–14 Sep; **Winners announced:** 16 Sep on FortyGuard social media. [TECHNICAL]

### Team rules
- **Team size: 1–3 people.** Solo entries welcome. [OFFICIAL — submission form has "Number of team members (1, 2, 3)"; supported by Assistant]
- Solo participants submit their own project; for teams, **only the team leader submits**. [OFFICIAL]
- Team leader must also have submitted the Team Registration Form. [OFFICIAL]
- Each member should generate their **own** API key (Dashboard Profile). [TECHNICAL]
- You can resubmit before the deadline — **latest submission counts**. [OFFICIAL]
- Track change/team change: Assistant defers to hackathon@fortyguard.com. Can change primary track via resubmission. [TECHNICAL]

### Submission requirements (4 parts) [OFFICIAL — form HTML, verbatim-confirmed]
1. **Submission form** (`forms.gle/jLgBzVTG1NhJ3gNe6`, "Submit Your Project — FortyGuard Hackathon'26", 6 pages):
   - Solo: Full name, email. Team: Team name, leader name, leader registered email, member count (1–3), all member names + registered emails.
   - Project title; one-line pitch (≤140 chars); project description; **primary track** (dropdown: Tracks 1–7 or "Other — Describe your custom track"); optional up to 2 secondary track tags.
   - Who it's for (who makes a decision differently); where and when (city/area + time period); how you used the FortyGuard Temperature API; **your FortyGuard API key** (Q8: "allows us to confirm that your project really calls the API"); AI tools used and for what (disclosure never penalized).
   - Links: code repo (GitHub/GitLab), checkbox confirming Hackathon-FG (hackathon@fortyguard.com) added as collaborator (required if private), live demo link (must open incognito, no login/install, stay up from deadline until judging ends), demo video link (YouTube/Loom, unlisted OK, max 3 min, shows it working — slides don't count).
   - Declarations: repo created after kickoff (earlier boilerplate OK if declared in README); **no API keys committed, keys kept server-side** (key visible in repo or browser code = disqualification); original work + T&C accepted. Optional "anything else" field.
2. **Live demo** — incognito-openable, login-free, works through judging. [OFFICIAL]
3. **Demo video** — max 3 minutes, YouTube/Loom, unlisted OK, voiceover recommended, show it working. [TECHNICAL appears to echo form wording]
4. **Code repo** — README must include: how to run it; what doesn't work yet; one real FortyGuard API request + response. Add hackathon@fortyguard.com if private. [OFFICIAL — form + announcements]

### Judging criteria (weighted) [TECHNICAL — consistent across multiple Assistant answers]
- **Impact & Relevance: 40%** — real urban-heat problem, commercial viability.
- **Technical Execution: 35%** — it works, sound build, client-grade.
- **Innovation: 15%** — original or fresh combination.
- **Communication: 10%** — clear, compelling demo + write-up.

### Disqualifiers / hard rules
- **Never commit API keys** — server-side only; a key visible in the repo or browser code means disqualification. [OFFICIAL — form Q15]
- API key must remain on the server side (frontend calls your backend, backend calls FortyGuard). [TECHNICAL]
- Real, working project — API/Dashboard must be central, not decorative. [TECHNICAL]

---

## 4. The 7 Tracks (official names + organizer example projects) [TECHNICAL — Assistant, 18 Aug; names confirmed identical in submission form dropdown]

1. **Resilient Cities & Infrastructure** (#track-cities) — cool-route planning, shade ranking for public assets, digital-twin overlays (canopy/paving). Example: app finding coolest walking route under a temp threshold via shaded streets/parks/building shadows. [TECHNICAL]
2. **Future Buildings & Energy** (#track-energy) — facade/HVAC advisors, utility cooling-load signals, retrofit ROI. Example: cool-roof/reflective-coating upgrade recommendations with dollar energy savings + before/after thermal maps + ROI payback. [TECHNICAL]
3. **Industrial & Enterprise** (#track-industry) — data-center siting, logistics/cargo & worker safety, parametric heat-risk scores for insurers/real estate. Example: heat-risk scoring for logistics warehouses (cargo-spoilage risk for pharma/food/electronics; cooling-cost comparison). [TECHNICAL]
4. **Government & Environment** (#track-government) — heat-vulnerability maps, worker-safety alerts, agricultural micro-climate tools. Example: WBGT-threshold alert dashboard for outdoor workers with break-schedule triggers. [TECHNICAL]
5. **Model Designing** (#track-models) — build/train/validate the models behind vulnerability scores, alerts, microclimate forecasts. Example: new LTM variant predicting green-space cooling effect; model card + validation report. [TECHNICAL]
6. **Agentic AI** (#track-agentic) — autonomous agents that plan/call/sequence FortyGuard endpoints from a natural-language goal. Example: "top 5 coolest neighborhoods for outdoor events this weekend" — agent sequences heatmaps, ranks, returns list + reasoning trace. [TECHNICAL]
7. **Data Analysis & Correlation** (#track-data) — correlate hyperlocal temperature with non-weather outcomes (health, energy, transit); heat-equity analysis; regression toolkits. Example: heat-equity analysis correlating temperature with ZIP demographics, hospital ER admissions, power outages; policy brief. [TECHNICAL]

Notes:
- One primary track (where you're assessed) + up to 2 optional secondary tags. [OFFICIAL — form]
- "Other — Describe your custom track" exists in the form dropdown [OFFICIAL], but the canonical count is **7 tracks**.
- **[INFERENCE]** Track 5 and 7 are highly attractive for a data-science-heavy team but are the most crowded; Tracks 3/4 often have thinner competition with equally strong demo stories.

---

## 5. API Capabilities Available to Participants

### Access & credits
- Hackathon key: **2,000,000 credits, valid 5 weeks, Premium tier (all endpoints), free**. [OFFICIAL]
- Each successful call costs credits (varies by endpoint/params); **failed tasks are free** — credits only deduct at `Completed`. [TECHNICAL + Quickstart README]
- Check usage: `POST /v1/system/fetch-api-key-usage` (and `-custom-usage`). [TECHNICAL + README]
- Dashboard for visual exploration: dashboard.fortyguard.com (draw polygons, generate heatmaps, read reports). State selected at signup **cannot be changed later** [TECHNICAL]. Dashboard is browser-based, US-limited polygon drawing.

### Endpoints (all available to participants under Premium) [Quickstart README — official repo]
| Endpoint | Purpose | Plan |
|---|---|---|
| `POST /v1/heatmap` | Polygon-based thermal map (°C), tile-by-tile | Both |
| `POST /v1/env_params` | Heat index, apparent temp, wet bulb, AQI, ozone, solar irradiance (GHI/DNI/DHI), humidity at a point | Both |
| `POST /v1/satellite` | Land-cover segmentation (built, vegetation, water, pavement, others) | Premium |
| `POST /v1/streetview` | Ground-level segmentation (shade/ground) | Premium |
| `POST /v1/heat_intelligence` | Multi-dimensional PDF report | Premium |
| `POST /v1/system/fetch-api-key-usage` (+ custom) | Credit usage/billing | Both |

### Key mechanics (from Quickstart README + Assistant)
- Async submit-then-poll: POST -> `activity_id` -> `GET /v1/status/{id}` until `Completed`; client handles polling (default 3s).
- **Coordinates are `[longitude, latitude]`** in GeoJSON — order matters.
- Heatmap params: polygon AOI, start_date/start_time/end_date/end_time, `filter_type` (1=single hour, 2=range of hours same day, 3=single day, 4=range of days, window capped ~31 days), `granularity` (60/80/100 m), `analytic_type`:
  - `tcm` (default) snapshot temperature, °C per tile.
  - `time_of_measure` — UTC hour-of-day of peak.
  - `exceedance` — count of hours past `threshold` (°C) + `direction` above/below.
  - `persistence` — longest continuous run of such hours.
  - Analysis heatmaps return `properties.value` + `stats_data.units` (NOT the `tcm` temp fields). [README]
- Env-params takes a point + date/time (+ `temperature` anchor in °C used to derive heat index etc.). [README + Assistant]
- **Filter windows capped at ~31 days** for range-of-days requests. [README]
- **Basic plan caps heatmaps at 10 mi²; Pro at 50 mi²** — hackathon Premium key effectively unlocks full caps. [pricing page + README troubleshooting]
- 12-hour forecasting exists as an official product (Dashboard; hourly, geohash6 ~street-level, 2m above ground). [OFFICIAL — fortyguard.com news, 5 May 2026] Assistant states the **Create Heatmap endpoint supports +12 hours ahead**. [TECHNICAL]
- UTC everywhere, °C everywhere (Fahrenheit display conversions done client-side in the sample portfolio notebook). [README]

---

## 6. API Limitations

### Permanent limitations
- **[OFFICIAL]** **Coverage is U.S. only** for the hackathon API/dashboard — polygons/points outside the U.S. return errors or empty results; pick a U.S. city study area.
- **[TECHNICAL]** **Historical range: 2021-01-01 → present.** Earlier dates are rejected. (README: "2021 to today"; dates before 2021 fail with "no data available".)
- **[TECHNICAL + OFFICIAL product news]** **Forecast window capped at ~12 hours ahead.** Beyond that, forecasting is NOT supported by the API; multi-day/seasonal outlooks must be modeled from historical patterns.
- **[README]** Filter type 4 (range of days) window capped at ~31 days.
- **[TECHNICAL]** Env-params is **not a diurnal forecast**: it applies one `temperature` anchor across all 24 hours and varies only humidity, so `heat_index_celsius` peaks overnight and is most meaningful at the hot hour. Treat as a humidity-sensitivity curve.
- **[TECHNICAL]** Env-params resolves on a weather grid **coarser than parcel scale** — two points ~1.4 km apart can return byte-identical arrays; use heatmap layers to discriminate between nearby sites.
- **[README]** Heatmap finest granularity = **60 m**; at parcel scale (few tiles), use area-weighted means + exceedance/persistence, since daily-peak snapshots are nearly flat below city scale (~0.9–0.94 °C spread vs 5.85 °C citywide).
- **[TECHNICAL]** Point-based workflow: to query a point with the polygon-based heatmap, use a tiny polygon (~10–100 m radius) around the lat/lon.
- **[TECHNICAL]** API key/dashboard coverage: Premium access is grant-based for the hackathon — outside participants the Premium endpoints are paid-only.

### Temporary outages / maintenance (do NOT treat as permanent limitations)
- **[OFFICIAL]** 20 Aug 2026 — heatmap/mapping endpoint outage: **resolved**; resubmit failed requests.
- **[OFFICIAL]** 20 Aug 2026 — forecasting endpoints under maintenance; latest data `2026-08-20T15 UTC` at the time; status update promised.

### Participant-reported issues (UNCONFIRMED, pending organizer verification)
- **[PARTICIPANT]** Some completed heatmap requests returned HTTP 200 with empty `features` / `n_cells: 0` while appearing to consume credits — possibly related to the 20 Aug outage.
- **[PARTICIPANT]** Future-window forecast heatmap requests returned HTTP 200 with empty data (billed), which contradicts the intended +12h forecast capability.
- **[PARTICIPANT]** Dashboard login/CORS/504 errors reported (dashboard-api.apps.fortyguard.com).
- **[PARTICIPANT]** An env_params request on a future date hung in "processing" — [TECHNICAL] guidance: only use past/present dates for env_params (no forecasting on that endpoint).

---

## 7. Organizer Guidance & Best Practices

- **Start small:** validate on a tiny polygon + single timestamp before scaling. [TECHNICAL]
- **Cache aggressively** (you have credit limits; sample workflow: 3–5 U.S. cities, 2–4 weeks per city, pull at peak hours ~14:00). [TECHNICAL]
- Any stack is allowed (n8n, React, Streamlit, etc.); combine FortyGuard with other datasets and AI tools, and **disclose AI usage** (disclosure never penalized). [TECHNICAL + form]
- **API must be central to the project** — "real use of the FortyGuard platform, clear problem and user, measurable outcome, path to real-world deployment. Applied relevance beats flashy demos." [TECHNICAL]
- Risk-related models must be built by participants — the API returns temperature/heat metrics (e.g., WBGT components, heat index), not precomputed risk scores; do the modeling yourself. [TECHNICAL]
- Feature-engineering recipe for model tracks: temperature, heat index, exceedance, persistence, AQI, solar irradiance, tree-canopy %, impervious %, day-of-year, hours-above-threshold. [TECHNICAL]
- Quickstart notebooks: 00 auth, 01 heatmap, 02 env params, 03 satellite, 04 street view, 05 heat intelligence. Use-case notebooks: real-estate portfolio heat risk, bus-stop cooling prioritization, public-parks audit, single-parcel due diligence, multi-parcel screening. [OFFICIAL — repo]
- n8n and any tooling allowed; the Track 6 judge emphasis: agent must truly plan/workflow the endpoint sequence and be robust (edge cases, retries), not a hardcoded wrapper. [TECHNICAL]
- Keep `.env` git-ignored; key only server-side; rotate if leaked. [TECHNICAL]

---

## 8. Problem Statements & Track Intelligence

### Organizer-endorsed problem spaces (examples cited by Assistant / official repo)
- Cool/shaded walking routes under a temperature threshold (T1).
- Building roof/wall retrofit ROI from heatmap + street-view (T2).
- Warehouse/logistics heat-risk + cargo-spoilage scoring (T3).
- WBGT-based outdoor-worker alerting with break scheduling (T4).
- Green-space cooling-effect prediction model + model card (T5).
- Natural-language agent sequencing heatmap->env_params->heat_intelligence (T6).
- Heat-equity: temperature x demographics/ER/power-outage regression + policy brief (T7).
- Official use-case notebooks also endorse: real-estate portfolio priority maps, bus-stop intervention ranking, public-parks heat-resilience audits, single-parcel "should I buy" due diligence, multi-parcel acquisition shortlisting.

### Participant ideas observed [PARTICIPANT]
- Cool-route / safe walk & transit planner (T1/T6).
- Worker-safety / outdoor-crew heat-risk alert agent (T4/T6) — repeated by multiple participants.
- Cold-chain "ReeferCast" temperature-intelligence agent for freight (T3).
- Heat-equity dashboard correlating temperature with socioeconomic data (T7).
- Data-center / facility siting advisor (T3/T6, from Assistant example).
- Agentic heat-risk agent with reasoning + recommendations (T6).
- General interest in building forecasting/ML on historical patterns (T5).

### Track-channel accessibility
`#track-*` channels were not accessible during research. Next step (if desired): request access via #help-general or ask the Hackathon Team to join the relevant track channel to observe mentor activity.

---

## 9. Open Questions

1. **Exact current prize amounts** — not confirmed in any officially accessible source for the rescheduled event. Assistant: "exact cash amounts only published on the official site"; only confirmed as: 1st/2nd/3rd cash (co-funded by FortyGuard + partners), incubation/acceleration, internships (qualifying grads), API-usage discounts, GPU hardware/cloud-credit deals (partner-enabled), certificate of completion for everyone. [TECHNICAL]
2. **NVIDIA GPU prize** — [PRESS - UNVERIFIED] the July press article called the API "NVIDIA-recognized" but gave **no GPU prize** specifics; no official source confirms a specific GPU hardware/credit prize. **Do not treat as fact.** [INFERENCE]
3. **Forecast API behavior beyond +12h** — README says future dates fail; Assistant says heatmap supports +12h. Needs a live test with the hackathon key. [PARTICIPANT reports of empty/billed forecast results add uncertainty]
4. **Forecasting endpoint current health** — post-20 Aug maintenance status not yet re-announced; forecast calls should be tested before building on them.
5. **Participant-reported quirks** (empty features arrays, billed-but-empty calls, dashboard CORS/login) — unfixed/root-cause unconfirmed.
6. **Custom-track eligibility** — "Other — Describe your custom track" exists in the form; whether custom tracks compete head-to-head or separately is unspoken. [INFERENCE]
7. **Secondary-track assessment** — whether secondary tags influence scoring beyond the primary track is unspecified.
8. **Participant Handbook details** — full handbook (prizes, eligibility fine print) not downloadable; recommend retrieving it from the registration email or pinned announcement.
9. **Whether a living demo is required past judging end** — form says "stay up from deadline until judging ends"; post-judging teardown acceptable.
10. **TeamThermora team channel** — not located/accessible for this account during research; TeamThermora was not found in public channel/message search.

---

## 10. TeamThermora Considerations (Recommendations — [INFERENCE] unless tagged)

### Positioning strategy (draft, not final)
- Score weight profile (Impact 40 / Technical 35 / Innovation 15 / Communication 10) [TECHNICAL] means a **commercially credible, working product with crisp demo** generally outperforms a brilliant-but-unstable demo.
- The API must be central. Projects that merely wrap a single endpoint look weak; sequencing heatmap + env_params/satellite + (optionally) forecast shows execution.
- Disclose AI tools honestly; disclosure is explicitly never penalized [OFFICIAL — form].
- Reserve credits for real, defensible demo calls; cache everything else.

### Strongest problem opportunities (8) — rank/shortlist, no final selection yet

1. **Outdoor-worker heat-illness alerting (WBGT threshold) + 12h forecast** — Track 4 (Government & Environment) / Track 6 overlap.
   - Why relevant: organizer's own example; OSHA/WBGT is a concrete, defensible threshold; multiple participants eyeing it (crowded but strongest story).
   - API needed: env_params (heat index/wet-bulb), heatmap exceedance, forecast (+12h).
   - Commercial value: construction/logistics/public works compliance. Difficulty: medium. Demo: very strong.
2. **Multi-parcel / portfolio site heat screening for acquisitions** — Track 5 or 7.
   - Why relevant: official single- and multi-parcel use-case notebooks exist; real estate is a demonstrated customer (FG portfolio+parcel notebooks).
   - API needed: heatmap (tcm + exceedance + persistence), satellite, streetview, env_params, heat_intelligence.
   - Commercial: acquisitions/ESG diligence. Difficulty: medium. Demo: strong (shortlist + PDF report).
3. **12h-ahead exceedance/persistence forecaster (beyond native API)** — Track 5 (Model Designing).
   - Why relevant: this is what the API can't do (>12h, modeled), high technical upside; the Assistant explicitly presents it as the flagship T5 idea.
   - API needed: historical heatmap pulls over years; env_params.
   - Commercial: utilities, insurers, cities. Difficulty: high. Demo: strong with a live hold-out evaluation.
4. **Agentic heat-risk assistant (NL goal -> sequenced endpoints)** — Track 6 (Agentic AI).
   - Why relevant: organizer's Track 6 definition; heavy participant interest; must outshine toy wrappers with real planning/robustness.
   - API needed: heatmap, env_params, satellite, heat_intelligence, (+forecast).
   - Commercial: "temperature as a service" for enterprises. Difficulty: medium-high. Demo: very strong if agent genuinely plans.
5. **Cool-route / shade-aware mobility planner** — Track 1 (Resilient Cities).
   - Why relevant: organizer example #1; simple to demo; great visuals.
   - API needed: heatmap (tcm/time_of_measure) + streetview for shade.
   - Commercial: cities, transit. Difficulty: low-medium. Demo: excellent visuals; competitive.
6. **Heat-equity / vulnerability correlation dashboards** — Track 7 (Data Analysis & Correlation).
   - Why relevant: organizer example; public-health and policy audience; strong narrative.
   - API needed: heatmap + env_params, joined with public demographic/health data (external).
   - Commercial: city health depts, advocacy. Difficulty: medium (data wrangling). Demo: strong dashboard.
7. **Data-center / facility siting advisor** — Track 3 (Industrial & Enterprise).
   - Why relevant: FG's own DATS data-center research (official news) demonstrates real market pull; lower participant competition.
   - API needed: heatmap (exceedance/persistence), env_params (solar irradiance, GHI/DNI/DHI).
   - Commercial: AI data-center/energy companies. Difficulty: medium. Demo: good (site ranking + comparison).
8. **Fleet/cold-chain thermal-risk agent** — Track 3.
   - Why relevant: domain-fresh idea seen among participants (ReeferCast); temperature-damaged cargo is a concrete business loss.
   - API needed: heatmap, env_params, forecast (+12h) for rerouting; requires third-party cold-chain route/cargo data.
   - Commercial: logistics enterprises. Difficulty: medium-high (needs external data). Demo: good.

### Practical guardrails for whichever idea is chosen
- Verify forecast endpoint health + +12h behavior with the hackathon key before betting a project on it. [INFERENCE]
- Verify US coverage + date range limits early; pick a well-documented US city AOI (e.g., San Jose is the repo's reference). [INFERENCE]
- Cache API responses during development to preserve demo credits. [TECHNICAL]
- Keep API key server-side, `.env` git-ignored. [OFFICIAL]
- Plan the 3-min video and incognito-ready live demo as first-class deliverables, not afterthoughts. [OFFICIAL]

---
*End of context file. No project decision made; no implementation started.*