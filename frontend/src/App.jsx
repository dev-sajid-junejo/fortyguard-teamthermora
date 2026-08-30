import { useState } from 'react'
import Map from './components/Map'
import RankedResults from './components/RankedResults'
import Recommendation from './components/Recommendation'
import VerdictLegend from './components/VerdictLegend'
import CopilotChat from './components/CopilotChat'
import LocationPicker from './components/LocationPicker'
import ComparisonMatrix from './components/ComparisonMatrix'
import CostEstimator from './components/CostEstimator'
import VoiceAlert from './components/VoiceAlert'
import ImpactSimulator from './components/ImpactSimulator'

const API_BASE = '/api'

export default function App() {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedSite, setSelectedSite] = useState(null)
  const [mode, setMode] = useState(null) // 'demo' or 'live'
  const [location, setLocation] = useState(null) // { parcels, city, stateCode, lat, lon }

  const runDemo = async (locationData) => {
    setLoading(true)
    setError(null)
    setMode('demo')
    setLocation(locationData)
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcels: locationData.parcels.map(f => ({
            parcel_id: f.properties.parcel_id,
            name: f.properties.name || '',
            geometry: f.geometry,
            properties: f.properties,
          })),
          study_date: '2026-08-03',
          window_start: '2026-08-03',
          window_end: '2026-08-03',
          granularity: 80,
          buffer_m: 400,
          exceedance_threshold_c: 32.0,
          refresh: false,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        const detail = typeof err.detail === 'object' ? err.detail.message || JSON.stringify(err.detail) : err.detail
        throw new Error(detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setAnalysis(data)
      setSelectedSite(data.sites[data.sites.length - 1])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const runLive = async (locationData) => {
    setLoading(true)
    setError(null)
    setMode('live')
    setLocation(locationData)
    try {
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 6)
      const fmt = d => d.toISOString().split('T')[0]

      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcels: locationData.parcels.map(f => ({
            parcel_id: f.properties.parcel_id,
            name: f.properties.name || '',
            geometry: f.geometry,
            properties: f.properties,
          })),
          study_date: fmt(today),
          window_start: fmt(weekAgo),
          window_end: fmt(today),
          granularity: 80,
          buffer_m: 400,
          exceedance_threshold_c: 32.0,
          refresh: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        const detail = typeof err.detail === 'object' ? err.detail.message || JSON.stringify(err.detail) : err.detail
        throw new Error(detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setAnalysis(data)
      setSelectedSite(data.sites[data.sites.length - 1])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              <span className="text-[#0E4A8A]">Site</span>Verdict
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Heat-Risk Due-Diligence Platform{location ? ` · ${location.city}, ${location.stateCode}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {analysis && (
              <button
                onClick={() => { setAnalysis(null); setSelectedSite(null); setMode(null); setLocation(null) }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg
                  hover:bg-slate-50 transition-colors"
              >
                New Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {!analysis && !loading && (
          <div className="py-10">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🌡️</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Which site should you choose?
              </h2>
              <p className="text-slate-500 max-w-lg mx-auto">
                SiteVerdict compares candidate sites using FortyGuard's hyperlocal temperature
                intelligence. Select any US location to analyze.
              </p>
            </div>
            
            <LocationPicker 
              onDemo={runDemo}
              onLive={runLive}
              loading={loading}
            />
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-[#0E4A8A] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">
              {mode === 'live' ? 'Calling FortyGuard API...' : 'Running analysis pipeline...'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {mode === 'live'
                ? `Fetching heatmap for ${location?.city || 'selected location'}...`
                : `Using cached FortyGuard data for ${location?.city || 'selected location'}`}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            {/* Mode badge */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                mode === 'live'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${mode === 'live' ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                {mode === 'live' ? 'LIVE — FortyGuard API' : 'DEMO — Cached Data'}
              </span>
              {mode === 'live' && (
                <span className="text-xs text-slate-400">
                  Real API credits consumed
                </span>
              )}
              {mode === 'demo' && (
                <span className="text-xs text-slate-400">
                  Zero API credits consumed
                </span>
              )}
            </div>

            {/* Summary bar */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div>
                  <span className="text-slate-400">Region</span>
                  <p className="font-semibold">{location?.city || 'Unknown'}, {location?.stateCode || ''}</p>
                </div>
                <div>
                  <span className="text-slate-400">Study Date</span>
                  <p className="font-semibold">{analysis.study_date}</p>
                </div>
                <div>
                  <span className="text-slate-400">Window</span>
                  <p className="font-semibold">{analysis.window_start} → {analysis.window_end}</p>
                </div>
                <div>
                  <span className="text-slate-400">Window Hours</span>
                  <p className="font-semibold">{analysis.window_hours}h</p>
                </div>
                <div>
                  <span className="text-slate-400">Tiles</span>
                  <p className="font-semibold">{analysis.n_tiles.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-400">Sites</span>
                  <p className="font-semibold">{analysis.sites.length}</p>
                </div>
                <div>
                  <span className="text-slate-400">Threshold</span>
                  <p className="font-semibold">{analysis.exceedance_threshold_c}°C</p>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <Recommendation text={analysis.recommendation} />

            {/* Voice Alert for High Risk */}
            <VoiceAlert sites={analysis.sites} analysis={analysis} />

            {/* Map + Results side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <Map
                  sites={analysis.sites}
                  selectedSite={selectedSite}
                  onSelect={setSelectedSite}
                  heatmapTcm={analysis.heatmap_tcm}
                  heatmapExceedance={analysis.heatmap_exceedance}
                  heatmapPersistence={analysis.heatmap_persistence}
                  aoiGeometry={analysis.aoi_geometry}
                />
              </div>
              <div className="lg:col-span-3">
                <RankedResults
                  sites={analysis.sites}
                  selectedSite={selectedSite}
                  onSelect={setSelectedSite}
                />
              </div>
            </div>

            {/* Site Comparison Matrix */}
            <ComparisonMatrix sites={analysis.sites} />

            {/* Heat Risk Cost Estimator */}
            <CostEstimator sites={analysis.sites} />

            {/* Before/After Impact Simulator */}
            <ImpactSimulator sites={analysis.sites} />

            {/* Verdict Legend */}
            <VerdictLegend />

            {/* AI Copilot */}
            <CopilotChat analysis={analysis} />
          </div>
        )}
      </main>
    </div>
  )
}
