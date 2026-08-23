import { useState } from 'react'
import Map from './components/Map'
import RankedResults from './components/RankedResults'
import Recommendation from './components/Recommendation'
import VerdictLegend from './components/VerdictLegend'
import CopilotChat from './components/CopilotChat'

const API_BASE = '/api'

export default function App() {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedSite, setSelectedSite] = useState(null)
  const [mode, setMode] = useState(null) // 'demo' or 'live'

  const runDemo = async () => {
    setLoading(true)
    setError(null)
    setMode('demo')
    try {
      const res = await fetch(`${API_BASE}/demo/analyze`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAnalysis(data)
      setSelectedSite(data.sites[data.sites.length - 1])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const runLive = async () => {
    setLoading(true)
    setError(null)
    setMode('live')
    try {
      // Use the NYC sample parcels as input, but with refresh=true for live API calls
      const parcelsRes = await fetch(`${API_BASE}/demo/parcels`)
      if (!parcelsRes.ok) throw new Error('Failed to load parcel data')
      const parcelsData = await parcelsRes.json()

      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 6)
      const fmt = d => d.toISOString().split('T')[0]

      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcels: parcelsData.features.map(f => ({
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
        throw new Error(err.detail || `HTTP ${res.status}`)
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
              Heat-Risk Due-Diligence Platform · New York
            </p>
          </div>
          <div className="flex items-center gap-4">
            {!analysis && (
              <div className="flex gap-3">
                <button
                  onClick={runDemo}
                  disabled={loading}
                  className="px-5 py-2.5 bg-slate-600 text-white font-medium rounded-lg
                    hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors shadow-sm text-sm"
                >
                  {loading && mode === 'demo' ? 'Analyzing...' : 'Demo Mode'}
                </button>
                <button
                  onClick={runLive}
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#0E4A8A] text-white font-medium rounded-lg
                    hover:bg-[#0c3d73] disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors shadow-sm text-sm"
                >
                  {loading && mode === 'live' ? 'Analyzing...' : 'Run Live (FortyGuard API)'}
                </button>
              </div>
            )}
            {analysis && (
              <button
                onClick={() => { setAnalysis(null); setSelectedSite(null); setMode(null) }}
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
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🌡️</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Which site should you choose?
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto mb-6">
              SiteVerdict compares candidate sites using FortyGuard's hyperlocal temperature
              intelligence. Peak temperature alone is misleading — exposure duration tells
              the real story.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <button
                onClick={runDemo}
                disabled={loading}
                className="px-8 py-3 bg-slate-600 text-white font-semibold rounded-lg
                  hover:bg-slate-700 transition-colors shadow-md text-lg"
              >
                Run Demo: 6 NYC Sites
              </button>
              <button
                onClick={runLive}
                disabled={loading}
                className="px-8 py-3 bg-[#0E4A8A] text-white font-semibold rounded-lg
                  hover:bg-[#0c3d73] transition-colors shadow-md text-lg"
              >
                Run Live: FortyGuard API
              </button>
            </div>
            <div className="flex justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                Demo — cached data, zero credits
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0E4A8A] inline-block"></span>
                Live — real FortyGuard API calls
              </span>
            </div>
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
                ? 'Fetching heatmap, exceedance, and persistence layers'
                : 'Using cached FortyGuard data'}
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
                  Real API credits consumed for this analysis
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
                  <p className="font-semibold">New York</p>
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

            {/* Map + Results side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <Map
                  sites={analysis.sites}
                  selectedSite={selectedSite}
                  onSelect={setSelectedSite}
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
