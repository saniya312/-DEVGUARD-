import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square } from 'lucide-react'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { formatTimer, isMediaRecorderSupported } from '../../utils/audio'
import { useState } from 'react'

interface VoiceButtonProps {
  onTranscript: (transcript: string, reply: string, conversationId: number) => void
  conversationId: number | null
  disabled?: boolean
}

export default function VoiceButton({ onTranscript, conversationId, disabled }: VoiceButtonProps) {
  const [errorMsg, setErrorMsg] = useState('')

  const { state, seconds, toggle } = useVoiceRecorder({
    conversationId,
    onResult: (transcript, reply, convId) => {
      setErrorMsg('')
      onTranscript(transcript, reply, convId)
    },
    onError: (msg) => setErrorMsg(msg),
  })

  const isRecording = state === 'recording'
  const isUploading = state === 'uploading'
  const isBusy = isRecording || isUploading

  if (!isMediaRecorderSupported()) {
    return null
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <AnimatePresence mode="wait">
        {isRecording ? (
          <motion.div
            key="recording"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            {/* Animated wave bars */}
            <div className="flex items-end gap-0.5" style={{ height: '20px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="voice-bar w-1 bg-red-400 rounded-full"
                  style={{ height: '100%' }}
                />
              ))}
            </div>

            <span className="text-xs text-red-400 font-mono w-10 text-center">
              {formatTimer(seconds)}
            </span>

            <button
              onClick={toggle}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
              title="Stop recording"
            >
              <Square className="w-3.5 h-3.5 text-white fill-white" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="idle"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={toggle}
            disabled={disabled || isUploading}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isUploading
                ? 'bg-surface-600 cursor-wait'
                : 'bg-surface-600 hover:bg-surface-500'
            }`}
            title={isUploading ? 'Processing…' : 'Start voice input'}
          >
            {isUploading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full"
              />
            ) : (
              <Mic className="w-4 h-4 text-zinc-300" />
            )}
          </motion.button>
        )}
      </AnimatePresence>
      {errorMsg && (
        <p className="text-[10px] text-red-400 max-w-[120px] text-center">{errorMsg}</p>
      )}
    </div>
  )
}