'use client'

import { PanelLeft, SquarePen } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'
import { useRouter } from 'next/navigation'
import { useChat } from '@/contexts/ChatContext'

export default function SidebarHeader() {
  const { isOpen, toggle } = useSidebar()
  const { setMessages, setActiveConversationId } = useChat()
  const router = useRouter()

  const handleNewChat = () => {
    setMessages([])
    setActiveConversationId(null)
    router.push('/chat')
  }

  return (
    <div className="flex items-center justify-between px-2 py-2 h-14 shrink-0">
      <button
        onClick={toggle}
        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
        title={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <PanelLeft size={20} />
      </button>
      {isOpen && (
        <button
          onClick={handleNewChat}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          title="New chat"
        >
          <SquarePen size={20} />
        </button>
      )}
    </div>
  )
}
