import { create } from 'zustand'
import type { Conversation, Message } from '../types'

interface ChatStore {
  conversations: Conversation[]
  activeConversationId: number | null
  messages: Message[]
  isLoading: boolean
  setConversations: (conversations: Conversation[]) => void
  setActiveConversation: (id: number | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  setLoading: (loading: boolean) => void
  appendOptimistic: (content: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (isLoading) => set({ isLoading }),
  appendOptimistic: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: Date.now(),
          role: 'user' as const,
          content,
          created_at: new Date().toISOString(),
        },
      ],
    })),
}))