'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Conversation, Project } from '@/types'

interface SidebarContextType {
  isOpen: boolean
  toggle: () => void
  setOpen: (open: boolean) => void
  conversations: Conversation[]
  setConversations: (convs: Conversation[]) => void
  projects: Project[]
  setProjects: (projects: Project[]) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)
const SIDEBAR_STATE_KEY = 'pyxis-sidebar-open'

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Default open for SSR; after mount we favor an always-visible desktop shell and a hidden mobile drawer.
  const [isOpen, setIsOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const width = window.innerWidth
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY)

    if (width >= 1280) {
      setIsOpen(true)
      return
    }

    if (width < 768) {
      setIsOpen(false)
      return
    }

    if (saved === 'true' || saved === 'false') {
      setIsOpen(saved === 'true')
      return
    }

    setIsOpen(width >= 1024)
  }, [])

  useEffect(() => {
    const syncForViewport = () => {
      if (window.innerWidth < 768) {
        setIsOpen(false)
        return
      }

      if (window.innerWidth >= 1280) {
        setIsOpen(true)
      }
    }

    window.addEventListener('resize', syncForViewport)
    return () => window.removeEventListener('resize', syncForViewport)
  }, [])

  const persistOpen = (open: boolean) => {
    setIsOpen(open)
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_STATE_KEY, String(open))
    }
  }

  const toggle = () => persistOpen(!isOpen)
  const setOpen = (open: boolean) => persistOpen(open)

  return (
    <SidebarContext.Provider value={{
      isOpen, toggle, setOpen,
      conversations, setConversations,
      projects, setProjects,
      searchQuery, setSearchQuery,
      settingsOpen, setSettingsOpen,
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
