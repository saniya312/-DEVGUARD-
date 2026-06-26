import { Mic, TrendingUp, TrendingDown } from 'lucide-react'
import type { VoiceSummary } from '../../types'

interface VoiceMetricsTableProps {
  data: VoiceSummary[]
}

function Metric({ value, suffix = '' }: { value?: number | null; suffix?: string }) {
  if (value === undefined || value === null) return <span className="text-zinc-600">—</span>
  return (
    <span className="text-zinc-200 font-medium tabular-nums">
      {value.toFixed(1)}{suffix}
    </span>
  )
}

function StressIndicator({ score }: { score?: number | null }) {
  if (score === undefined || score === null) return <span className="text-zinc-600">—</span>
  const color =
    score > 70
      ? 'text-red-400 bg-red-400/10'
      : score > 50
      ? 'text-orange-400 bg-orange-400/10'
      : 'text-emerald-400 bg-emerald-400/10'
  const Icon = score > 50 ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {score.toFixed(1)}
    </span>
  )
}

export default function VoiceMetricsTable({ data }: VoiceMetricsTableProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center py-10 text-zinc-600 text-sm">
        <div className="text-center">
          <Mic className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No voice recordings yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-700">
            <th className="text-left px-3 py-2.5 text-xs font-medium text-zinc-400">Employee</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-zinc-400">Recordings</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-zinc-400 hidden md:table-cell">Avg Pitch</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-zinc-400 hidden md:table-cell">Avg Tempo</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-zinc-400 hidden lg:table-cell">Confidence</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-zinc-400">Stress Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-700/60">
          {data.map((row) => (
            <tr key={row.employee_id} className="hover:bg-surface-700/30 transition-colors">
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-600/20 flex items-center justify-center text-[10px] font-medium text-brand-400">
                    {row.employee_name[0].toUpperCase()}
                  </div>
                  <span className="text-zinc-200 text-xs">{row.employee_name}</span>
                </div>
              </td>
              <td className="px-3 py-3 text-right text-xs text-zinc-400">{row.recording_count}</td>
              <td className="px-3 py-3 text-right hidden md:table-cell">
                <Metric value={row.avg_pitch} suffix=" Hz" />
              </td>
              <td className="px-3 py-3 text-right hidden md:table-cell">
                <Metric value={row.avg_tempo} suffix=" bpm" />
              </td>
              <td className="px-3 py-3 text-right hidden lg:table-cell">
                <Metric value={row.avg_confidence} suffix="%" />
              </td>
              <td className="px-3 py-3 text-right">
                <StressIndicator score={row.avg_stress} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}