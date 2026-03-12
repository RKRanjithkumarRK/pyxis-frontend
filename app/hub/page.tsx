'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Zap, TrendingUp, Shield, Globe, ArrowRight, Star,
  Clock, Flame, Sparkles, ChevronRight, X,
} from 'lucide-react'

/* ─────────────────────────── data ─────────────────────────── */
interface Skill {
  num:         number
  title:       string
  desc:        string
  longDesc:    string
  icon:        string
  href:        string
  gradient:    string   // Tailwind gradient classes
  accentRgb:   string   // e.g. "139,92,246"
  category:    string
  badge?:      'NEW' | 'PRO' | 'FREE' | string
  featured?:   boolean
}

const SKILLS: Skill[] = [
  {
    num: 1, title: 'Prompt Engineering',
    desc: 'Write & refine power prompts for any AI model — live preview, A/B testing, token analysis.',
    longDesc: 'Turn vague ideas into precision prompts. Test variations, measure quality, and build a personal prompt library.',
    icon: '✍️', href: '/chat',
    gradient: 'from-violet-500 to-purple-600', accentRgb: '139,92,246',
    category: 'Core', badge: 'FREE', featured: true,
  },
  {
    num: 2, title: 'AI Workflow Builder',
    desc: 'Chain AI tasks into automated multi-step pipelines — research → write → review in one flow.',
    longDesc: 'Define step-by-step AI workflows. Each step feeds into the next. Build once, run forever.',
    icon: '⚙️', href: '/tools/agents',
    gradient: 'from-orange-500 to-amber-500', accentRgb: '249,115,22',
    category: 'Automation', badge: 'NEW',
  },
  {
    num: 3, title: 'Specialized AI Agents',
    desc: '8 expert agents: Research, Code, Writing, Data Analysis, SEO, Legal, Marketing & Business.',
    longDesc: 'Each agent has deep domain expertise and a specialized system prompt. Switch agents mid-conversation.',
    icon: '🤖', href: '/tools/agents',
    gradient: 'from-blue-500 to-cyan-500', accentRgb: '59,130,246',
    category: 'Agents', featured: true,
  },
  {
    num: 4, title: 'Document Intelligence',
    desc: 'Upload PDFs, contracts, reports — ask questions, get instant answers with source citations.',
    longDesc: 'TF-IDF powered RAG. Upload any document, ask anything, get answers with exact source passages.',
    icon: '📄', href: '/tools/rag',
    gradient: 'from-emerald-500 to-green-500', accentRgb: '16,185,129',
    category: 'Analysis', badge: 'PRO',
  },
  {
    num: 5, title: 'Image Generation',
    desc: 'Create stunning images from text — DALL-E 3, Stable Diffusion, & Pollinations — free tier included.',
    longDesc: 'Multi-provider image generation with style presets, aspect ratio control, and one-click download.',
    icon: '🎨', href: '/images',
    gradient: 'from-pink-500 to-rose-500', accentRgb: '236,72,153',
    category: 'Creative', badge: 'FREE', featured: true,
  },
  {
    num: 6, title: 'Prompt Library',
    desc: '50+ enterprise-grade prompts across marketing, legal, tech, operations, and product.',
    longDesc: 'Curated collection of battle-tested prompts. One-click copy, customize, and deploy instantly.',
    icon: '🎛️', href: '/tools/prompts',
    gradient: 'from-indigo-500 to-blue-500', accentRgb: '99,102,241',
    category: 'Library',
  },
  {
    num: 7, title: 'Voice AI Assistant',
    desc: 'Talk to AI hands-free — speech recognition + AI response + text-to-speech synthesis.',
    longDesc: 'Full voice interface with real-time transcription, AI processing, and spoken responses.',
    icon: '🎙️', href: '/voice',
    gradient: 'from-teal-500 to-cyan-500', accentRgb: '20,184,166',
    category: 'Voice',
  },
  {
    num: 8, title: 'Model Benchmarking',
    desc: 'Run any prompt across 6+ AI models simultaneously — compare speed, quality & accuracy.',
    longDesc: 'Side-by-side model comparison with latency tracking, quality scoring, and response analysis.',
    icon: '⚡', href: '/tools/compare',
    gradient: 'from-yellow-500 to-orange-500', accentRgb: '234,179,8',
    category: 'Research',
  },
  {
    num: 9, title: 'AI Video Generation',
    desc: 'Generate AI videos from text prompts — powered by Replicate with async job queue.',
    longDesc: 'Submit a text prompt, get back a video clip. Async generation with real-time polling. Also includes Audio TTS.',
    icon: '🎬', href: '/tools/generate',
    gradient: 'from-red-500 to-pink-500', accentRgb: '239,68,68',
    category: 'Creative', badge: 'NEW',
  },
  {
    num: 10, title: 'Code Intelligence',
    desc: 'Generate, debug, explain & execute code — with syntax highlighting, run button & file export.',
    longDesc: 'Full code IDE experience. Write code, run it in-browser (JS) or via Judge0, download the file.',
    icon: '💻', href: '/tools/code',
    gradient: 'from-slate-500 to-gray-600', accentRgb: '100,116,139',
    category: 'Development',
  },
  {
    num: 11, title: 'LLM Management',
    desc: 'Compare Gemini, Llama, Mistral & more side-by-side with latency and quality metrics.',
    longDesc: 'Real-time model evaluation. Benchmark any prompt across providers and see exactly which model wins.',
    icon: '📊', href: '/tools/compare',
    gradient: 'from-purple-500 to-violet-600', accentRgb: '168,85,247',
    category: 'Research',
  },
  {
    num: 12, title: 'AI Intelligence Feed',
    desc: 'Live AI news from TechCrunch, MIT, Verge, VentureBeat — curated & summarizable.',
    longDesc: 'Aggregated AI news feed. Filter by source, bookmark articles, and ask AI to generate a smart digest.',
    icon: '📰', href: '/tools/news',
    gradient: 'from-cyan-500 to-blue-500', accentRgb: '6,182,212',
    category: 'Research',
  },
  {
    num: 13, title: 'AI Writing Studio',
    desc: '10 AI writing commands — write, improve, summarize, expand, fix grammar, change tone & more.',
    longDesc: 'Full document editor with AI slash commands. Select text or write from scratch. Auto-save, markdown preview, export as MD or TXT.',
    icon: '✒️', href: '/tools/write',
    gradient: 'from-violet-500 to-purple-600', accentRgb: '139,92,246',
    category: 'Creative', badge: 'NEW',
  },
  {
    num: 14, title: 'AI Command Center',
    desc: 'Live model metrics, agent deployment, system health dashboard & real-time event feed.',
    longDesc: 'Monitor all AI models and active agents in real time. Deploy new agents, track requests, latency, and errors.',
    icon: '🛰️', href: '/tools/command-center',
    gradient: 'from-sky-500 to-blue-600', accentRgb: '14,165,233',
    category: 'Automation', badge: 'NEW',
  },
  {
    num: 15, title: 'Visual Workflow Builder',
    desc: 'Drag-and-drop AI pipeline editor — build multi-step automations with pre-built templates.',
    longDesc: 'Create AI workflows visually. Connect Trigger → AI → Logic → Action nodes. Load enterprise templates.',
    icon: '🔀', href: '/tools/workflow',
    gradient: 'from-violet-500 to-fuchsia-600', accentRgb: '167,139,250',
    category: 'Automation', badge: 'NEW',
  },
  {
    num: 16, title: 'Plugin Marketplace',
    desc: 'Install AI plugins — GPT-4 Router, Claude Connector, Slack, Notion, Analytics Pro & more.',
    longDesc: 'Extend Pyxis with one-click plugins. Browse 12+ integrations across AI Models, Security, Data, Analytics, and Automation.',
    icon: '🧩', href: '/tools/marketplace',
    gradient: 'from-emerald-500 to-teal-600', accentRgb: '16,185,129',
    category: 'Core',
  },
]

const CATEGORIES = ['All', 'Core', 'Agents', 'Automation', 'Creative', 'Analysis', 'Development', 'Research', 'Voice', 'Library']

const STATS = [
  { label: '16 AI Tools',        icon: '🛠️',  color: '#6366f1' },
  { label: 'Powered by Gemini',  icon: '✨',  color: '#10a37f' },
  { label: 'Always Free',        icon: '🎁',  color: '#f59e0b' },
  { label: '5 AI Providers',     icon: '🌐',  color: '#06b6d4' },
]

const RECENTLY_USED_KEY = 'pyxis_hub_recently_used'

/* ─── badge colour helper ─────────────────────────────────────── */
function BadgeChip({ badge }: { badge: string }) {
  const map: Record<string, string> = {
    NEW:  'bg-violet-500/15 text-violet-400 border-violet-500/25',
    PRO:  'bg-amber-500/15  text-amber-400  border-amber-500/25',
    FREE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  }
  const cls = map[badge] ?? 'bg-white/10 text-white/60 border-white/15'
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${cls}`}>
      {badge}
    </span>
  )
}

/* ─── single skill card ───────────────────────────────────────── */
function SkillCard({
  skill, hovered, onHover, onLeave, onClick,
}: {
  skill: Skill
  hovered: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="group relative text-left rounded-2xl border bg-surface overflow-hidden cursor-pointer"
      style={{
        borderColor: hovered ? `rgba(${skill.accentRgb},0.5)` : 'var(--border)',
        transform:   hovered ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
        boxShadow:   hovered ? `0 12px 40px rgba(${skill.accentRgb},0.18)` : '0 1px 3px rgba(0,0,0,0.1)',
        transition:  'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Faint gradient overlay on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
        style={{ background: `radial-gradient(ellipse at top left, rgba(${skill.accentRgb},0.06) 0%, transparent 65%)` }}
      />

      <div className="relative p-5">
        {/* Top row: icon + badges */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${skill.gradient} flex items-center justify-center text-2xl shadow-lg`}>
            {skill.icon}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] font-mono text-text-tertiary">#{String(skill.num).padStart(2,'0')}</span>
            {skill.badge && <BadgeChip badge={skill.badge} />}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-text-primary mb-1.5 leading-snug">{skill.title}</h3>

        {/* Description — swap on hover */}
        <p className="text-[12px] text-text-tertiary leading-relaxed mb-5 min-h-[3.6rem]">
          {hovered ? skill.longDesc : skill.desc}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] px-2 py-0.5 rounded-lg border"
            style={{
              background:   `rgba(${skill.accentRgb},0.08)`,
              borderColor:  `rgba(${skill.accentRgb},0.2)`,
              color:        `rgba(${skill.accentRgb},1)`,
            }}
          >
            {skill.category}
          </span>
          <span
            className="flex items-center gap-1 text-xs font-medium transition-colors duration-150"
            style={{ color: hovered ? `rgb(${skill.accentRgb})` : 'var(--text-tertiary)' }}
          >
            Open
            <ArrowRight
              size={12}
              style={{
                transform:  hovered ? 'translateX(4px)' : 'translateX(0)',
                transition: 'transform 0.2s',
              }}
            />
          </span>
        </div>
      </div>
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
export default function HubPage() {
  const router = useRouter()
  const [query,          setQuery]          = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [hovered,        setHovered]        = useState<number | null>(null)
  const [recentlyUsed,   setRecentlyUsed]   = useState<Skill[]>([])

  /* Load recently used from localStorage */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_USED_KEY)
      if (raw) {
        const nums: number[] = JSON.parse(raw)
        const tools = nums
          .map(n => SKILLS.find(s => s.num === n))
          .filter((s): s is Skill => !!s)
          .slice(0, 3)
        setRecentlyUsed(tools)
      }
    } catch {}
  }, [])

  const trackAndNavigate = useCallback((skill: Skill) => {
    try {
      const raw = localStorage.getItem(RECENTLY_USED_KEY)
      const nums: number[] = raw ? JSON.parse(raw) : []
      const updated = [skill.num, ...nums.filter(n => n !== skill.num)].slice(0, 6)
      localStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(updated))
    } catch {}
    router.push(skill.href)
  }, [router])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return SKILLS.filter(s => {
      const matchesQuery = !q ||
        s.title.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      const matchesCat = activeCategory === 'All' || s.category === activeCategory
      return matchesQuery && matchesCat
    })
  }, [query, activeCategory])

  const featured    = useMemo(() => SKILLS.filter(s => s.featured), [])
  const showFeatured = !query && activeCategory === 'All'

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-bg">

      {/* ══ HERO ══ */}
      <div
        className="relative border-b border-border px-6 pt-12 pb-10 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, rgba(99,102,241,0.07) 0%, rgba(16,163,127,0.05) 50%, transparent 100%)' }}
      >
        {/* Background glow orbs */}
        <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full opacity-[0.04] blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute top-8 right-1/4 w-48 h-48 rounded-full opacity-[0.04] blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #10a37f, transparent)' }} />

        <div className="max-w-5xl mx-auto">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">All Systems Operational</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-text-primary leading-tight mb-3">
            AI Skills{' '}
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              Command Center
            </span>
          </h1>
          <p className="text-base text-text-secondary max-w-lg leading-relaxed mb-8">
            16 enterprise-grade AI capabilities in one platform. Build, analyze, create, and ship — all for free.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-3">
            {STATS.map(stat => (
              <div
                key={stat.label}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium text-text-secondary"
              >
                <span>{stat.icon}</span>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ══ SEARCH ══ */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tools, categories, capabilities…"
            className="w-full bg-surface border border-border rounded-2xl pl-10 pr-10 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-surface-hover text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* ══ CATEGORY PILLS ══ */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="text-xs font-semibold px-4 py-1.5 rounded-full border transition-all duration-200"
              style={{
                background:   activeCategory === cat ? 'rgba(99,102,241,1)'  : 'var(--surface)',
                borderColor:  activeCategory === cat ? 'rgba(99,102,241,1)'  : 'var(--border)',
                color:        activeCategory === cat ? '#fff'                 : 'var(--text-secondary)',
                transform:    activeCategory === cat ? 'scale(1.04)'         : 'scale(1)',
                boxShadow:    activeCategory === cat ? '0 0 16px rgba(99,102,241,0.3)' : 'none',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ══ RECENTLY USED ══ */}
        {recentlyUsed.length > 0 && showFeatured && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-text-tertiary" />
              <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Recently Used</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recentlyUsed.map(skill => (
                <button
                  key={skill.num}
                  onClick={() => trackAndNavigate(skill)}
                  className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:border-accent/40 hover:bg-surface-hover transition-all text-left"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${skill.gradient} flex items-center justify-center text-base`}>
                    {skill.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary whitespace-nowrap">{skill.title}</p>
                    <p className="text-[10px] text-text-tertiary">{skill.category}</p>
                  </div>
                  <ChevronRight size={14} className="text-text-tertiary ml-1" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ══ FEATURED ══ */}
        {showFeatured && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame size={14} className="text-amber-400" />
              <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Featured Tools</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {featured.map(skill => (
                <button
                  key={skill.num}
                  onClick={() => trackAndNavigate(skill)}
                  onMouseEnter={() => setHovered(skill.num)}
                  onMouseLeave={() => setHovered(null)}
                  className="relative text-left rounded-2xl overflow-hidden border border-border"
                  style={{
                    background:  `linear-gradient(135deg, rgba(${skill.accentRgb},0.12) 0%, var(--surface) 60%)`,
                    borderColor: hovered === skill.num ? `rgba(${skill.accentRgb},0.55)` : 'var(--border)',
                    transform:   hovered === skill.num ? 'translateY(-3px)' : 'translateY(0)',
                    boxShadow:   hovered === skill.num ? `0 10px 32px rgba(${skill.accentRgb},0.2)` : 'none',
                    transition:  'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${skill.gradient} flex items-center justify-center text-xl shadow-md`}>
                        {skill.icon}
                      </div>
                      <Sparkles size={14} className="text-amber-400 opacity-60" />
                    </div>
                    <p className="text-sm font-bold text-text-primary mb-1">{skill.title}</p>
                    <p className="text-[11px] text-text-tertiary leading-relaxed">{skill.desc}</p>
                    <div className="flex items-center gap-1 mt-3 text-xs font-medium"
                      style={{ color: `rgb(${skill.accentRgb})` }}>
                      Open tool <ArrowRight size={11} className="ml-0.5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ══ ALL TOOLS GRID ══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-text-tertiary" />
              <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                {query || activeCategory !== 'All' ? 'Matching Tools' : 'All Tools'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-tertiary">
                {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
              </span>
              {(query || activeCategory !== 'All') && (
                <button
                  onClick={() => { setQuery(''); setActiveCategory('All') }}
                  className="text-xs text-accent hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div className="text-4xl">🔍</div>
              <p className="text-text-secondary text-sm font-medium">No tools match your search.</p>
              <button
                onClick={() => { setQuery(''); setActiveCategory('All') }}
                className="text-accent text-sm hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filtered.map(skill => (
                <SkillCard
                  key={skill.num}
                  skill={skill}
                  hovered={hovered === skill.num}
                  onHover={() => setHovered(skill.num)}
                  onLeave={() => setHovered(null)}
                  onClick={() => trackAndNavigate(skill)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ══ FOOTER CTA ══ */}
      <div
        className="border-t border-border py-12 px-6 text-center"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(99,102,241,0.04))' }}
      >
        <div className="max-w-lg mx-auto">
          <TrendingUp size={24} className="text-accent mx-auto mb-3" />
          <h3 className="text-lg font-bold text-text-primary mb-2">All capabilities. Zero cost.</h3>
          <p className="text-sm text-text-secondary mb-5">
            Powered by Google Gemini · Meta Llama 3.3 · Mistral · fal.ai · Replicate · OpenRouter
          </p>
          <button
            onClick={() => router.push('/chat')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles size={15} />
            Start chatting with AI
          </button>
        </div>
      </div>
    </div>
  )
}
