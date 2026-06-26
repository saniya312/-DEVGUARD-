import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Plus, Shield, LogOut, X, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/client'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import type { Conversation } from '../../types'

interface SidebarProps {
  open: boolean
  onClose: () => void
  onNewChat: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Sidebar({ open, onClose, onNewChat }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const { activeConversationId, setActiveConversation, setMessages } = useChatStore()

  const { data: conversations = [], refetch } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations').then((r) => r.data),
    refetchInterval: 15000,
  })

  useChatStore.subscribe(() => refetch())

  async function loadConversation(id: number) {
    setActiveConversation(id)
    const { data } = await api.get(`/conversations/${id}`)
    setMessages(data.messages)
    onClose()
  }

  return (
    <>
      {/* Backdrop — mobile only */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : '-100%' }}
        transition={{ type: 'tween', duration: 0.22 }}
        className="fixed left-0 top-0 h-full w-72 bg-surface-800 border-r border-surface-700 z-30 flex flex-col lg:relative lg:translate-x-0 lg:z-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-surface-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-zinc-100 text-sm">DevAssist</span>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New chat button */}
        <div className="px-3 pt-3">
          <button
            onClick={() => { onNewChat(); onClose() }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-surface-600 hover:bg-surface-700 text-zinc-300 hover:text-zinc-100 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New conversation
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {conversations.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No conversations yet</p>
            </div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${
                activeConversationId === conv.id
                  ? 'bg-brand-600/20 text-zinc-100'
                  : 'hover:bg-surface-700 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {conv.title || 'New conversation'}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5 opacity-40" />
                    <span className="text-[10px] text-zinc-600">
                      {timeAgo(conv.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer — user info + logout */}
        <div className="px-3 py-3 border-t border-surface-700">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-400 text-xs font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-surface-600 text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  )
}