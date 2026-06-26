import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, CheckCircle, Loader2 } from 'lucide-react'
import api from '../../api/client'

interface FaceCaptureProps {
  onClose: () => void
}

type Status = 'idle' | 'camera' | 'capturing' | 'uploading' | 'done' | 'error'

export default function FaceCapture({ onClose }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [emotion, setEmotion] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  async function startCamera() {
    setStatus('camera')
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setStatus('error')
      setErrorMsg('Camera access denied.')
    }
  }

  async function captureAndSend() {
    if (!videoRef.current || !canvasRef.current) return
    setStatus('capturing')

    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth || 320
    canvas.height = video.videoHeight || 240
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    stopCamera()
    setStatus('uploading')

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setStatus('error')
          setErrorMsg('Failed to capture image.')
          return
        }
        try {
          const formData = new FormData()
          formData.append('image', blob, 'snapshot.jpg')
          const { data } = await api.post('/face', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          setEmotion(data.dominant_emotion)
          setStatus('done')
        } catch (err: any) {
          const msg = err.response?.data?.detail ?? 'Face analysis failed.'
          setStatus('error')
          setErrorMsg(msg)
        }
      },
      'image/jpeg',
      0.85,
    )
  }

  const emotionEmoji: Record<string, string> = {
    happy: '😊',
    sad: '😔',
    neutral: '😐',
    angry: '😠',
    surprise: '😲',
    fear: '😨',
    disgust: '🤢',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card p-6 w-full max-w-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Wellness Check-in</h3>
          </div>
          <button
            onClick={() => { stopCamera(); onClose() }}
            className="btn-ghost p-1.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* States */}
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-400/10 flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-sm text-zinc-300 mb-1">Quick wellness snapshot</p>
              <p className="text-xs text-zinc-500 mb-5">
                This takes a single photo to check how you're feeling. It's anonymous and optional.
              </p>
              <button onClick={startCamera} className="btn-primary w-full">
                Open Camera
              </button>
            </motion.div>
          )}

          {status === 'camera' && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-surface-700 aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  muted
                  playsInline
                />
              </div>
              <p className="text-xs text-zinc-500 text-center">
                Position your face in the frame, then tap capture.
              </p>
              <button onClick={captureAndSend} className="btn-primary w-full flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" />
                Capture
              </button>
            </motion.div>
          )}

          {(status === 'capturing' || status === 'uploading') && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-zinc-400">
                {status === 'capturing' ? 'Capturing…' : 'Analysing…'}
              </p>
            </motion.div>
          )}

          {status === 'done' && emotion && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-4xl mb-2">{emotionEmoji[emotion] ?? '😐'}</p>
              <p className="text-sm font-medium text-zinc-100 capitalize mb-1">{emotion}</p>
              <p className="text-xs text-zinc-500 mb-5">Check-in recorded. Thanks!</p>
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
              <p className="text-sm text-red-400 mb-4">{errorMsg}</p>
              <div className="flex gap-2">
                <button onClick={() => setStatus('idle')} className="btn-primary flex-1">
                  Try Again
                </button>
                <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </motion.div>
  )
}