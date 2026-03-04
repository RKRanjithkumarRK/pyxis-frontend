'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Message } from '@/types'
import { defaultModel } from '@/lib/models'

interface ChatContextType {
  messages: Message[]
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void
  model: string
  setModel: (m: string) => void
  isStreaming: boolean
  setIsStreaming: (s: boolean) => void
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [model, setModel] = useState(defaultModel)
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  return (
    <ChatContext.Provider value={{
      messages, setMessages,
      model, setModel,
      isStreaming, setIsStreaming,
      activeConversationId, setActiveConversationId,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
