import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Camera } from 'lucide-react'
import type { FaceSummary } from '../../types'

interface FaceEmotionChartProps {
  data: FaceSummary[]
}

const EMOTION_COLORS: Record<string, string> = {
  happy: '#34d399',
  neutral: '#818cf8',
  sad: '#60a5fa',
  angry: '#f87171',
  surprise: '#fbbf24',
  fear: '#a78bfa',
  disgust: '#f97316',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-zinc-100 capitalize mb-0.5">{d.emotion}</p>
      <p className="text-zinc-400">{d.count} sessions · {d.percentage.toFixed(1)}%</p>
    </div>
  )
}

export default function FaceEmotionChart({ data }: FaceEmotionChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center py-10 text-zinc-600 text-sm">
        <div className="text-center">
          <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No face analysis data yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="emotion"
            tick={{ fill: '#71717a', fontSize: 10 }}
            axisLine={{ stroke: '#3f3f46' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#71717a', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.emotion}
                fill={EMOTION_COLORS[entry.emotion] ?? '#818cf8'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend chips */}
      <div className="flex flex-wrap gap-2">
        {data.map((entry) => (
          <div key={entry.emotion} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: EMOTION_COLORS[entry.emotion] ?? '#818cf8' }}
            />
            <span className="text-zinc-400 capitalize">{entry.emotion}</span>
            <span className="text-zinc-600">{entry.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}