interface RiskBadgeProps {
  category?: string
  score?: number
  size?: 'sm' | 'md'
}

export default function RiskBadge({ category, score, size = 'sm' }: RiskBadgeProps) {
  if (!category) return <span className="text-xs text-zinc-600">No data</span>

  const styles: Record<string, string> = {
    low: 'risk-low',
    medium: 'risk-medium',
    high: 'risk-high',
    critical: 'risk-critical',
  }

  const labels: Record<string, string> = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical',
  }

  const pad = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${pad} ${styles[category] ?? ''}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {labels[category] ?? category}
      {score !== undefined && <span className="opacity-70">({Math.round(score)})</span>}
    </span>
  )
}