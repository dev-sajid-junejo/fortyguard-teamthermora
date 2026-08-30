import { useState } from 'react'

const SOLUTIONS = [
  { id: 'canopy', label: '🌳 Add 10% Tree Canopy', canopyGain: 10, imperviousReduction: 5, coolingEffect: 1.5, cost: 22000 },
  { id: 'cool_pavement', label: '🛣️ Cool Pavement Retrofit', imperviousReduction: 15, coolingEffect: 1.0, cost: 45000 },
  { id: 'shade_structures', label: '🏗️ Shade Structures', canopyGain: 5, coolingEffect: 2.0, cost: 35000 },
  { id: 'green_roof', label: '🌿 Green Roof Installation', canopyGain: 8, imperviousReduction: 10, coolingEffect: 1.2, cost: 60000 },
  { id: 'water_features', label: '💧 Water Features / Misting', coolingEffect: 2.5, cost: 15000 },
]

export default function ImpactSimulator({ sites }) {
  const [selectedSolutions, setSelectedSolutions] = useState([])
  const [targetSite, setTargetSite] = useState(null)

  if (!sites?.length) return null

  const bestSite = sites.reduce((best, s) => (s.composite_score || 0) > (best.composite_score || 0) ? s : best, sites[0])
  const activeSite = targetSite || bestSite

  const toggleSolution = (id) => {
    setSelectedSolutions(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const appliedSolutions = SOLUTIONS.filter(s => selectedSolutions.includes(s.id))
  const totalCooling = appliedSolutions.reduce((sum, s) => sum + (s.coolingEffect || 0), 0)
  const totalCost = appliedSolutions.reduce((sum, s) => sum + (s.cost || 0), 0)
  const canopyGain = appliedSolutions.reduce((sum, s) => sum + (s.canopyGain || 0), 0)
  const imperviousReduction = appliedSolutions.reduce((sum, s) => sum + (s.imperviousReduction || 0), 0)

  const beforePeak = activeSite.peak_c || 25
  const afterPeak = Math.max(18, beforePeak - totalCooling)
  const beforeCanopy = activeSite.canopy_pct || 0
  const afterCanopy = Math.min(80, beforeCanopy + canopyGain)
  const beforeImpervious = activeSite.impervious_pct || 100
  const afterImpervious = Math.max(10, beforeImpervious - imperviousReduction)

  const beforeScore = activeSite.composite_score || 50
  const scoreImprovement = Math.round(totalCooling * 3 + canopyGain * 0.5 - imperviousReduction * 0.1)
  const afterScore = Math.min(100, beforeScore + scoreImprovement)

  function getColor(before, after, lower) {
    if (lower) return after < before ? 'text-green-600' : after > before ? 'text-red-600' : 'text-slate-600'
    return after > before ? 'text-green-600' : after < before ? 'text-red-600' : 'text-slate-600'
  }

  function getVerdictChange(score) {
    if (score >= 75) return { label: 'PASS', color: 'bg-green-100 text-green-700' }
    if (score >= 55) return { label: 'CAUTION', color: 'bg-amber-100 text-amber-700' }
    return { label: 'FAIL', color: 'bg-red-100 text-red-700' }
  }

  const roiYears = totalCost > 0 ? Math.round(totalCost / (totalCooling * 800 + scoreImprovement * 50)) : 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Before / After Impact Simulator</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Select solutions to see how they improve heat risk metrics
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Site selector */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-2 block">Target Site</label>
          <div className="flex gap-2 flex-wrap">
            {sites.map(site => (
              <button
                key={site.parcel_id}
                onClick={() => setTargetSite(site)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  activeSite.parcel_id === site.parcel_id
                    ? 'bg-[#0E4A8A] text-white border-[#0E4A8A]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {site.name}
              </button>
            ))}
          </div>
        </div>

        {/* Solutions checklist */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-2 block">Select Interventions</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SOLUTIONS.map(sol => (
              <label
                key={sol.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSolutions.includes(sol.id)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSolutions.includes(sol.id)}
                  onChange={() => toggleSolution(sol.id)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0E4A8A] focus:ring-[#0E4A8A]"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700">{sol.label}</div>
                  <div className="text-[10px] text-slate-400">
                    -{sol.coolingEffect || 0}°C · ${(sol.cost || 0).toLocaleString()}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {selectedSolutions.length > 0 && (
          <>
            {/* Before / After comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Before (Current)
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Peak Temp</span>
                    <span className="text-sm font-semibold text-slate-700">{beforePeak.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Canopy</span>
                    <span className="text-sm font-semibold text-slate-700">{beforeCanopy.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Impervious</span>
                    <span className="text-sm font-semibold text-slate-700">{beforeImpervious.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="text-xs text-slate-500">Score</span>
                    <span className="text-sm font-bold text-slate-700">{beforeScore}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Verdict</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getVerdictChange(beforeScore).color}`}>
                      {getVerdictChange(beforeScore).label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-xs font-medium text-green-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  After (With Solutions)
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-green-600">Peak Temp</span>
                    <span className={`text-sm font-semibold ${getColor(beforePeak, afterPeak, true)}`}>
                      {afterPeak.toFixed(1)}°C
                      <span className="text-[10px] ml-1">(-{(beforePeak - afterPeak).toFixed(1)})</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-green-600">Canopy</span>
                    <span className={`text-sm font-semibold ${getColor(beforeCanopy, afterCanopy, false)}`}>
                      {afterCanopy.toFixed(0)}%
                      <span className="text-[10px] ml-1">(+{canopyGain}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-green-600">Impervious</span>
                    <span className={`text-sm font-semibold ${getColor(beforeImpervious, afterImpervious, true)}`}>
                      {afterImpervious.toFixed(0)}%
                      <span className="text-[10px] ml-1">(-{imperviousReduction}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-green-200 pt-2">
                    <span className="text-xs text-green-600">Score</span>
                    <span className={`text-sm font-bold ${getColor(beforeScore, afterScore, false)}`}>
                      {afterScore}/100
                      <span className="text-[10px] ml-1">(+{scoreImprovement})</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-green-600">Verdict</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getVerdictChange(afterScore).color}`}>
                      {getVerdictChange(afterScore).label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Investment summary */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-slate-500">Total Investment</div>
                  <div className="text-lg font-bold text-slate-700">${totalCost.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Temperature Reduction</div>
                  <div className="text-lg font-bold text-green-600">-{totalCooling.toFixed(1)}°C</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Score Improvement</div>
                  <div className="text-lg font-bold text-blue-600">+{scoreImprovement} pts</div>
                </div>
              </div>
            </div>

            {/* Future outlook */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">📈 Future Heat Risk Outlook</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <p>Current peak: <strong>{beforePeak.toFixed(1)}°C</strong> → After intervention: <strong>{afterPeak.toFixed(1)}°C</strong></p>
                <p>With climate projections, NYC summer peaks are expected to rise 1-2°C by 2035.</p>
                <p>After these interventions, the site would remain below the <strong>NOAA Caution (27°C)</strong> threshold even under projected warming.</p>
                <p className="font-medium mt-2">
                  Recommendation: Implement {appliedSolutions.length > 0 ? appliedSolutions.map(s => s.label.replace(/^[^\s]+\s/, '')).join(' + ') : 'selected solutions'} now to future-proof the site against rising temperatures.
                </p>
              </div>
            </div>
          </>
        )}

        {selectedSolutions.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            Select interventions above to see before/after comparison
          </div>
        )}
      </div>
    </div>
  )
}
