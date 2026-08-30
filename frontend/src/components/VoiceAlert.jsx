import { useEffect, useRef, useState } from 'react'

export default function VoiceAlert({ sites, analysis }) {
  const [spoken, setSpoken] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [lastAlert, setLastAlert] = useState('')

  useEffect(() => {
    if (!sites?.length || !enabled || spoken) return

    const failSites = sites.filter(s =>
      s.verdicts?.some(v => v.verdict === 'FAIL')
    )
    const cautionSites = sites.filter(s =>
      s.verdicts?.some(v => v.verdict === 'CAUTION')
    )
    const bestSite = sites.reduce((best, s) =>
      (s.composite_score || 0) > (best.composite_score || 0) ? s : best, sites[0])

    if (failSites.length === 0 && cautionSites.length === 0) return

    const speak = (text) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utter = new SpeechSynthesisUtterance(text)
        utter.rate = 0.95
        utter.pitch = 1.0
        utter.volume = 0.9
        window.speechSynthesis.speak(utter)
        setLastAlert(text)
        setSpoken(true)
      }
    }

    const timer = setTimeout(() => {
      if (failSites.length > 0) {
        const names = failSites.map(s => s.name).join(' and ')
        speak(
          `Alert. ${names} ${failSites.length > 1 ? 'have' : 'has'} critical heat risk. ` +
          `Peak temperature exceeds 32 degrees Celsius. ` +
          `I recommend choosing ${bestSite.name} as the safest option.`
        )
      } else if (cautionSites.length > 0) {
        const names = cautionSites.map(s => s.name).join(' and ')
        speak(
          `Warning. ${names} ${cautionSites.length > 1 ? 'have' : 'has'} moderate heat exposure. ` +
          `Consider mitigation measures before proceeding.`
        )
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [sites, analysis, enabled, spoken])

  const replay = () => {
    setSpoken(false)
  }

  if (!sites?.length) return null

  const failCount = sites.filter(s => s.verdicts?.some(v => v.verdict === 'FAIL')).length
  const cautionCount = sites.filter(s => s.verdicts?.some(v => v.verdict === 'CAUTION')).length
  const passCount = sites.filter(s => s.verdicts?.every(v => v.verdict === 'PASS' || v.verdict === 'N/A')).length

  if (failCount === 0 && cautionCount === 0) return null

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${
      failCount > 0
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
            failCount > 0 ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            {failCount > 0 ? '🚨' : '⚠️'}
          </div>
          <div>
            <h3 className={`font-semibold ${failCount > 0 ? 'text-red-800' : 'text-amber-800'}`}>
              {failCount > 0 ? 'Critical Heat Risk Detected' : 'Moderate Heat Warning'}
            </h3>
            <p className={`text-xs ${failCount > 0 ? 'text-red-600' : 'text-amber-600'}`}>
              {failCount > 0 && `${failCount} site${failCount > 1 ? 's' : ''} FAILED threshold`}
              {failCount > 0 && cautionCount > 0 && ' · '}
              {cautionCount > 0 && `${cautionCount} site${cautionCount > 1 ? 's' : ''} CAUTION`}
              {failCount === 0 && cautionCount > 0 && `${cautionCount} site${cautionCount > 1 ? 's' : ''} above safe limits`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={replay}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            🔊 Replay
          </button>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              enabled
                ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                : 'bg-slate-100 border-slate-300 text-slate-400'
            }`}
          >
            {enabled ? 'Voice On' : 'Voice Off'}
          </button>
        </div>
      </div>
      {lastAlert && (
        <div className={`px-5 py-2 border-t text-xs ${
          failCount > 0 ? 'bg-red-100/50 border-red-200 text-red-700' : 'bg-amber-100/50 border-amber-200 text-amber-700'
        }`}>
          "{lastAlert}"
        </div>
      )}
    </div>
  )
}
