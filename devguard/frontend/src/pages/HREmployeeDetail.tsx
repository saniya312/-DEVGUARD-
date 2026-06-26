import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, User, MessageSquare, Mic, Camera,
  AlertTriangle, CheckCircle, XCircle, Loader2,
} from 'lucide-react'
import api from '../api/client'
import RiskBadge from '../components/shared/RiskBadge'
import type { EmployeeDetail } from '../types'

function ScoreBar({ label, value, color }: { label: string; value?: number; color: string }) {
  if (value === undefined || value === null) return null
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs font-medium text-zinc-300">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

export default function HREmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: emp, isLoading } = useQuery<EmployeeDetail>({
    queryKey: ['hr-employee', id],
    queryFn: () => api.get(`/hr/employees/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (!emp) return null

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="bg-surface-800 border-b border-surface-700 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/hr')} className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-semibold">
              {emp.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100">{emp.name}</h1>
              <p className="text-[10px] text-zinc-500">{emp.email}</p>
            </div>
          </div>
          {emp.risk_category && (
            <div className="ml-auto">
              <RiskBadge category={emp.risk_category} size="md" />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Info row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Department', value: emp.department ?? '—' },
            { label: 'Position', value: emp.position ?? '—' },
            { label: 'Messages', value: String(emp.message_count) },
            { label: 'Voice recordings', value: String(emp.voice_count) },
          ].map(({ label, value }) => (
            <div key={label} className="card p-4">
              <p className="text-[10px] text-zinc-500 mb-1">{label}</p>
              <p className="text-sm font-medium text-zinc-100">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Risk scores */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Risk Scores
            </h2>
            <ScoreBar label="Burnout Risk" value={emp.burnout_risk} color="bg-orange-500" />
            <ScoreBar label="Quit Risk" value={emp.quit_risk} color="bg-red-500" />
            <ScoreBar label="Retention Risk" value={emp.retention_risk} color="bg-purple-500" />
          </div>

          {/* Wellbeing indicators */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200">Wellbeing Indicators</h2>
            {emp.avg_sentiment !== undefined && emp.avg_sentiment !== null && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-zinc-400">Avg Sentiment</span>
                  <span className={`text-xs font-medium ${
                    emp.avg_sentiment >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {emp.avg_sentiment >= 0 ? 'Positive' : 'Negative'} ({emp.avg_sentiment.toFixed(2)})
                  </span>
                </div>
                <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${emp.avg_sentiment >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.abs(emp.avg_sentiment) * 100}%`, marginLeft: emp.avg_sentiment < 0 ? `${(1 + emp.avg_sentiment) * 100}%` : '50%' }}
                  />
                </div>
              </div>
            )}
            <ScoreBar label="Avg Stress Level" value={emp.avg_stress} color="bg-yellow-500" />
            <ScoreBar label="Avg Engagement" value={emp.avg_engagement} color="bg-brand-500" />
          </div>
        </div>

        {/* Consent status */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">Analysis Consent</h2>
          <div className="flex gap-6">
            {[
              { label: 'Chat Analysis', key: 'chat_analysis', icon: MessageSquare },
              { label: 'Voice Analysis', key: 'voice_analysis', icon: Mic },
              { label: 'Face Analysis', key: 'face_analysis', icon: Camera },
            ].map(({ label, key, icon: Icon }) => {
              const granted = emp.consent?.[key as keyof typeof emp.consent]
              return (
                <div key={key} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-400">{label}</span>
                  {granted ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Risk reasons */}
        {emp.risk_reasons && emp.risk_reasons.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-3">Risk Indicators</h2>
            <ul className="space-y-2">
              {emp.risk_reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {emp.recommendations && Object.keys(emp.recommendations).length > 0 && (
          <div className="grid md:grid-cols-3 gap-4">
            {emp.recommendations.hr_actions && emp.recommendations.hr_actions.length > 0 && (
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-brand-400 mb-3 uppercase tracking-wide">
                  HR Actions
                </h3>
                <ul className="space-y-2">
                  {emp.recommendations.hr_actions.map((a, i) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                      <span className="text-brand-400 mt-0.5">→</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {emp.recommendations.wellness_recommendations && emp.recommendations.wellness_recommendations.length > 0 && (
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wide">
                  Wellness Tips
                </h3>
                <ul className="space-y-2">
                  {emp.recommendations.wellness_recommendations.map((r, i) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                      <span className="text-emerald-400 mt-0.5">→</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {emp.recommendations.follow_up_suggestions && emp.recommendations.follow_up_suggestions.length > 0 && (
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-purple-400 mb-3 uppercase tracking-wide">
                  Follow-up
                </h3>
                <ul className="space-y-2">
                  {emp.recommendations.follow_up_suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                      <span className="text-purple-400 mt-0.5">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}