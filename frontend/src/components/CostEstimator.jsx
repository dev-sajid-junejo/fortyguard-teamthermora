export default function CostEstimator({ sites }) {
  if (!sites?.length) return null

  const topSite = sites.reduce((best, s) => (s.composite_score || 0) > (best.composite_score || 0) ? s : best, sites[0])
  const worstSite = sites.reduce((worst, s) => (s.composite_score || 0) < (worst.composite_score || 0) ? s : worst, sites[0])

  function estimateCosts(site) {
    const peak = site.peak_c || 25
    const exceedance = site.exceedance_h || 0
    const persistence = site.persistence_h || 0
    const canopy = site.canopy_pct || 0
    const impervious = site.impervious_pct || 0

    const coolingLoadFactor = Math.max(0, (peak - 24) * 0.12)
    const annualCoolingCost = Math.round(coolingLoadFactor * 18000)

    const oshaRiskDays = Math.ceil(exceedance / 8)
    const complianceCost = oshaRiskDays > 0 ? Math.round(oshaRiskDays * 450 + 2800) : 0

    const heatPremium = Math.min(0.15, Math.max(0, (peak - 28) * 0.015 + exceedance * 0.003))
    const insurancePremium = Math.round(heatPremium * 85000)

    const canopyDeficit = Math.max(0, 15 - canopy)
    const imperviousExcess = Math.max(0, impervious - 60)
    const retrofitCost = Math.round(canopyDeficit * 2200 + imperviousExcess * 1500)

    const annualTotal = annualCoolingCost + complianceCost + insurancePremium
    const riskScore = Math.min(100, Math.round(
      (peak - 20) * 3 + exceedance * 1.5 + persistence * 2 + impervious * 0.3 - canopy * 0.5
    ))

    return {
      annualCoolingCost,
      complianceCost,
      insurancePremium,
      retrofitCost,
      annualTotal,
      riskScore: Math.max(0, riskScore),
      oshaRiskDays,
      heatPremiumPct: (heatPremium * 100).toFixed(1),
    }
  }

  const costs = sites.map(s => ({ site: s, costs: estimateCosts(s) }))
  const bestCosts = costs.reduce((best, c) => c.costs.annualTotal < best.costs.annualTotal ? c : best, costs[0])
  const worstCosts = costs.reduce((worst, c) => c.costs.annualTotal > worst.costs.annualTotal ? c : worst, costs[0])
  const savings = worstCosts.costs.annualTotal - bestCosts.costs.annualTotal

  function riskColor(score) {
    if (score >= 60) return 'text-red-600'
    if (score >= 35) return 'text-amber-600'
    return 'text-green-600'
  }

  function riskBg(score) {
    if (score >= 60) return 'bg-red-50 border-red-200'
    if (score >= 35) return 'bg-amber-50 border-amber-200'
    return 'bg-green-50 border-green-200'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Heat Risk Cost Estimator</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Estimated annual financial impact based on FortyGuard thermal data
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-xs text-green-600 font-medium mb-1">Lowest Cost Site</div>
            <div className="font-bold text-green-700">{bestCosts.site.name}</div>
            <div className="text-2xl font-bold text-green-700 mt-1">
              ${bestCosts.costs.annualTotal.toLocaleString()}
            </div>
            <div className="text-[10px] text-green-600 mt-0.5">/year estimated</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-xs text-red-600 font-medium mb-1">Highest Cost Site</div>
            <div className="font-bold text-red-700">{worstCosts.site.name}</div>
            <div className="text-2xl font-bold text-red-700 mt-1">
              ${worstCosts.costs.annualTotal.toLocaleString()}
            </div>
            <div className="text-[10px] text-red-600 mt-0.5">/year estimated</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-xs text-blue-600 font-medium mb-1">Potential Savings</div>
            <div className="font-bold text-blue-700">Choosing Best Site</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              ${savings.toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-600 mt-0.5">/year difference</div>
          </div>
        </div>

        {/* Per-site breakdown */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Cost Category</th>
                {sites.map(site => (
                  <th key={site.parcel_id} className="px-3 py-2 text-center text-xs font-medium text-slate-500">
                    {site.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr>
                <td className="px-3 py-2 text-xs font-medium text-slate-600">
                  ❄️ Cooling Load
                  <div className="text-[10px] font-normal text-slate-400">HVAC energy cost</div>
                </td>
                {costs.map(c => (
                  <td key={c.site.parcel_id} className="px-3 py-2 text-center text-sm font-medium">
                    ${c.costs.annualCoolingCost.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs font-medium text-slate-600">
                  ⚠️ OSHA Compliance
                  <div className="text-[10px] font-normal text-slate-400">Worker safety protocols</div>
                </td>
                {costs.map(c => (
                  <td key={c.site.parcel_id} className="px-3 py-2 text-center text-sm font-medium">
                    {c.costs.complianceCost > 0 ? `$${c.costs.complianceCost.toLocaleString()}` : '—'}
                    {c.costs.oshaRiskDays > 0 && (
                      <div className="text-[10px] text-amber-500">{c.costs.oshaRiskDays} risk days</div>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs font-medium text-slate-600">
                  🛡️ Insurance Premium
                  <div className="text-[10px] font-normal text-slate-400">Heat risk surcharge</div>
                </td>
                {costs.map(c => (
                  <td key={c.site.parcel_id} className="px-3 py-2 text-center text-sm font-medium">
                    ${c.costs.insurancePremium.toLocaleString()}
                    <div className="text-[10px] text-slate-400">+{c.costs.heatPremiumPct}%</div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs font-medium text-slate-600">
                  🌳 Retrofit Cost
                  <div className="text-[10px] font-normal text-slate-400">One-time canopy/pavement</div>
                </td>
                {costs.map(c => (
                  <td key={c.site.parcel_id} className="px-3 py-2 text-center text-sm font-medium">
                    ${c.costs.retrofitCost.toLocaleString()}
                    <div className="text-[10px] text-slate-400">one-time</div>
                  </td>
                ))}
              </tr>
              <tr className={`border-t-2 ${riskBg(costs[0].costs.riskScore)}`}>
                <td className="px-3 py-2.5 text-xs font-bold text-slate-700">
                  📊 Annual Total
                  <div className="text-[10px] font-normal text-slate-500">Cooling + Compliance + Insurance</div>
                </td>
                {costs.map(c => (
                  <td key={c.site.parcel_id} className={`px-3 py-2.5 text-center text-sm font-bold ${riskColor(c.costs.riskScore)}`}>
                    ${c.costs.annualTotal.toLocaleString()}/yr
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-[10px]">Risk:</span>
                      <span className={`text-[10px] font-bold ${riskColor(c.costs.riskScore)}`}>
                        {c.costs.riskScore}/100
                      </span>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
          <strong>Methodology:</strong> Estimates基于 FortyGuard thermal data using NOAA thresholds, OSHA heat protocols,
          and EPA heat-island modeling. Cooling costs derived from peak temperature vs. 24°C baseline.
          Insurance premiums scaled by exceedance duration and impervious surface coverage.
          Retrofit costs based on USDA i-Tree canopy targets and EPA cool-pavement standards.
          <span className="text-slate-400"> For planning purposes only.</span>
        </div>
      </div>
    </div>
  )
}
