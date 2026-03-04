'use client'

import { useState, useCallback, useEffect } from 'react'
import { useChat } from '@/contexts/ChatContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import ModelSelector from './ModelSelector'
import WelcomeScreen from './WelcomeScreen'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import VoiceMode from '@/components/voice/VoiceMode'
import { Message } from '@/types'

interface Props {
  conversationId?: string
}

export default function ChatView({ conversationId }: Props) {
  const { messages, setMessages, model, isStreaming, setIsStreaming, activeConversationId, setActiveConversationId } = useChat()
  const { conversations, setConversations } = useSidebar()
  const { getToken } = useAuth()
  const [voiceMode, setVoiceMode] = useState(false)

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      setActiveConversationId(conversationId)
      loadMessages(conversationId)
    } else {
      setActiveConversationId(null)
      setMessages([])
    }
  }, [conversationId])

  const loadMessages = async (convId: string) => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/messages?conversationId=${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch {}
  }

  const loadConversations = async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch {}
  }

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  const handleSend = useCallback(async (content: string) => {
    const token = await getToken()
    if (!token) return

    // Add user message
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)

    let currentConvId = activeConversationId

    try {
      // Create conversation if new
      if (!currentConvId) {
        const convRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: content.slice(0, 50), model }),
        })
        if (convRes.ok) {
          const data = await convRes.json()
          currentConvId = data.id
          setActiveConversationId(currentConvId)
          window.history.replaceState(null, '', `/chat/${currentConvId}`)
          loadConversations()
        }
      }

      // Save user message
      if (currentConvId) {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: currentConvId, role: 'user', content }),
        })
      }

      // Build messages for API
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      // Stream response
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let buffer = ''

      const assistantMsg: Message = {
        id: `temp-${Date.now()}-assistant`,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      }

      setMessages(prev => [...prev, assistantMsg])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              assistantContent += parsed.content
              setMessages(prev => {
                const updated = [...prev]
                const lastIdx = updated.length - 1
                if (updated[lastIdx]?.role === 'assistant') {
                  updated[lastIdx] = { ...updated[lastIdx], content: assistantContent }
                }
                return updated
              })
            }
          } catch {}
        }
      }

      // Save assistant message
      if (currentConvId && assistantContent) {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: currentConvId, role: 'assistant', content: assistantContent }),
        })
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Sorry, something went wrong: ${err.message}`,
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setIsStreaming(false)
    }
  }, [messages, model, activeConversationId, getToken])

  if (voiceMode) {
    return <VoiceMode onClose={() => setVoiceMode(false)} onSend={handleSend} />
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header with model selector */}
      <div className="flex items-center px-4 py-2">
        <ModelSelector />
      </div>

      {/* Messages or welcome */}
      {messages.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <MessageList />
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} onVoiceMode={() => setVoiceMode(true)} />
    </div>
  )
}
