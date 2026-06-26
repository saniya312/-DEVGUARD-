import { useState, useRef, useCallback } from 'react'

export type RecorderState = 'idle' | 'recording' | 'uploading' | 'error'

interface UseVoiceRecorderOptions {
  maxSeconds?: number
  onResult: (transcript: string, reply: string, conversationId: number) => void
  onError?: (msg: string) => void
  conversationId: number | null
}

export function useVoiceRecorder({
  maxSeconds = 120,
  onResult,
  onError,
  conversationId,
}: UseVoiceRecorderOptions) {
  const [state, setState] = useState<RecorderState>('idle')
  const [seconds, setSeconds] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setSeconds(0)
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopTimer()
    setState('uploading')
  }, [stopTimer])

  const startRecording = useCallback(async () => {
    setState('idle')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'

      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size === 0) {
          setState('error')
          onError?.('No audio recorded.')
          return
        }

        setState('uploading')
        try {
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')
          if (conversationId) {
            formData.append('conversation_id', String(conversationId))
          }

          // Read token from persisted zustand store
          let accessToken: string | null = null
          try {
            const raw = localStorage.getItem('devguard-auth')
            if (raw) accessToken = JSON.parse(raw)?.state?.token ?? null
          } catch { /* ignore */ }

          const res = await fetch('/voice', {
            method: 'POST',
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            body: formData,
          })

          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body?.detail ?? 'Voice processing failed')
          }

          const data = await res.json()
          setState('idle')
          onResult(data.transcript, data.reply, data.conversation_id)
        } catch (err: any) {
          setState('error')
          onError?.(err.message ?? 'Voice processing failed.')
        }
      }

      recorder.start(250) // collect in 250ms chunks
      mediaRecorderRef.current = recorder
      setState('recording')

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= maxSeconds - 1) {
            stopRecording()
            return 0
          }
          return s + 1
        })
      }, 1000)
    } catch {
      setState('error')
      onError?.('Microphone access denied. Please allow microphone access.')
    }
  }, [conversationId, maxSeconds, onResult, onError, stopRecording])

  const toggle = useCallback(() => {
    if (state === 'recording') {
      stopRecording()
    } else if (state === 'idle' || state === 'error') {
      startRecording()
    }
  }, [state, startRecording, stopRecording])

  return { state, seconds, toggle, stopRecording }
}