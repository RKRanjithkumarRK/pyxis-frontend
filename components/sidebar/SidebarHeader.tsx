'use client'

import { PanelLeftClose, PanelLeft, SquarePen } from 'lucide-react'
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
    <div className="flex items-center justify-between p-2">
      <button
        onClick={toggle}
        className="p-2 rounded-lg btn-ghost text-text-secondary hover:text-text-primary"
        title={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
      </button>
      {isOpen && (
        <button
          onClick={handleNewChat}
          className="p-2 rounded-lg btn-ghost text-text-secondary hover:text-text-primary"
          title="New chat"
        >
          <SquarePen size={20} />
        </button>
      )}
    </div>
  )
}
