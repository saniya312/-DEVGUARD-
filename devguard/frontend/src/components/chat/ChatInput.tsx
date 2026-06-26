import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../../api/client'
import { useChatStore } from '../../store/chatStore'
import VoiceButton from '../voice/VoiceButton'
import type { Message } from '../../types'

interface ChatInputProps {
  onMessageSent: (conversationId: number) => void
}

export default function ChatInput({ onMessageSent }: ChatInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const {
    isLoading,
    setLoading,
    activeConversationId,
    setActiveConversation,
    addMessage,
    appendOptimistic,
    messages,
  } = useChatStore()

  // Sync textarea height
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [text])

  // When appendOptimistic fires (suggestion chip click), submit immediately
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last?.role === 'user' && last.content && !isLoading && text === '') {
      // Only if it came from suggestion (id is Date.now() — large number not from DB)
      if (last.id > 1_000_000_000_000) {
        sendMessage(last.content)
      }
    }
  }, [messages])

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading) return
    setText('')
    setLoading(true)

    try {
      const { data } = await api.post('/chat', {
        message: content,
        conversation_id: activeConversationId,
      })

      setActiveConversation(data.conversation_id)

      addMessage({
        id: data.message_id,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      })
      addMessage({
        id: data.message_id + 1,
        role: 'assistant',
        content: data.reply,
        created_at: new Date().toISOString(),
      })

      onMessageSent(data.conversation_id)
    } catch {
      addMessage({
        id: Date.now(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        created_at: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(text)
    }
  }

  function handleVoiceTranscript(
    transcript: string,
    reply: string,
    conversationId: number,
  ) {
    setActiveConversation(conversationId)
    addMessage({
      id: Date.now(),
      role: 'user',
      content: transcript,
      created_at: new Date().toISOString(),
    })
    addMessage({
      id: Date.now() + 1,
      role: 'assistant',
      content: reply,
      created_at: new Date().toISOString(),
    })
    onMessageSent(conversationId)
  }

  return (
    <div className="px-4 pb-5 pt-3 border-t border-surface-700 bg-surface-900">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-surface-700 border border-surface-600 rounded-2xl px-4 py-3 focus-within:border-brand-500/60 transition-colors">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Message DevAssist…"
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none min-h-[24px] max-h-40 leading-relaxed"
          />

          <div className="flex items-center gap-2 shrink-0 pb-0.5">
            <VoiceButton
              onTranscript={handleVoiceTranscript}
              conversationId={activeConversationId}
              disabled={isLoading}
            />

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => sendMessage(text)}
              disabled={!text.trim() || isLoading}
              className="w-9 h-9 rounded-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </motion.button>
          </div>
        </div>
        <p className="text-center text-[10px] text-zinc-600 mt-2">
          DevAssist can make mistakes. For urgent HR matters, contact your HR team directly.
        </p>
      </div>
    </div>
  )
}