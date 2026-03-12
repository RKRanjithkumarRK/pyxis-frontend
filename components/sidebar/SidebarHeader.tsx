'use client'

import { PanelLeft, SquarePen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import PyxisMark from '@/components/brand/PyxisMark'
import { useChat } from '@/contexts/ChatContext'
import { useSidebar } from '@/contexts/SidebarContext'

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
    <div className="flex items-center justify-between px-4 pb-4 pt-4">
      <button
        onClick={() => router.push('/hub')}
        className="flex items-center gap-3 rounded-2xl transition-opacity hover:opacity-100"
        title="Go to hub"
      >
        <PyxisMark size={42} />
        {isOpen && (
          <div className="min-w-0 text-left">
            <p className="font-display text-lg leading-none text-text-primary">Pyxis One</p>
            <p className="mt-1 text-xs text-text-tertiary">AI operating system</p>
          </div>
        )}
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={handleNewChat}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/80 bg-white/5 text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
          title="New chat"
        >
          <SquarePen size={18} />
        </button>
        <button
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/80 bg-white/5 text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
          title={isOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <PanelLeft size={18} />
        </button>
      </div>
    </div>
  )
}
