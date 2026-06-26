import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { SentimentTrend } from '../../types'

interface SentimentChartProps {
  data: SentimentTrend[]
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-300 capitalize">{p.name}:</span>
          <span className="font-medium text-zinc-100">
            {p.dataKey === 'avg_sentiment'
              ? p.value.toFixed(3)
              : p.value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function SentimentChart({ data }: SentimentChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
        No trend data yet. Data appears after employees start chatting.
      </div>
    )
  }

  const formatted = data.map((d) => ({
    ...d,
    date: shortDate(d.date),
    // Normalise sentiment from -1..1 to 0..100 for display
    sentiment_pct: ((d.avg_sentiment + 1) / 2) * 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#71717a', fontSize: 10 }}
          axisLine={{ stroke: '#3f3f46' }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#71717a', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#a1a1aa', paddingTop: 8 }}
        />
        <Line
          type="monotone"
          dataKey="sentiment_pct"
          name="Sentiment %"
          stroke="#818cf8"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="avg_stress"
          name="Stress"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="avg_engagement"
          name="Engagement"
          stroke="#34d399"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}