import { useState } from 'react'

// US states with major cities and approximate center coordinates
const US_STATES = [
  { code: 'NY', name: 'New York', city: 'New York City', lat: 40.7128, lon: -74.0060 },
  { code: 'CA', name: 'California', city: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  { code: 'TX', name: 'Texas', city: 'Houston', lat: 29.7604, lon: -95.3698 },
  { code: 'FL', name: 'Florida', city: 'Miami', lat: 25.7617, lon: -80.1918 },
  { code: 'AZ', name: 'Arizona', city: 'Phoenix', lat: 33.4484, lon: -112.0740 },
  { code: 'IL', name: 'Illinois', city: 'Chicago', lat: 41.8781, lon: -87.6298 },
  { code: 'PA', name: 'Pennsylvania', city: 'Philadelphia', lat: 39.9526, lon: -75.1652 },
  { code: 'OH', name: 'Ohio', city: 'Columbus', lat: 39.9612, lon: -82.9988 },
  { code: 'GA', name: 'Georgia', city: 'Atlanta', lat: 33.7490, lon: -84.3880 },
  { code: 'NC', name: 'North Carolina', city: 'Charlotte', lat: 35.2271, lon: -80.8431 },
  { code: 'MI', name: 'Michigan', city: 'Detroit', lat: 42.3314, lon: -83.0458 },
  { code: 'WA', name: 'Washington', city: 'Seattle', lat: 47.6062, lon: -122.3321 },
  { code: 'CO', name: 'Colorado', city: 'Denver', lat: 39.7392, lon: -104.9903 },
  { code: 'NV', name: 'Nevada', city: 'Las Vegas', lat: 36.1699, lon: -115.1398 },
  { code: 'MA', name: 'Massachusetts', city: 'Boston', lat: 42.3601, lon: -71.0589 },
  { code: 'TN', name: 'Tennessee', city: 'Nashville', lat: 36.1627, lon: -86.7816 },
  { code: 'IN', name: 'Indiana', city: 'Indianapolis', lat: 39.7684, lon: -86.1581 },
  { code: 'MO', name: 'Missouri', city: 'Kansas City', lat: 39.0997, lon: -94.5786 },
  { code: 'MD', name: 'Maryland', city: 'Baltimore', lat: 39.2904, lon: -76.6122 },
  { code: 'WI', name: 'Wisconsin', city: 'Milwaukee', lat: 43.0389, lon: -87.9065 },
]

// Generate 6 sample parcels around a center point
function generateParcels(centerLat, centerLon, cityName, stateCode) {
  const offsets = [
    { dx: -0.008, dy: 0.006, name: `${cityName} North` },
    { dx: 0.008, dy: 0.006, name: `${cityName} East` },
    { dx: -0.008, dy: -0.006, name: `${cityName} West` },
    { dx: 0.008, dy: -0.006, name: `${cityName} South` },
    { dx: 0.0, dy: 0.008, name: `${cityName} Central` },
    { dx: 0.0, dy: -0.008, name: `${cityName} Downtown` },
  ]

  return offsets.map((offset, i) => {
    const lat = centerLat + offset.dy
    const lon = centerLon + offset.dx
    const size = 0.001

    return {
      type: 'Feature',
      properties: {
        parcel_id: `${stateCode}-${String(i + 1).padStart(3, '0')}`,
        name: offset.name,
        city: cityName,
        state: stateCode,
        lot_acres: 1.5 + Math.random() * 3,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [lon - size, lat - size],
          [lon + size, lat - size],
          [lon + size, lat + size],
          [lon - size, lat + size],
          [lon - size, lat - size],
        ]],
      },
    }
  })
}

export default function LocationPicker({ onDemo, onLive, loading }) {
  const [mode, setMode] = useState('state')
  const [selectedState, setSelectedState] = useState('')
  const [customLat, setCustomLat] = useState('')
  const [customLon, setCustomLon] = useState('')
  const [customCity, setCustomCity] = useState('')

  const buildLocationData = () => {
    let lat, lon, city, stateCode

    if (mode === 'state' && selectedState) {
      const state = US_STATES.find(s => s.code === selectedState)
      if (!state) return null
      lat = state.lat
      lon = state.lon
      city = state.city
      stateCode = state.code
    } else if (mode === 'custom' && customLat && customLon) {
      lat = parseFloat(customLat)
      lon = parseFloat(customLon)
      city = customCity || 'Custom Location'
      stateCode = 'US'
    } else {
      return null
    }

    const parcels = generateParcels(lat, lon, city, stateCode)
    return { parcels, city, stateCode, lat, lon }
  }

  const locData = buildLocationData()

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        🌍 Select Analysis Location
      </h3>
      
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('state')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === 'state'
              ? 'bg-[#0E4A8A] text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Select State
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === 'custom'
              ? 'bg-[#0E4A8A] text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Custom Coordinates
        </button>
      </div>

      {/* State Selector */}
      {mode === 'state' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Choose a US State
          </label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0E4A8A] focus:border-transparent"
          >
            <option value="">Select a state...</option>
            {US_STATES.map(state => (
              <option key={state.code} value={state.code}>
                {state.name} ({state.city})
              </option>
            ))}
          </select>
          {selectedState && (
            <p className="text-sm text-slate-500 mt-2">
              Will analyze 6 sites in {US_STATES.find(s => s.code === selectedState)?.city}, {US_STATES.find(s => s.code === selectedState)?.name}
            </p>
          )}
        </div>
      )}

      {/* Custom Coordinates */}
      {mode === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Latitude</label>
            <input
              type="number"
              step="0.0001"
              placeholder="e.g., 33.4484"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0E4A8A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Longitude</label>
            <input
              type="number"
              step="0.0001"
              placeholder="e.g., -112.0740"
              value={customLon}
              onChange={(e) => setCustomLon(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0E4A8A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Location Name</label>
            <input
              type="text"
              placeholder="e.g., Phoenix Downtown"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0E4A8A] focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Demo / Live Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => locData && onDemo(locData)}
          disabled={loading || !locData}
          className="flex-1 px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg
            hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors shadow-md"
        >
          {loading ? 'Analyzing...' : 'Run Demo (Cached Data)'}
        </button>
        <button
          onClick={() => locData && onLive(locData)}
          disabled={loading || !locData}
          className="flex-1 px-6 py-3 bg-[#0E4A8A] text-white font-semibold rounded-lg
            hover:bg-[#0c3d73] disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors shadow-md"
        >
          {loading ? 'Analyzing...' : 'Run Live (FortyGuard API)'}
        </button>
      </div>

      <div className="flex justify-center gap-6 text-xs text-slate-400 mt-3">
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
  )
}
