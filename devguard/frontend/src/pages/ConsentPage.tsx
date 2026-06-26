import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, MessageSquare, Mic, Camera, CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import type { Consent } from '../types'

export default function ConsentPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [consent, setConsent] = useState<Consent>({
    chat_analysis: false,
    voice_analysis: false,
    face_analysis: false,
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    api.get('/auth/consent').then(({ data }) => {
      setConsent({
        chat_analysis: data.chat_analysis,
        voice_analysis: data.voice_analysis,
        face_analysis: data.face_analysis,
      })
    }).finally(() => setFetching(false))
  }, [])

  async function handleSave() {
    setLoading(true)
    try {
      await api.put('/auth/consent', consent)
      navigate('/chat')
    } catch {
      navigate('/chat')
    } finally {
      setLoading(false)
    }
  }

  const options = [
    {
      key: 'chat_analysis' as keyof Consent,
      icon: MessageSquare,
      title: 'Chat Analysis',
      description:
        'Allow DevAssist to understand your messages better and improve responses over time. This helps us personalize your experience.',
      color: 'text-brand-400',
      bg: 'bg-brand-400/10',
    },
    {
      key: 'voice_analysis' as keyof Consent,
      icon: Mic,
      title: 'Voice Analysis',
      description:
        'When you use voice input, we may analyse audio quality to improve transcription accuracy and your overall experience.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
    },
    {
      key: 'face_analysis' as keyof Consent,
      icon: Camera,
      title: 'Facial Wellness Check',
      description:
        'Optional periodic snapshots to check if you look tired or stressed, so DevAssist can offer timely wellness tips.',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
  ]

  if (fetching) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">DevGuard</h1>
            <p className="text-xs text-zinc-500">Workplace Wellness</p>
          </div>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-1">
            Welcome, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            DevAssist is your workplace AI companion. To personalise your experience,
            choose which features you'd like to enable. You can change these anytime in settings.
          </p>

          <div className="space-y-3 mb-8">
            {options.map(({ key, icon: Icon, title, description, color, bg }) => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.99 }}
                onClick={() =>
                  setConsent((c) => ({ ...c, [key]: !c[key] }))
                }
                className={`w-full text-left p-4 rounded-xl border transition-all duration-150 ${
                  consent[key]
                    ? 'border-brand-500/60 bg-brand-500/5'
                    : 'border-surface-600 bg-surface-700/40 hover:bg-surface-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-100">{title}</span>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          consent[key]
                            ? 'border-brand-500 bg-brand-500'
                            : 'border-surface-500'
                        }`}
                      >
                        {consent[key] && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Continue to DevAssist
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-zinc-600">
            You can update these preferences anytime. Your conversations are always private.
          </p>
        </div>
      </motion.div>
    </div>
  )
}