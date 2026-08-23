export default function VerdictLegend() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="font-semibold text-slate-900 mb-3">Threshold Sources</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
        <div>
          <h4 className="font-medium text-slate-800 mb-1">NOAA Heat-Index Bands</h4>
          <ul className="space-y-0.5 text-xs">
            <li><span className="text-green-600 font-medium">PASS</span> &lt; 27°C (Caution onset)</li>
            <li><span className="text-amber-600 font-medium">CAUTION</span> 27–32°C (Extreme Caution)</li>
            <li><span className="text-red-600 font-medium">FAIL</span> ≥ 32°C (Extreme Caution+)</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-slate-800 mb-1">OSHA High-Heat Trigger</h4>
          <ul className="space-y-0.5 text-xs">
            <li>≥ 32.2°C (90°F) triggers OSHA heat-illness protocol</li>
            <li>Applies to outdoor worker safety assessments</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-slate-800 mb-1">USDA i-Tree Canopy Target</h4>
          <ul className="space-y-0.5 text-xs">
            <li><span className="text-green-600 font-medium">PASS</span> ≥ 15% canopy cover</li>
            <li><span className="text-red-600 font-medium">FAIL</span> &lt; 15% — planting recommended</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-slate-800 mb-1">EPA Heat Island Impervious Limit</h4>
          <ul className="space-y-0.5 text-xs">
            <li><span className="text-green-600 font-medium">PASS</span> ≤ 60% impervious surface</li>
            <li><span className="text-red-600 font-medium">FAIL</span> &gt; 60% — cool-surface retrofit</li>
          </ul>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-4 border-t border-slate-100 pt-3">
        <strong>Scoring note:</strong> The composite score is a transparent derived metric
        (not an official FortyGuard standard). Weights: exceedance 30%, peak 20%, comfort 20%,
        surface 20%, persistence 10%. Each component normalized against published thresholds.
      </p>
    </div>
  )
}
