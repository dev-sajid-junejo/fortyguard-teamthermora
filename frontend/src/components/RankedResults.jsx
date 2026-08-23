import VerdictBadge from './VerdictBadge'

export default function RankedResults({ sites, selectedSite, onSelect }) {
  if (!sites?.length) return null

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Ranked Results</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Sorted by heat exposure duration (highest → lowest)
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {sites.map((site) => {
          const isSelected = selectedSite?.parcel_id === site.parcel_id
          const isBest = site.rank === sites.length
          const isWorst = site.rank === 1

          return (
            <div
              key={site.parcel_id}
              onClick={() => onSelect(site)}
              className={`px-5 py-4 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-blue-50 border-l-4 border-l-[#0E4A8A]'
                  : 'hover:bg-slate-50 border-l-4 border-l-transparent'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                    ${isWorst ? 'bg-red-100 text-red-700' :
                      isBest ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-600'}`}>
                    {site.rank}
                  </span>
                  <div>
                    <h4 className="font-semibold text-slate-900">{site.name || site.parcel_id}</h4>
                    <p className="text-xs text-slate-400">{site.parcel_id} · {site.area_acres} ac</p>
                  </div>
                </div>
                {site.composite_score !== null && (
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Score</div>
                    <div className={`text-lg font-bold ${
                      site.composite_score >= 75 ? 'text-green-600' :
                      site.composite_score >= 60 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {site.composite_score}
                    </div>
                  </div>
                )}
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <MetricCell label="Peak" value={site.peak_c} unit="°C" />
                <MetricCell label="Exceedance" value={site.exceedance_h} unit="h" />
                <MetricCell label="Persistence" value={site.persistence_h} unit="h" />
              </div>

              {/* Verdicts row */}
              {site.verdicts?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {site.verdicts.filter(v => v.verdict !== 'N/A').map((v, i) => (
                    <VerdictBadge key={i} verdict={v} />
                  ))}
                </div>
              )}

              {/* Explanation */}
              {isSelected && site.explanation && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600"
                  dangerouslySetInnerHTML={{ __html: formatExplanation(site.explanation) }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MetricCell({ label, value, unit }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-lg">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-semibold text-slate-900">
        {value !== null && value !== undefined ? `${value}${unit}` : '—'}
      </div>
    </div>
  )
}

function formatExplanation(text) {
  const safe = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 rounded text-xs">$1</code>')
  return safe.replace(/<script[\s\S]*?<\/script>/gi, '')
}
