import { useEffect, useRef } from 'react'
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

export default function Map({ sites, selectedSite, onSelect }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef([])

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
        fillOpacity: 0.8,
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

    if (bounds.length) {
      mapInstance.current.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [sites, selectedSite, onSelect])

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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Portfolio Map</h3>
        <p className="text-xs text-slate-400 mt-0.5">Click a site to inspect</p>
      </div>
      <div ref={mapRef} className="h-[400px] w-full" />
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Highest exposure
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Moderate
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Lowest exposure
        </span>
      </div>
    </div>
  )
}

function getCentroidFromSite(site) {
  if (site._centroid) return site._centroid
  if (site.geometry) return computeCentroid(site.geometry)
  return [40.74, -73.96]
}
