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
    <div className={`${isOpen ? 'px-3' : 'px-1'} pb-3 pt-3`}>
      {isOpen ? (
        /* ── Expanded layout ── */
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/hub')}
            className="flex items-center gap-3 rounded-2xl transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            title="Open workspace home"
          >
            <PyxisMark size={36} />
            <div className="min-w-0 text-left">
              <p className="font-display text-lg leading-none text-text-primary">Pyxis One</p>
              <p className="text-[11px] uppercase tracking-[0.25em] text-text-muted">AI operating shell</p>
            </div>
          </button>

          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-surface text-text-secondary transition-colors hover:border-border hover:text-text-primary"
            title="Collapse sidebar"
          >
            <PanelLeft size={18} />
          </button>
        </div>
      ) : (
        /* ── Collapsed layout — centered column ── */
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-surface text-text-secondary transition-colors hover:border-border hover:text-text-primary"
            title="Expand sidebar"
          >
            <PanelLeft size={18} className="rotate-180" />
          </button>
        </div>
      )}

      <div className={isOpen ? 'mt-3' : 'mt-2'}>
        <button
          onClick={handleNewChat}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
            isOpen
              ? 'border-accent bg-accent/10 text-accent shadow-[0_10px_30px_rgba(91,140,255,0.25)]'
              : 'border-transparent bg-accent text-white'
          }`}
          title="Start a new chat"
        >
          <SquarePen size={18} />
          {isOpen && <span>New chat</span>}
        </button>
      </div>
    </div>
  )
}
