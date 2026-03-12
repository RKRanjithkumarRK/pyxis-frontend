'use client'

import { Search, X, Globe, Rss, Bot, FileText, BarChart2, Code2, Wand2, LayoutGrid, Sparkles, Image, Mic, MessageSquare, PenLine, Terminal, Workflow, Package } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

const TOOLS = [
  { href: '/hub',            icon: LayoutGrid,    label: 'Skills Hub',     color: 'text-indigo-400',  badge: '16 Skills' },
  { href: '/chat',           icon: MessageSquare, label: 'AI Chat',        color: 'text-accent',      badge: null },
  { href: '/tools/agents',   icon: Bot,           label: 'AI Agents',      color: 'text-orange-400',  badge: '8 Agents' },
  { href: '/tools/compare',  icon: BarChart2,     label: 'LLM Benchmark',  color: 'text-yellow-400',  badge: '6 Models' },
  { href: '/tools/code',     icon: Code2,         label: 'Code Studio',    color: 'text-green-400',   badge: '7 Modes' },
  { href: '/tools/prompts',  icon: Wand2,         label: 'Prompt Library', color: 'text-violet-400',  badge: '30+' },
  { href: '/tools/rag',      icon: FileText,      label: 'Document Q&A',   color: 'text-emerald-400', badge: null },
  { href: '/tools/write',    icon: PenLine,       label: 'Writing Studio', color: 'text-violet-400',  badge: 'New' },
  { href: '/images',         icon: Image,         label: 'Image Studio',   color: 'text-pink-400',    badge: null },
  { href: '/tools/generate', icon: Sparkles,      label: 'AI Video',       color: 'text-red-400',     badge: null },
  { href: '/tools/search',   icon: Globe,         label: 'Web Search',     color: 'text-blue-400',    badge: null },
  { href: '/tools/news',     icon: Rss,           label: 'AI News',        color: 'text-cyan-400',    badge: null },
  { href: '/voice',          icon: Mic,           label: 'Voice AI',       color: 'text-teal-400',    badge: null },
  { href: '/tools/command-center', icon: Terminal,  label: 'Command Center', color: 'text-sky-400',     badge: 'New' },
  { href: '/tools/workflow', icon: Workflow,      label: 'Workflow Builder',color: 'text-fuchsia-400', badge: 'New' },
  { href: '/tools/marketplace',    icon: Package,   label: 'Marketplace',    color: 'text-emerald-400', badge: '12 Plugins' },
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
          Enterprise AI Tools
        </p>
      </div>

      {TOOLS.map(tool => {
        const Icon   = tool.icon
        const active = pathname === tool.href || (tool.href !== '/chat' && tool.href.length > 1 && pathname.startsWith(tool.href))
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
            <span className="flex-1 text-left">{tool.label}</span>
            {tool.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(16,163,127,0.1)', color: '#10a37f' }}>
                {tool.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
