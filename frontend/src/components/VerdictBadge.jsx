const VERDICT_STYLES = {
  PASS: 'bg-green-100 text-green-700 border-green-200',
  CAUTION: 'bg-amber-100 text-amber-700 border-amber-200',
  FAIL: 'bg-red-100 text-red-700 border-red-200',
  'N/A': 'bg-slate-100 text-slate-400 border-slate-200',
}

export default function VerdictBadge({ verdict }) {
  const style = VERDICT_STYLES[verdict.verdict] || VERDICT_STYLES['N/A']

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${style}`}
      title={`${verdict.metric}: ${verdict.value} ${verdict.unit} — ${verdict.authority}`}
    >
      <span className="font-bold">{verdict.verdict}</span>
      <span className="opacity-70">{verdict.metric.split(' ')[0]}</span>
    </span>
  )
}
