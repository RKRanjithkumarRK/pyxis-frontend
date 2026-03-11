'use client'

import { useParams } from 'next/navigation'
import ChatView from '@/components/chat/ChatView'

export default function ConversationPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <>
      <ChatView conversationId={id} />
    </>
  )
}
