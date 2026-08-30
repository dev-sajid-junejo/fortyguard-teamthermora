import VerdictBadge from './VerdictBadge'

export default function ComparisonMatrix({ sites }) {
  if (!sites?.length) return null

  const metrics = [
    { key: 'rank', label: 'Rank', format: v => `#${v}`, best: 'low' },
    { key: 'peak_c', label: 'Peak Temp', format: v => `${v}°C`, best: 'low' },
    { key: 'mean_c', label: 'Mean Temp', format: v => `${v}°C`, best: 'low' },
    { key: 'exceedance_h', label: 'Exceedance', format: v => `${v}h`, best: 'low' },
    { key: 'persistence_h', label: 'Persistence', format: v => `${v}h`, best: 'low' },
    { key: 'hi_c_at_hot_hour', label: 'Heat Index', format: v => `${v}°C`, best: 'low' },
    { key: 'canopy_pct', label: 'Canopy', format: v => `${v}%`, best: 'high' },
    { key: 'impervious_pct', label: 'Impervious', format: v => `${v}%`, best: 'low' },
    { key: 'composite_score', label: 'Score', format: v => `${v}/100`, best: 'high' },
  ]

  function getBestWorst(sites, key, direction) {
    const vals = sites.map(s => s[key]).filter(v => v != null)
    if (!vals.length) return { best: null, worst: null }
    return direction === 'high'
      ? { best: Math.max(...vals), worst: Math.min(...vals) }
      : { best: Math.min(...vals), worst: Math.max(...vals) }
  }

  function cellClass(val, site, metric) {
    if (val == null) return ''
    const { best, worst } = getBestWorst(sites, metric.key, metric.best)
    if (val === best && best !== worst) return 'text-green-700 font-bold bg-green-50'
    if (val === worst && best !== worst) return 'text-red-700 font-bold bg-red-50'
    return ''
  }

  const verdictCounts = sites.map(s => {
    const v = s.verdicts || []
    return {
      pass: v.filter(x => x.verdict === 'PASS').length,
      caution: v.filter(x => x.verdict === 'CAUTION').length,
      fail: v.filter(x => x.verdict === 'FAIL').length,
    }
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Site Comparison Matrix</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Side-by-side metrics — green = best, red = worst in category
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 sticky left-0 bg-slate-50 z-10">
                Metric
              </th>
              {sites.map((site, i) => (
                <th key={site.parcel_id} className="px-4 py-2 text-center text-xs font-medium text-slate-500 min-w-[120px]">
                  <div className="font-semibold text-slate-700">{site.name || site.parcel_id}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {site.rank === sites.length ? '🏆 Best' : site.rank === 1 ? '⚠️ Worst' : `#${site.rank}`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {metrics.map(metric => (
              <tr key={metric.key} className="hover:bg-slate-50/50">
                <td className="px-4 py-2.5 text-xs font-medium text-slate-600 sticky left-0 bg-white hover:bg-slate-50/50 z-10">
                  {metric.label}
                </td>
                {sites.map(site => {
                  const val = site[metric.key]
                  return (
                    <td key={site.parcel_id} className={`px-4 py-2.5 text-center text-sm ${cellClass(val, site, metric)}`}>
                      {val != null ? metric.format(val) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* Verdict summary row */}
            <tr className="bg-slate-50/80">
              <td className="px-4 py-2.5 text-xs font-medium text-slate-600 sticky left-0 bg-slate-50/80 z-10">
                Verdicts
              </td>
              {sites.map((site, i) => (
                <td key={site.parcel_id} className="px-4 py-2.5">
                  <div className="flex items-center justify-center gap-1">
                    {verdictCounts[i].pass > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                        {verdictCounts[i].pass} PASS
                      </span>
                    )}
                    {verdictCounts[i].caution > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                        {verdictCounts[i].caution} WARN
                      </span>
                    )}
                    {verdictCounts[i].fail > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                        {verdictCounts[i].fail} FAIL
                      </span>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
