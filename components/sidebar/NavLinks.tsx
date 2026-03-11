'use client'

import { Search, X, Globe, Rss, Bot, FileText, BarChart2, Code2, Wand2, LayoutGrid, Sparkles } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

const TOOLS = [
  { href: '/hub',            icon: LayoutGrid, label: 'AI Skills Hub',   color: 'text-indigo-400' },
  { href: '/tools/generate', icon: Sparkles,   label: 'AI Studio',       color: 'text-pink-400'   },
  { href: '/tools/search',   icon: Globe,      label: 'AI Web Search',   color: 'text-blue-400'   },
  { href: '/tools/news',     icon: Rss,        label: 'AI News Feed',    color: 'text-cyan-400'   },
  { href: '/tools/agents',   icon: Bot,        label: 'Multi-Agent',     color: 'text-orange-400' },
  { href: '/tools/rag',      icon: FileText,   label: 'Document Q&A',   color: 'text-emerald-400'},
  { href: '/tools/compare',  icon: BarChart2,  label: 'Model Compare',   color: 'text-yellow-400' },
  { href: '/tools/code',     icon: Code2,      label: 'Code Generator',  color: 'text-green-400'  },
  { href: '/tools/prompts',  icon: Wand2,      label: 'Prompt Library',  color: 'text-violet-400' },
]

export default function NavLinks() {
  const { searchQuery, setSearchQuery } = useSidebar()
  const [showSearch, setShowSearch] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()

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

      <div className="pt-2 pb-1">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary opacity-60">
          Free AI Tools
        </p>
      </div>

      {TOOLS.map(tool => {
        const Icon   = tool.icon
        const active = pathname === tool.href
        return (
          <button
            key={tool.href}
            onClick={() => router.push(tool.href)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-surface-hover text-text-primary'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            <Icon size={16} className={active ? tool.color : undefined} />
            <span>{tool.label}</span>
            {tool.href === '/hub' && (
              <span className="ml-auto text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full font-medium">NEW</span>
            )}
            {tool.href === '/tools/generate' && (
              <span className="ml-auto text-[10px] bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded-full font-medium">AI</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
