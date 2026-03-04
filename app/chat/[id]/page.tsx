'use client'

import { useParams } from 'next/navigation'
import ChatView from '@/components/chat/ChatView'
import SettingsModal from '@/components/settings/SettingsModal'
import { useSidebar } from '@/contexts/SidebarContext'

export default function ConversationPage() {
  const params = useParams()
  const id = params.id as string
  const { settingsOpen, setSettingsOpen } = useSidebar()

  return (
    <>
      <ChatView conversationId={id} />
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
