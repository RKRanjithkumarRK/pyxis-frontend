'use client'

import { useRouter, useParams } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'
import { useChat } from '@/contexts/ChatContext'
import { MessageSquare, Trash2, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Conversation } from '@/types'

function groupByDate(convs: Conversation[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const monthAgo = new Date(today.getTime() - 30 * 86400000)

  const groups: { label: string; items: Conversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 Days', items: [] },
    { label: 'Previous 30 Days', items: [] },
    { label: 'Older', items: [] },
  ]

  for (const c of convs) {
    const d = new Date(c.updatedAt || c.createdAt)
    if (d >= today) groups[0].items.push(c)
    else if (d >= yesterday) groups[1].items.push(c)
    else if (d >= weekAgo) groups[2].items.push(c)
    else if (d >= monthAgo) groups[3].items.push(c)
    else groups[4].items.push(c)
  }

  return groups.filter(g => g.items.length > 0)
}

export default function ChatList() {
  const { conversations, searchQuery } = useSidebar()
  const { activeConversationId } = useChat()
  const router = useRouter()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  const filtered = searchQuery
    ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations

  const groups = groupByDate(filtered)

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuId(null)
    try {
      const { auth } = await import('@/lib/firebase-client')
      const token = await auth.currentUser?.getIdToken()
      if (!token) return
      await fetch(`/api/conversations?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const { useSidebar } = await import('@/contexts/SidebarContext')
      window.location.reload()
    } catch {}
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-1">
      {groups.map(group => (
        <div key={group.label} className="mb-3">
          <div className="px-3 py-1.5 text-xs font-medium text-text-tertiary">{group.label}</div>
          {group.items.map(conv => (
            <div
              key={conv.id}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => { setHoveredId(null); setMenuId(null) }}
              onClick={() => router.push(`/chat/${conv.id}`)}
              className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                activeConversationId === conv.id
                  ? 'bg-surface-hover text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <span className="truncate flex-1">{conv.title}</span>
              {(hoveredId === conv.id || menuId === conv.id) && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuId(menuId === conv.id ? null : conv.id) }}
                    className="p-1 rounded hover:bg-surface-active text-text-tertiary hover:text-text-primary"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              )}
              {menuId === conv.id && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[140px]">
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-surface-hover"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="px-3 py-8 text-center text-sm text-text-tertiary">
          {searchQuery ? 'No matching chats' : 'No conversations yet'}
        </div>
      )}
    </div>
  )
}
