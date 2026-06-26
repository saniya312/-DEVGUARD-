import { useState, useCallback, useEffect } from 'react'
import { Menu, Settings, Camera } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import Sidebar from '../components/chat/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'
import ChatInput from '../components/chat/ChatInput'
import FaceCapture from '../components/face/FaceCapture'
import { useChatStore } from '../store/chatStore'
import api from '../api/client'

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showFace, setShowFace] = useState(false)
  const [faceEnabled, setFaceEnabled] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setActiveConversation, setMessages } = useChatStore()

  // Check if face analysis consent is given
  useEffect(() => {
    api.get('/auth/consent').then(({ data }) => {
      setFaceEnabled(data.face_analysis === true)
    }).catch(() => {})
  }, [])

  const handleNewChat = useCallback(() => {
    setActiveConversation(null)
    setMessages([])
  }, [setActiveConversation, setMessages])

  const handleMessageSent = useCallback(
    (_conversationId: number) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    [queryClient],
  )

  return (
    <div className="h-screen bg-surface-900 flex overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-surface-700 bg-surface-900 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="btn-ghost p-2"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-zinc-300">DevAssist</span>
          </div>

          <div className="flex items-center gap-1">
            {faceEnabled && (
              <button
                onClick={() => setShowFace(true)}
                className="btn-ghost p-2"
                title="Wellness check-in"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => navigate('/consent')}
              className="btn-ghost p-2"
              title="Privacy settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden flex flex-col max-w-3xl w-full mx-auto">
          <ChatWindow />
          <ChatInput onMessageSent={handleMessageSent} />
        </div>
      </div>

      {/* Face capture modal */}
      <AnimatePresence>
        {showFace && (
          <FaceCapture onClose={() => setShowFace(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}