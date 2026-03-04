'use client'

import { Search, Image, X } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NavLinks() {
  const { searchQuery, setSearchQuery } = useSidebar()
  const [showSearch, setShowSearch] = useState(false)
  const router = useRouter()

  return (
    <div className="px-2 py-1 space-y-0.5">
      {showSearch ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-hover">
          <Search size={15} className="text-text-tertiary shrink-0" />
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <button
            onClick={() => { setShowSearch(false); setSearchQuery('') }}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          <Search size={16} />
          <span>Search chats</span>
        </button>
      )}

      <button
        onClick={() => router.push('/images')}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
      >
        <Image size={16} />
        <span>Image generation</span>
      </button>
    </div>
  )
}
