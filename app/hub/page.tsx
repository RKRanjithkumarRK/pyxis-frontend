'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Zap, TrendingUp, Shield, Globe, ArrowRight, Star } from 'lucide-react'

const SKILLS = [
  {
    num: 1,
    title: 'Prompt Engineering',
    desc: 'Write & refine power prompts for any AI model — with live preview, A/B testing, and token analysis',
    longDesc: 'Turn vague ideas into precision prompts. Test variations, measure quality, and build a personal prompt library.',
    icon: '✍️',
    href: '/chat',
    color: 'from-violet-500 to-purple-600',
    borderColor: 'rgba(139,92,246,0.35)',
    category: 'Core',
    tag: 'Most Used',
  },
  {
    num: 2,
    title: 'AI Workflow Builder',
    desc: 'Chain AI tasks into automated multi-step pipelines — research → write → review in one flow',
    longDesc: 'Define step-by-step AI workflows. Each step feeds into the next. Build once, run forever.',
    icon: '⚙️',
    href: '/tools/agents',
    color: 'from-orange-500 to-amber-500',
    borderColor: 'rgba(249,115,22,0.35)',
    category: 'Automation',
    tag: 'Popular',
  },
  {
    num: 3,
    title: 'Specialized AI Agents',
    desc: '8 expert agents: Research, Code, Writing, Data Analysis, SEO, Legal, Marketing & Business',
    longDesc: 'Each agent has deep domain expertise and a specialized system prompt. Switch agents mid-conversation.',
    icon: '🤖',
    href: '/tools/agents',
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'rgba(59,130,246,0.35)',
    category: 'Agents',
    tag: 'Powerful',
  },
  {
    num: 4,
    title: 'Document Intelligence',
    desc: 'Upload PDFs, contracts, reports — ask questions, get instant answers with source citations',
    longDesc: 'TF-IDF powered RAG. Upload any document, ask anything, get answers with exact source passages.',
    icon: '📄',
    href: '/tools/rag',
    color: 'from-emerald-500 to-green-500',
    borderColor: 'rgba(16,185,129,0.35)',
    category: 'Analysis',
    tag: 'Enterprise',
  },
  {
    num: 5,
    title: 'Image Generation',
    desc: 'Create stunning images from text — DALL-E 3, Stable Diffusion, & Pollinations — free tier included',
    longDesc: 'Multi-provider image generation with style presets, aspect ratio control, and one-click download.',
    icon: '🎨',
    href: '/images',
    color: 'from-pink-500 to-rose-500',
    borderColor: 'rgba(236,72,153,0.35)',
    category: 'Creative',
    tag: 'Free',
  },
  {
    num: 6,
    title: 'Prompt Library',
    desc: '50+ enterprise-grade prompts across marketing, legal, tech, operations, and product',
    longDesc: 'Curated collection of battle-tested prompts. One-click copy, customize, and deploy instantly.',
    icon: '🎛️',
    href: '/tools/prompts',
    color: 'from-indigo-500 to-blue-500',
    borderColor: 'rgba(99,102,241,0.35)',
    category: 'Library',
    tag: '50+ Prompts',
  },
  {
    num: 7,
    title: 'Voice AI Assistant',
    desc: 'Talk to AI hands-free — speech recognition + AI response + text-to-speech synthesis',
    longDesc: 'Full voice interface with real-time transcription, AI processing, and spoken responses.',
    icon: '🎙️',
    href: '/voice',
    color: 'from-teal-500 to-cyan-500',
    borderColor: 'rgba(20,184,166,0.35)',
    category: 'Voice',
    tag: 'Hands-Free',
  },
  {
    num: 8,
    title: 'Model Benchmarking',
    desc: 'Run any prompt across 6+ AI models simultaneously — compare speed, quality & accuracy',
    longDesc: 'Side-by-side model comparison with latency tracking, quality scoring, and response analysis.',
    icon: '⚡',
    href: '/tools/compare',
    color: 'from-yellow-500 to-orange-500',
    borderColor: 'rgba(234,179,8,0.35)',
    category: 'Research',
    tag: '6 Models',
  },
  {
    num: 9,
    title: 'AI Video Generation',
    desc: 'Generate AI videos from text prompts — powered by fal.ai with async job queue',
    longDesc: 'Submit a text prompt, get back a video clip. Async generation with real-time polling.',
    icon: '🎬',
    href: '/tools/generate',
    color: 'from-red-500 to-pink-500',
    borderColor: 'rgba(239,68,68,0.35)',
    category: 'Creative',
    tag: 'AI Video',
  },
  {
    num: 10,
    title: 'Code Intelligence',
    desc: 'Generate, debug, explain & execute code — with syntax highlighting, run button & file export',
    longDesc: 'Full code IDE experience. Write code, run it in-browser (JS) or via Judge0, download the file.',
    icon: '💻',
    href: '/tools/code',
    color: 'from-slate-500 to-gray-600',
    borderColor: 'rgba(100,116,139,0.35)',
    category: 'Development',
    tag: '50+ Languages',
  },
  {
    num: 11,
    title: 'LLM Management',
    desc: 'Compare Gemini, Llama, Mistral & more side-by-side with latency and quality metrics',
    longDesc: 'Real-time model evaluation. Benchmark any prompt across providers and see exactly which model wins.',
    icon: '📊',
    href: '/tools/compare',
    color: 'from-purple-500 to-violet-600',
    borderColor: 'rgba(168,85,247,0.35)',
    category: 'Research',
    tag: 'Analytics',
  },
  {
    num: 12,
    title: 'AI Intelligence Feed',
    desc: 'Live AI news from TechCrunch, MIT, Verge, VentureBeat — curated & summarizable',
    longDesc: 'Aggregated AI news feed. Filter by source, bookmark articles, and ask AI to generate a smart digest.',
    icon: '📰',
    href: '/tools/news',
    color: 'from-cyan-500 to-blue-500',
    borderColor: 'rgba(6,182,212,0.35)',
    category: 'Research',
    tag: 'Live News',
  },
  {
    num: 13,
    title: 'AI Writing Studio',
    desc: '10 AI writing commands — write, improve, summarize, expand, fix grammar, change tone & more',
    longDesc: 'Full document editor with AI slash commands. Select text or write from scratch. Auto-save, markdown preview, export as MD or TXT.',
    icon: '✒️',
    href: '/tools/write',
    color: 'from-violet-500 to-purple-600',
    borderColor: 'rgba(139,92,246,0.35)',
    category: 'Creative',
    tag: 'New',
  },
  {
    num: 14,
    title: 'AI Command Center',
    desc: 'Live model metrics, agent deployment, system health dashboard & real-time event feed',
    longDesc: 'Monitor all AI models and active agents in real time. Deploy new agents, track requests, latency, and errors with a live activity log.',
    icon: '🛰️',
    href: '/tools/command-center',
    color: 'from-sky-500 to-blue-600',
    borderColor: 'rgba(14,165,233,0.35)',
    category: 'Automation',
    tag: 'New',
  },
  {
    num: 15,
    title: 'Visual Workflow Builder',
    desc: 'Drag-and-drop AI pipeline editor — build multi-step automations with pre-built templates',
    longDesc: 'Create AI workflows visually. Connect Trigger → AI → Logic → Action nodes. Load enterprise templates for Lead Enrichment, Content Pipeline, and Research.',
    icon: '🔀',
    href: '/tools/workflow',
    color: 'from-violet-500 to-fuchsia-600',
    borderColor: 'rgba(167,139,250,0.35)',
    category: 'Automation',
    tag: 'New',
  },
  {
    num: 16,
    title: 'Plugin Marketplace',
    desc: 'Install AI plugins — GPT-4 Router, Claude Connector, Slack, Notion, Analytics Pro & more',
    longDesc: 'Extend Pyxis with one-click plugins. Browse 12+ integrations across AI Models, Security, Data, Analytics, and Automation categories.',
    icon: '🧩',
    href: '/tools/marketplace',
    color: 'from-emerald-500 to-teal-600',
    borderColor: 'rgba(16,185,129,0.35)',
    category: 'Core',
    tag: '12 Plugins',
  },
]

const CATEGORIES = ['All', 'Core', 'Agents', 'Automation', 'Creative', 'Analysis', 'Development', 'Research', 'Voice', 'Library']

const QUICK_STATS = [
  { icon: Zap, label: 'AI Models', value: '6+', color: '#10a37f' },
  { icon: Star, label: 'Skills Available', value: '16', color: '#6366f1' },
  { icon: Globe, label: 'Providers', value: '5', color: '#f59e0b' },
  { icon: Shield, label: 'Free Forever', value: '100%', color: '#10b981' },
]

export default function HubPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [hoveredSkill, setHoveredSkill] = useState<number | null>(null)

  const filtered = useMemo(() => {
    return SKILLS.filter(s => {
      const matchesQuery = !query || s.title.toLowerCase().includes(query.toLowerCase()) || s.desc.toLowerCase().includes(query.toLowerCase()) || s.category.toLowerCase().includes(query.toLowerCase())
      const matchesCat = activeCategory === 'All' || s.category === activeCategory
      return matchesQuery && matchesCat
    })
  }, [query, activeCategory])

  return (
    <div className="min-h-[100dvh] overflow-y-auto" style={{ background: 'var(--bg)' }}>
      {/* ── Hero Header ── */}
      <div style={{ background: 'linear-gradient(180deg, rgba(16,163,127,0.06) 0%, transparent 100%)', borderBottom: '1px solid var(--border)', padding: '40px 24px 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(16,163,127,0.1)', border: '1px solid rgba(16,163,127,0.2)', marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10a37f', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: '#10a37f' }}>Enterprise AI Platform · All Systems Operational</span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.15 }}>
            AI Skills Command Center
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 560, lineHeight: 1.6, marginBottom: 32 }}>
            16 enterprise-grade AI capabilities in one platform. Build, analyze, create, and ship — all for free.
          </p>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, maxWidth: 640 }}>
            {QUICK_STATS.map(stat => {
              const Icon = stat.icon
              return (
                <div key={stat.label} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={18} color={stat.color} />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{stat.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div style={{ padding: '24px 24px 0', maxWidth: 960, margin: '0 auto' }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search capabilities..."
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '10px 14px 10px 38px',
              fontSize: 14,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '5px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: activeCategory === cat ? '#10a37f' : 'var(--surface)',
                borderColor: activeCategory === cat ? '#10a37f' : 'var(--border)',
                color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Result count */}
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 20 }}>
          {filtered.length} {filtered.length === 1 ? 'capability' : 'capabilities'} {query || activeCategory !== 'All' ? 'matching your filter' : 'available'}
          {(query || activeCategory !== 'All') && (
            <button onClick={() => { setQuery(''); setActiveCategory('All') }} style={{ marginLeft: 12, color: '#10a37f', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Skills Grid ── */}
      <div style={{ padding: '0 24px 48px', maxWidth: 960, margin: '0 auto' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 15 }}>No capabilities match your search.</p>
            <button onClick={() => { setQuery(''); setActiveCategory('All') }} style={{ marginTop: 12, color: '#10a37f', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}>
              Clear search
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(skill => (
              <button
                key={skill.num}
                onClick={() => router.push(skill.href)}
                onMouseEnter={() => setHoveredSkill(skill.num)}
                onMouseLeave={() => setHoveredSkill(null)}
                style={{
                  textAlign: 'left',
                  padding: '20px',
                  borderRadius: 16,
                  background: 'var(--surface)',
                  border: `1px solid ${hoveredSkill === skill.num ? skill.borderColor : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  transform: hoveredSkill === skill.num ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: hoveredSkill === skill.num ? `0 8px 30px ${skill.borderColor.replace('0.35', '0.15')}` : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div className={`bg-gradient-to-br ${skill.color}`} style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {skill.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>#{skill.num.toString().padStart(2,'0')}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(16,163,127,0.1)', color: '#10a37f', fontWeight: 600 }}>
                      {skill.tag}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{skill.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 14 }}>
                  {hoveredSkill === skill.num ? skill.longDesc : skill.desc}
                </p>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, background: 'var(--surface-hover)', color: 'var(--text-tertiary)' }}>
                    {skill.category}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: hoveredSkill === skill.num ? '#10a37f' : 'var(--text-tertiary)', transition: 'color 0.15s', fontWeight: hoveredSkill === skill.num ? 600 : 400 }}>
                    Open
                    <ArrowRight size={12} style={{ transform: hoveredSkill === skill.num ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 0.15s' }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom CTA ── */}
      <div style={{ background: 'linear-gradient(180deg, transparent, rgba(16,163,127,0.04))', borderTop: '1px solid var(--border)', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <TrendingUp size={24} style={{ color: '#10a37f', marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            All capabilities. Zero cost.
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Powered by Google Gemini AI · Meta Llama 3.3 · Mistral · fal.ai · Replicate · OpenRouter
          </p>
          <button
            onClick={() => router.push('/chat')}
            style={{ padding: '10px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #10a37f, #0d8c6d)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 24px rgba(16,163,127,0.25)' }}
          >
            Start chatting with AI →
          </button>
        </div>
      </div>
    </div>
  )
}
