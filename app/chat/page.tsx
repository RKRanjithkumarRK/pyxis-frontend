'use client'

import ChatView from '@/components/chat/ChatView'
import SettingsModal from '@/components/settings/SettingsModal'
import { useSidebar } from '@/contexts/SidebarContext'

export default function NewChatPage() {
  const { settingsOpen, setSettingsOpen } = useSidebar()

  return (
    <>
      <ChatView />
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
