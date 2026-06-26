import { useEffect, useRef } from 'react'
import { Shield } from 'lucide-react'
import MessageBubble, { TypingIndicator } from './MessageBubble'
import { useChatStore } from '../../store/chatStore'

export default function ChatWindow() {
  const { messages, isLoading, activeConversationId } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !activeConversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-brand-400" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Hi, I'm DevAssist</h2>
        <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
          Your workplace AI companion. Ask me about leave policies, HR FAQs, productivity tips,
          or just chat about how your day is going.
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
          {[
            'How do I apply for leave?',
            'What are our WFH policies?',
            'Help me manage my workload',
            'I feel stressed today',
          ].map((prompt) => (
            <SuggestionChip key={prompt} text={prompt} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isLast={i === messages.length - 1}
        />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}

function SuggestionChip({ text }: { text: string }) {
  const { appendOptimistic } = useChatStore()

  return (
    <button
      onClick={() => appendOptimistic(text)}
      className="text-left px-3 py-2.5 rounded-xl border border-surface-600 hover:border-brand-500/50 hover:bg-brand-500/5 text-xs text-zinc-400 hover:text-zinc-100 transition-all"
    >
      {text}
    </button>
  )
}