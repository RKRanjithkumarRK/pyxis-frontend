'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, ChevronUp } from 'lucide-react'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const { setSettingsOpen } = useSidebar()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (!user) return null

  const initial = (user.displayName || user.email || '?')[0].toUpperCase()

  return (
    <div ref={ref} className="relative p-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium text-accent shrink-0">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm text-text-primary truncate">{user.displayName || 'User'}</div>
        </div>
        <ChevronUp size={16} className={`text-text-tertiary transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 bg-sidebar border border-border rounded-xl shadow-2xl py-1 z-50">
          <button
            onClick={() => { setSettingsOpen(true); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <Settings size={16} />
            Settings
          </button>
          <div className="h-px bg-border mx-2 my-1" />
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
