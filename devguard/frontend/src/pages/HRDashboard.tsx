import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Shield, Users, AlertTriangle, TrendingUp, Bell, LogOut,
  ChevronRight, Loader2, RefreshCw, BarChart2, Mic, Camera,
} from 'lucide-react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import RiskBadge from '../components/shared/RiskBadge'
import SentimentChart from '../components/hr/SentimentChart'
import VoiceMetricsTable from '../components/hr/VoiceMetricsTable'
import FaceEmotionChart from '../components/hr/FaceEmotionChart'
import type {
  DashboardOverview, EmployeeListItem, Alert,
  SentimentTrend, VoiceSummary, FaceSummary,
} from '../types'

type Tab = 'employees' | 'analytics' | 'voice' | 'face' | 'alerts'

export default function HRDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('employees')
  const [trendDays, setTrendDays] = useState(30)

  const { data: overview, isLoading: loadingOverview } = useQuery<DashboardOverview>({
    queryKey: ['hr-overview'],
    queryFn: () => api.get('/hr/dashboard').then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: employees = [], isLoading: loadingEmp, refetch: refetchEmp } =
    useQuery<EmployeeListItem[]>({
      queryKey: ['hr-employees'],
      queryFn: () => api.get('/hr/employees').then((r) => r.data),
    })

  const { data: alerts = [], isLoading: loadingAlerts, refetch: refetchAlerts } =
    useQuery<Alert[]>({
      queryKey: ['hr-alerts'],
      queryFn: () => api.get('/hr/alerts').then((r) => r.data),
    })

  const { data: trends = [] } = useQuery<SentimentTrend[]>({
    queryKey: ['hr-trends', trendDays],
    queryFn: () => api.get(`/hr/analysis/trends?days=${trendDays}`).then((r) => r.data),
    enabled: tab === 'analytics',
  })

  const { data: voiceSummary = [] } = useQuery<VoiceSummary[]>({
    queryKey: ['hr-voice'],
    queryFn: () => api.get('/hr/voice/summary').then((r) => r.data),
    enabled: tab === 'voice',
  })

  const { data: faceSummary = [] } = useQuery<FaceSummary[]>({
    queryKey: ['hr-face'],
    queryFn: () => api.get('/hr/face/summary').then((r) => r.data),
    enabled: tab === 'face',
  })

  const unreadAlerts = alerts.filter((a) => !a.is_read).length

  const statCards = overview
    ? [
        { label: 'Total Employees', value: overview.total_employees, icon: Users, color: 'text-brand-400', bg: 'bg-brand-400/10' },
        { label: 'Active', value: overview.active_employees, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { label: 'High Risk', value: overview.high_risk_count, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
        { label: 'Critical Risk', value: overview.critical_risk_count, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
      ]
    : []

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: 'employees', label: 'Employees', icon: Users },
    { key: 'analytics', label: 'Analytics', icon: BarChart2 },
    { key: 'voice', label: 'Voice', icon: Mic },
    { key: 'face', label: 'Face', icon: Camera },
    { key: 'alerts', label: 'Alerts', icon: Bell, badge: unreadAlerts || undefined },
  ]

  async function markAlertRead(id: number) {
    await api.patch(`/hr/alerts/${id}/read`)
    queryClient.invalidateQueries({ queryKey: ['hr-alerts'] })
  }

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="bg-surface-800 border-b border-surface-700 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100">DevGuard HR</h1>
              <p className="text-[10px] text-zinc-500">Wellness Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 hidden sm:block">{user?.name}</span>
            <button onClick={logout} className="btn-ghost p-2">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Overview stat cards */}
        {loadingOverview ? (
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, color, bg }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-400">{label}</span>
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-zinc-100">{value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Risk progress bars */}
        {overview && (
          <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { label: 'Avg Burnout Risk', value: overview.avg_burnout_risk, color: 'bg-orange-500' },
              { label: 'Avg Retention Risk', value: overview.avg_retention_risk, color: 'bg-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-zinc-400">{label}</span>
                  <span className="text-xs font-medium text-zinc-300">{value.toFixed(1)}</span>
                </div>
                <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full ${color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-surface-700 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === key
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded-full leading-none">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Employees Tab ─────────────────────────────────────── */}
        {tab === 'employees' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-300">
                All Employees ({employees.length})
              </h2>
              <button onClick={() => refetchEmp()} className="btn-ghost p-2">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            {loadingEmp ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">
                No employees registered yet.
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700">
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 hidden md:table-cell">Dept</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Risk</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 hidden lg:table-cell">Retention</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 hidden xl:table-cell">Last Active</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700">
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="hover:bg-surface-700/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/hr/employees/${emp.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-[11px] font-semibold text-brand-400">
                              {emp.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-zinc-100 text-sm">{emp.name}</p>
                              <p className="text-[10px] text-zinc-500">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400 hidden md:table-cell">
                          {emp.department ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge category={emp.risk_category} />
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {emp.retention_risk !== undefined && emp.retention_risk !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-500 rounded-full"
                                  style={{ width: `${emp.retention_risk}%` }}
                                />
                              </div>
                              <span className="text-xs text-zinc-400 tabular-nums">
                                {emp.retention_risk.toFixed(0)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 hidden xl:table-cell">
                          {emp.last_active
                            ? new Date(emp.last_active).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="w-4 h-4 text-zinc-600" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Analytics Tab ─────────────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-300">Sentiment & Wellbeing Trends</h2>
              <div className="flex gap-1">
                {[7, 14, 30, 60].map((d) => (
                  <button
                    key={d}
                    onClick={() => setTrendDays(d)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      trendDays === d
                        ? 'bg-brand-600 text-white'
                        : 'bg-surface-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <SentimentChart data={trends} />
            </div>

            {/* Summary stats from trends */}
            {trends.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: 'Avg Sentiment',
                    value: (trends.reduce((s, t) => s + t.avg_sentiment, 0) / trends.length),
                    fmt: (v: number) => (v >= 0 ? `+${v.toFixed(3)}` : v.toFixed(3)),
                    color: (v: number) => v >= 0 ? 'text-emerald-400' : 'text-red-400',
                  },
                  {
                    label: 'Avg Stress',
                    value: trends.reduce((s, t) => s + t.avg_stress, 0) / trends.length,
                    fmt: (v: number) => v.toFixed(1),
                    color: (v: number) => v > 60 ? 'text-red-400' : v > 40 ? 'text-orange-400' : 'text-emerald-400',
                  },
                  {
                    label: 'Avg Engagement',
                    value: trends.reduce((s, t) => s + t.avg_engagement, 0) / trends.length,
                    fmt: (v: number) => v.toFixed(1),
                    color: (v: number) => v < 40 ? 'text-red-400' : v < 60 ? 'text-yellow-400' : 'text-emerald-400',
                  },
                ].map(({ label, value, fmt, color }) => (
                  <div key={label} className="card p-4 text-center">
                    <p className="text-[10px] text-zinc-500 mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color(value)}`}>{fmt(value)}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">last {trendDays} days</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Voice Tab ─────────────────────────────────────────── */}
        {tab === 'voice' && (
          <div>
            <h2 className="text-sm font-medium text-zinc-300 mb-4">Voice Analytics Summary</h2>
            <div className="card overflow-hidden">
              <VoiceMetricsTable data={voiceSummary} />
            </div>
          </div>
        )}

        {/* ── Face Tab ─────────────────────────────────────────── */}
        {tab === 'face' && (
          <div>
            <h2 className="text-sm font-medium text-zinc-300 mb-4">Emotion Distribution (All Employees)</h2>
            <div className="card p-5">
              <FaceEmotionChart data={faceSummary} />
            </div>
          </div>
        )}

        {/* ── Alerts Tab ───────────────────────────────────────── */}
        {tab === 'alerts' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-300">
                Alerts ({alerts.length})
                {unreadAlerts > 0 && (
                  <span className="ml-2 text-xs text-red-400">{unreadAlerts} unread</span>
                )}
              </h2>
              <button onClick={() => refetchAlerts()} className="btn-ghost p-2">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            {loadingAlerts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">
                No alerts at this time.
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`card p-4 flex items-start gap-3 ${
                      !alert.is_read ? 'border-l-2 border-l-red-500/70' : 'opacity-70'
                    }`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        alert.severity === 'critical'
                          ? 'text-red-400'
                          : alert.severity === 'high'
                          ? 'text-orange-400'
                          : 'text-yellow-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-zinc-200">
                          {alert.employee_name}
                        </span>
                        <RiskBadge category={alert.severity} />
                      </div>
                      <p className="text-xs text-zinc-400">{alert.message}</p>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!alert.is_read && (
                      <button
                        onClick={() => markAlertRead(alert.id)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-200 shrink-0 whitespace-nowrap"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}