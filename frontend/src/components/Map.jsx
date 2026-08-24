import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function computeCentroid(geometry) {
  if (!geometry || !geometry.coordinates) return [0, 0]
  const coords = geometry.coordinates[0]
  if (!coords || !coords.length) return [0, 0]
  let sumLon = 0, sumLat = 0
  for (const [lon, lat] of coords) {
    sumLon += lon
    sumLat += lat
  }
  return [sumLat / coords.length, sumLon / coords.length]
}

// Color scales for different heatmap layers
const COLOR_SCALES = {
  tcm: {
    field: 'average_temperature',
    label: 'Temperature (°C)',
    colors: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
    getRange: (features) => {
      const temps = features.map(f => f.properties.average_temperature).filter(v => v != null)
      return { min: Math.min(...temps), max: Math.max(...temps) }
    }
  },
  exceedance: {
    field: 'value',
    label: 'Exceedance Hours',
    colors: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'],
    getRange: (features) => {
      const vals = features.map(f => f.properties.value).filter(v => v != null)
      return { min: 0, max: Math.max(...vals, 1) }
    }
  },
  persistence: {
    field: 'value',
    label: 'Persistence (hours)',
    colors: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'],
    getRange: (features) => {
      const vals = features.map(f => f.properties.value).filter(v => v != null)
      return { min: 0, max: Math.max(...vals, 1) }
    }
  }
}

function interpolateColor(value, min, max, colors) {
  if (max === min) return colors[Math.floor(colors.length / 2)]
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const idx = Math.min(Math.floor(t * (colors.length - 1)), colors.length - 2)
  return colors[idx]
}

export default function Map({ sites, selectedSite, onSelect, heatmapTcm, heatmapExceedance, heatmapPersistence, aoiGeometry }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef([])
  const heatmapLayerRef = useRef(null)
  const aoiLayerRef = useRef(null)
  const [activeLayer, setActiveLayer] = useState('tcm')

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    mapInstance.current = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([40.74, -73.96], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current)

    return () => { mapInstance.current?.remove(); mapInstance.current = null }
  }, [])

  // Render heatmap layer
  useEffect(() => {
    if (!mapInstance.current) return
    
    // Remove old heatmap layer
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.remove()
      heatmapLayerRef.current = null
    }

    // Get the appropriate heatmap data
    let heatmapData = null
    if (activeLayer === 'tcm' && heatmapTcm) {
      heatmapData = heatmapTcm
    } else if (activeLayer === 'exceedance' && heatmapExceedance) {
      heatmapData = heatmapExceedance
    } else if (activeLayer === 'persistence' && heatmapPersistence) {
      heatmapData = heatmapPersistence
    }

    if (!heatmapData || !heatmapData.features?.length) return

    const scaleConfig = COLOR_SCALES[activeLayer]
    const { min, max } = scaleConfig.getRange(heatmapData.features)

    // Create GeoJSON layer with colored polygons
    const heatmapLayer = L.geoJSON(heatmapData, {
      style: (feature) => {
        const value = feature.properties[scaleConfig.field] ?? 0
        return {
          fillColor: interpolateColor(value, min, max, scaleConfig.colors),
          weight: 0.5,
          color: '#ffffff',
          fillOpacity: 0.7,
        }
      },
      onEachFeature: (feature, layer) => {
        const value = feature.properties[scaleConfig.field]
        const tooltipContent = activeLayer === 'tcm'
          ? `<b>Tile ${feature.properties.tile_id}</b><br/>Temp: ${value?.toFixed(1) ?? 'N/A'}°C`
          : `<b>Tile ${feature.properties.tile_id}</b><br/>${scaleConfig.label}: ${value?.toFixed(1) ?? 'N/A'}` //` `.trim()
        layer.bindTooltip(tooltipContent, { sticky: true })
      }
    }).addTo(mapInstance.current)

    heatmapLayerRef.current = heatmapLayer

    // Fit map to heatmap bounds
    if (heatmapLayer.getBounds().isValid()) {
      mapInstance.current.fitBounds(heatmapLayer.getBounds(), { padding: [20, 20] })
    }
  }, [activeLayer, heatmapTcm, heatmapExceedance, heatmapPersistence])

  // Render AOI boundary
  useEffect(() => {
    if (!mapInstance.current) return
    
    if (aoiLayerRef.current) {
      aoiLayerRef.current.remove()
      aoiLayerRef.current = null
    }

    if (aoiGeometry) {
      aoiLayerRef.current = L.geoJSON(aoiGeometry, {
        style: {
          fillColor: 'transparent',
          weight: 2,
          color: '#0E4A8A',
          dashArray: '5, 10',
          fillOpacity: 0,
        }
      }).addTo(mapInstance.current)
    }
  }, [aoiGeometry])

  // Render site markers
  useEffect(() => {
    if (!mapInstance.current) return
    layersRef.current.forEach(l => l.remove())
    layersRef.current = []

    if (!sites?.length) return

    const bounds = []

    sites.forEach((site) => {
      const isBest = site.rank === sites.length
      const isWorst = site.rank === 1
      const isSelected = selectedSite?.parcel_id === site.parcel_id

      const color = isBest ? '#22c55e' : isWorst ? '#ef4444' : '#f59e0b'
      const radius = Math.max(12, Math.min(25, (100 - (site.composite_score || 50)) / 3))

      const centroid = getCentroidFromSite(site)
      const circle = L.circleMarker(centroid, {
        radius: isSelected ? radius + 5 : radius,
        fillColor: color,
        color: isSelected ? '#0E4A8A' : '#fff',
        weight: isSelected ? 3 : 2,
        fillOpacity: 0.9,
      }).addTo(mapInstance.current)

      circle.bindTooltip(
        `<b>#${site.rank} ${site.name}</b><br/>
         Peak: ${site.peak_c}°C<br/>
         Exceedance: ${site.exceedance_h}h<br/>
         Composite: ${site.composite_score}`,
        { direction: 'top', offset: [0, -10] }
      )

      circle.on('click', () => onSelect(site))
      layersRef.current.push(circle)
      bounds.push(centroid)
    })

    // Only fit bounds if no heatmap is shown (heatmap controls bounds)
    if (bounds.length && !heatmapLayerRef.current) {
      mapInstance.current.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [sites, selectedSite, onSelect])

  // Update marker styles on selection change
  useEffect(() => {
    layersRef.current.forEach((layer, i) => {
      const site = sites?.[i]
      if (!site) return
      const isSelected = selectedSite?.parcel_id === site.parcel_id
      layer.setStyle({
        radius: isSelected ? 25 : 15,
        weight: isSelected ? 3 : 2,
        color: isSelected ? '#0E4A8A' : '#fff',
      })
    })
  }, [selectedSite, sites])

  // Get color scale for legend
  const scaleConfig = COLOR_SCALES[activeLayer]
  const hasData = activeLayer === 'tcm' ? heatmapTcm : activeLayer === 'exceedance' ? heatmapExceedance : heatmapPersistence

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Portfolio Map</h3>
        <p className="text-xs text-slate-400 mt-0.5">Click a site to inspect</p>
      </div>
      
      {/* Layer selector */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex gap-2">
        {Object.entries(COLOR_SCALES).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveLayer(key)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              activeLayer === key
                ? 'bg-[#0E4A8A] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {key === 'tcm' ? 'Temperature' : key === 'exceedance' ? 'Exceedance' : 'Persistence'}
          </button>
        ))}
      </div>

      <div ref={mapRef} className="h-[400px] w-full" />
      
      {/* Legend */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-700">
            FortyGuard {scaleConfig.label}
          </span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
            <span className="text-xs text-slate-500">Highest</span>
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block ml-2"></span>
            <span className="text-xs text-slate-500">Moderate</span>
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block ml-2"></span>
            <span className="text-xs text-slate-500">Lowest</span>
          </div>
        </div>
        {hasData && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded" style={{
              background: `linear-gradient(to right, ${scaleConfig.colors.join(', ')})`
            }}></div>
            <span className="text-xs text-slate-500">Low → High</span>
          </div>
        )}
        <p className="text-[10px] text-slate-400 mt-1">
          Thermal data from FortyGuard Temperature API
        </p>
      </div>
    </div>
  )
}

function getCentroidFromSite(site) {
  if (site._centroid) return site._centroid
  if (site.geometry) return computeCentroid(site.geometry)
  return [40.74, -73.96]
}
