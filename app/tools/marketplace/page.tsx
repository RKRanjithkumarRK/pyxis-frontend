'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Star, Download, Package, Zap, Brain, Globe, Database, Code2, BarChart2, Shield, Workflow, Bot, Sparkles, CheckCircle2, X, ArrowUpRight, TrendingUp, Clock, Filter, Grid3X3, List } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = 'All' | 'AI Models' | 'Integrations' | 'Analytics' | 'Security' | 'Data' | 'Automation' | 'Developer'
type SortBy   = 'popular' | 'rating' | 'newest' | 'name'

interface Plugin {
  id: string
  name: string
  author: string
  description: string
  longDesc: string
  category: Exclude<Category, 'All'>
  icon: React.ElementType
  iconColor: string
  iconBg: string
  rating: number
  reviews: number
  installs: number
  version: string
  size: string
  tags: string[]
  featured?: boolean
  new?: boolean
  verified: boolean
  price: 'Free' | 'Pro'
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const PLUGINS: Plugin[] = [
  {
    id: 'gpt4-router',       name: 'GPT-4 Router',           author: 'Pyxis Labs',
    description: 'Intelligent routing to GPT-4o with automatic fallback and cost optimization.',
    longDesc: 'Automatically routes prompts to the best available GPT-4 variant. Includes latency monitoring, cost tracking, and seamless fallback to GPT-3.5 when quota is hit.',
    category: 'AI Models', icon: Brain,    iconColor: 'text-purple-400', iconBg: 'bg-purple-400/10',
    rating: 4.9, reviews: 1247, installs: 38400, version: '2.4.1', size: '1.2 MB',
    tags: ['gpt-4', 'openai', 'routing'], featured: true, verified: true, price: 'Free',
  },
  {
    id: 'claude-connector',  name: 'Claude Connector',       author: 'Anthropic',
    description: 'Official Anthropic Claude 3 integration with streaming and vision support.',
    longDesc: 'Full integration with Claude 3 Haiku, Sonnet, and Opus. Supports streaming, vision inputs, tool use, and system prompts. Includes usage analytics dashboard.',
    category: 'AI Models', icon: Sparkles, iconColor: 'text-orange-400', iconBg: 'bg-orange-400/10',
    rating: 4.8, reviews: 892, installs: 24100, version: '1.8.0', size: '980 KB',
    tags: ['claude', 'anthropic', 'vision'], featured: true, verified: true, price: 'Free',
  },
  {
    id: 'slack-integration',  name: 'Slack Integration',      author: 'Pyxis Labs',
    description: 'Connect AI workflows to any Slack workspace with slash commands and webhooks.',
    longDesc: 'Send AI-generated content to Slack channels, respond to slash commands, and trigger workflows from Slack messages. Supports message threading and file uploads.',
    category: 'Integrations', icon: Zap,   iconColor: 'text-yellow-400', iconBg: 'bg-yellow-400/10',
    rating: 4.7, reviews: 634, installs: 19800, version: '3.1.2', size: '640 KB',
    tags: ['slack', 'messaging', 'webhook'], featured: true, verified: true, price: 'Free',
  },
  {
    id: 'notion-sync',        name: 'Notion Sync',            author: 'Integrations Co.',
    description: 'Bidirectional sync between Pyxis outputs and Notion databases/pages.',
    longDesc: 'Automatically push AI-generated content into Notion pages, databases, and templates. Supports rich text, tables, code blocks, and nested page creation.',
    category: 'Integrations', icon: Database, iconColor: 'text-blue-400', iconBg: 'bg-blue-400/10',
    rating: 4.6, reviews: 412, installs: 14300, version: '2.0.1', size: '820 KB',
    tags: ['notion', 'sync', 'database'], verified: true, price: 'Free',
  },
  {
    id: 'analytics-pro',      name: 'Analytics Pro',          author: 'DataSight',
    description: 'Advanced usage analytics, cost tracking, and model performance dashboards.',
    longDesc: 'Track every AI call with detailed analytics including token usage, cost per model, latency percentiles, error rates, and custom event tagging. Export to CSV/JSON.',
    category: 'Analytics', icon: BarChart2, iconColor: 'text-green-400', iconBg: 'bg-green-400/10',
    rating: 4.8, reviews: 789, installs: 22000, version: '4.2.0', size: '2.1 MB',
    tags: ['analytics', 'monitoring', 'cost'], featured: true, verified: true, price: 'Pro',
  },
  {
    id: 'vector-store',       name: 'Vector Store',           author: 'EmbedDB',
    description: 'High-performance vector database for semantic search and RAG pipelines.',
    longDesc: 'Manage embeddings with HNSW indexing for sub-millisecond similarity search. Supports OpenAI and Cohere embeddings out of the box. Includes automatic chunking and metadata filtering.',
    category: 'Data', icon: Database, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-400/10',
    rating: 4.7, reviews: 521, installs: 17600, version: '1.5.3', size: '4.8 MB',
    tags: ['vector', 'embeddings', 'rag'], verified: true, price: 'Free',
  },
  {
    id: 'code-executor',      name: 'Code Executor',          author: 'SandboxLabs',
    description: 'Safely execute AI-generated Python and JavaScript in isolated sandboxes.',
    longDesc: 'Run untrusted AI code in Docker-isolated sandboxes with resource limits. Supports Python 3.11, Node.js 20, output streaming, file I/O, and automatic cleanup.',
    category: 'Developer', icon: Code2, iconColor: 'text-cyan-400', iconBg: 'bg-cyan-400/10',
    rating: 4.5, reviews: 348, installs: 11200, version: '2.3.0', size: '8.2 MB',
    tags: ['code', 'sandbox', 'python'], verified: true, price: 'Pro',
  },
  {
    id: 'guardrails',         name: 'AI Guardrails',          author: 'SafetyFirst AI',
    description: 'Content moderation, PII redaction, and prompt injection defense layer.',
    longDesc: 'Automatically scan inputs/outputs for harmful content, PII (SSN, credit cards, emails), and prompt injection attempts. Configurable policies with audit logs.',
    category: 'Security', icon: Shield, iconColor: 'text-red-400', iconBg: 'bg-red-400/10',
    rating: 4.9, reviews: 1089, installs: 31500, version: '3.7.1', size: '1.6 MB',
    tags: ['safety', 'moderation', 'pii'], featured: true, verified: true, price: 'Free',
  },
  {
    id: 'workflow-triggers',  name: 'Workflow Triggers',      author: 'Pyxis Labs',
    description: 'Schedule and trigger AI workflows via cron, webhooks, or queue events.',
    longDesc: 'Set up cron jobs, webhook listeners, and queue-based triggers for your AI workflows. Supports retry logic, dead letter queues, and distributed execution.',
    category: 'Automation', icon: Workflow, iconColor: 'text-violet-400', iconBg: 'bg-violet-400/10',
    rating: 4.6, reviews: 287, installs: 9800, version: '1.2.4', size: '760 KB',
    tags: ['cron', 'webhook', 'queue'], new: true, verified: true, price: 'Free',
  },
  {
    id: 'web-scraper',        name: 'Web Scraper Pro',        author: 'CrawlAI',
    description: 'AI-powered web scraper with JS rendering and automatic content extraction.',
    longDesc: 'Scrape any website with full JavaScript rendering (Playwright-based). AI automatically extracts structured data, handles pagination, and adapts to layout changes.',
    category: 'Data', icon: Globe, iconColor: 'text-blue-400', iconBg: 'bg-blue-400/10',
    rating: 4.4, reviews: 203, installs: 7600, version: '1.0.8', size: '12 MB',
    tags: ['scraping', 'web', 'data'], new: true, verified: false, price: 'Free',
  },
  {
    id: 'agent-memory',       name: 'Agent Long-Term Memory', author: 'MemoryAI',
    description: 'Persistent cross-session memory for AI agents using semantic storage.',
    longDesc: 'Give your AI agents the ability to remember across sessions. Uses semantic search to retrieve relevant memories, with privacy controls and automatic summarization.',
    category: 'AI Models', icon: Bot, iconColor: 'text-orange-400', iconBg: 'bg-orange-400/10',
    rating: 4.7, reviews: 445, installs: 13700, version: '2.1.0', size: '3.4 MB',
    tags: ['memory', 'agents', 'context'], verified: true, price: 'Free',
  },
  {
    id: 'ab-testing',         name: 'Prompt A/B Testing',     author: 'OptimizeAI',
    description: 'Run A/B experiments on prompts with statistical significance reporting.',
    longDesc: 'Compare two prompt variants across thousands of calls with automatic significance testing, conversion tracking, and one-click winner deployment.',
    category: 'Analytics', icon: BarChart2, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-400/10',
    rating: 4.5, reviews: 178, installs: 6400, version: '1.3.2', size: '1.1 MB',
    tags: ['testing', 'optimization', 'prompts'], new: true, verified: true, price: 'Pro',
  },
]

const CATEGORIES: Category[] = ['All', 'AI Models', 'Integrations', 'Analytics', 'Security', 'Data', 'Automation', 'Developer']

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating',  label: 'Top Rated' },
  { value: 'newest',  label: 'Newest' },
  { value: 'name',    label: 'A–Z' },
]

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k'
  return String(n)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const [installed, setInstalled]       = useState<Set<string>>(new Set())
  const [search, setSearch]             = useState('')
  const [category, setCategory]         = useState<Category>('All')
  const [sortBy, setSortBy]             = useState<SortBy>('popular')
  const [view, setView]                 = useState<'grid' | 'list'>('grid')
  const [detail, setDetail]             = useState<Plugin | null>(null)
  const [installing, setInstalling]     = useState<string | null>(null)

  // Persist installed plugins
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pyxis_installed_plugins')
      if (saved) setInstalled(new Set(JSON.parse(saved)))
    } catch {}
  }, [])

  const persistInstalled = (next: Set<string>) => {
    try { localStorage.setItem('pyxis_installed_plugins', JSON.stringify([...next])) } catch {}
  }

  // Filter + Sort
  const filtered = useMemo(() => {
    let list = PLUGINS.filter(p => {
      const matchCat  = category === 'All' || p.category === category
      const q         = search.toLowerCase()
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some(t => t.includes(q))
      return matchCat && matchSearch
    })
    switch (sortBy) {
      case 'popular': list = list.sort((a, b) => b.installs - a.installs); break
      case 'rating':  list = list.sort((a, b) => b.rating - a.rating);    break
      case 'newest':  list = list.sort((a, b) => (b.new ? 1 : 0) - (a.new ? 1 : 0)); break
      case 'name':    list = list.sort((a, b) => a.name.localeCompare(b.name)); break
    }
    return list
  }, [search, category, sortBy])

  const featured = PLUGINS.filter(p => p.featured)

  const handleInstall = async (plugin: Plugin) => {
    if (installed.has(plugin.id)) {
      const next = new Set(installed)
      next.delete(plugin.id)
      setInstalled(next)
      persistInstalled(next)
      toast(`${plugin.name} uninstalled`, { icon: '🗑️' })
      return
    }
    setInstalling(plugin.id)
    await new Promise(r => setTimeout(r, 1200))
    const next = new Set(installed)
    next.add(plugin.id)
    setInstalled(next)
    persistInstalled(next)
    setInstalling(null)
    toast.success(`${plugin.name} installed!`)
  }

  const stars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={10} className={i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-text-tertiary'} />
    ))
  }

  // ── Detail Modal ───────────────────────────────────────────────────────────
  if (detail) {
    const Icon = detail.icon
    const isInstalled = installed.has(detail.id)
    return (
      <div className="h-full flex flex-col bg-bg text-text-primary overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface shrink-0">
          <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            <X size={16} /> Back to Marketplace
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-start gap-5 mb-6">
              <div className={`w-16 h-16 rounded-2xl ${detail.iconBg} border border-border flex items-center justify-center shrink-0`}>
                <Icon size={28} className={detail.iconColor} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-text-primary">{detail.name}</h1>
                  {detail.verified && <CheckCircle2 size={16} className="text-accent" />}
                  {detail.new && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(16,163,127,0.15)', color: '#10a37f' }}>NEW</span>}
                </div>
                <p className="text-sm text-text-secondary mb-2">by {detail.author}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">{stars(detail.rating)}<span className="text-xs text-text-secondary ml-1">{detail.rating} ({fmt(detail.reviews)})</span></div>
                  <span className="text-xs text-text-tertiary">{fmt(detail.installs)} installs</span>
                  <span className="text-xs text-text-tertiary">v{detail.version}</span>
                  <span className={`text-xs font-semibold ${detail.price === 'Free' ? 'text-green-400' : 'text-orange-400'}`}>{detail.price}</span>
                </div>
              </div>
              <button
                onClick={() => handleInstall(detail)}
                disabled={installing === detail.id}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isInstalled
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                    : 'bg-accent hover:bg-accent/90 text-white'
                }`}
              >
                {installing === detail.id ? 'Installing…' : isInstalled ? 'Uninstall' : 'Install Plugin'}
              </button>
            </div>

            {/* Description */}
            <div className="bg-surface border border-border rounded-xl p-5 mb-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Description</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{detail.longDesc}</p>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {detail.tags.map(tag => (
                <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-border text-text-secondary">#{tag}</span>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Rating',   value: `${detail.rating}/5` },
                { label: 'Reviews',  value: fmt(detail.reviews) },
                { label: 'Installs', value: fmt(detail.installs) },
                { label: 'Size',     value: detail.size },
              ].map(stat => (
                <div key={stat.label} className="bg-surface border border-border rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-text-primary">{stat.value}</p>
                  <p className="text-[10px] text-text-tertiary">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main View ──────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-bg text-text-primary overflow-hidden">

      {/* Top Bar */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Package size={16} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-text-primary leading-tight">Plugin Marketplace</h1>
              <p className="text-[10px] text-text-tertiary leading-tight">{installed.size} installed · {PLUGINS.length} available</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg transition-colors ${view === 'grid' ? 'bg-accent/10 text-accent' : 'text-text-tertiary hover:text-text-primary'}`}><Grid3X3 size={14} /></button>
            <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-accent/10 text-accent' : 'text-text-tertiary hover:text-text-primary'}`}><List size={14} /></button>
          </div>
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg focus-within:border-accent transition-colors">
            <Search size={14} className="text-text-tertiary shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search plugins…"
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
            {search && <button onClick={() => setSearch('')} className="text-text-tertiary hover:text-text-primary transition-colors"><X size={13} /></button>}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-bg text-xs text-text-secondary">
            <Filter size={12} />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="bg-transparent outline-none text-text-secondary cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                category === cat
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">

          {/* Featured Row — only show when no search/category filter */}
          {!search && category === 'All' && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-accent" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary opacity-70">Featured</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map(plugin => {
                  const Icon = plugin.icon
                  const isIns = installed.has(plugin.id)
                  return (
                    <div
                      key={plugin.id}
                      className="group relative bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition-all cursor-pointer overflow-hidden"
                      onClick={() => setDetail(plugin)}
                    >
                      {/* Glow */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(16,163,127,0.04) 0%, transparent 60%)' }} />
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl ${plugin.iconBg} flex items-center justify-center shrink-0`}>
                          <Icon size={18} className={plugin.iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm font-semibold text-text-primary truncate">{plugin.name}</span>
                            {plugin.verified && <CheckCircle2 size={12} className="text-accent shrink-0" />}
                          </div>
                          <p className="text-[11px] text-text-tertiary line-clamp-2">{plugin.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1">{stars(plugin.rating)}<span className="text-[10px] text-text-tertiary ml-0.5">{plugin.rating}</span></div>
                        <button
                          onClick={e => { e.stopPropagation(); handleInstall(plugin) }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                            isIns
                              ? 'bg-green-400/10 text-green-400 border border-green-400/30'
                              : 'bg-accent hover:bg-accent/90 text-white'
                          }`}
                        >
                          {installing === plugin.id ? <><Sparkles size={10} className="animate-spin" /> Installing…</> :
                           isIns ? <><CheckCircle2 size={10} /> Installed</> :
                           <><Download size={10} /> Install</>}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* All Plugins */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Package size={14} className="text-text-tertiary" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary opacity-70">
                {category === 'All' ? 'All Plugins' : category} · {filtered.length}
              </h2>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Package size={32} className="text-text-tertiary mx-auto mb-3 opacity-40" />
                <p className="text-text-secondary text-sm">No plugins match your search</p>
              </div>
            )}

            {view === 'grid' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map(plugin => {
                  const Icon = plugin.icon
                  const isIns = installed.has(plugin.id)
                  return (
                    <div
                      key={plugin.id}
                      className="group bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition-all cursor-pointer"
                      onClick={() => setDetail(plugin)}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-xl ${plugin.iconBg} flex items-center justify-center shrink-0`}>
                          <Icon size={16} className={plugin.iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-xs font-semibold text-text-primary truncate">{plugin.name}</span>
                            {plugin.verified && <CheckCircle2 size={10} className="text-accent shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-text-tertiary">{plugin.category}</span>
                            {plugin.new && <span className="text-[9px] px-1 py-0.5 rounded font-semibold" style={{ background: 'rgba(16,163,127,0.15)', color: '#10a37f' }}>NEW</span>}
                            {plugin.price === 'Pro' && <span className="text-[9px] px-1 py-0.5 rounded font-semibold bg-orange-400/10 text-orange-400">PRO</span>}
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-text-tertiary line-clamp-2 mb-3 leading-snug">{plugin.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">{stars(plugin.rating)}<span className="text-[9px] text-text-tertiary ml-0.5">{fmt(plugin.installs)}</span></div>
                        <button
                          onClick={e => { e.stopPropagation(); handleInstall(plugin) }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                            isIns
                              ? 'bg-green-400/10 text-green-400'
                              : 'bg-accent/10 text-accent hover:bg-accent hover:text-white'
                          }`}
                        >
                          {installing === plugin.id ? <Sparkles size={9} className="animate-spin" /> :
                           isIns ? <CheckCircle2 size={9} /> : <Download size={9} />}
                          {installing === plugin.id ? 'Installing' : isIns ? 'Installed' : 'Install'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(plugin => {
                  const Icon = plugin.icon
                  const isIns = installed.has(plugin.id)
                  return (
                    <div
                      key={plugin.id}
                      className="group flex items-center gap-4 bg-surface border border-border rounded-xl px-4 py-3 hover:border-accent/30 transition-all cursor-pointer"
                      onClick={() => setDetail(plugin)}
                    >
                      <div className={`w-9 h-9 rounded-xl ${plugin.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon size={16} className={plugin.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-text-primary truncate">{plugin.name}</span>
                          {plugin.verified && <CheckCircle2 size={11} className="text-accent shrink-0" />}
                          {plugin.new && <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(16,163,127,0.15)', color: '#10a37f' }}>NEW</span>}
                          {plugin.price === 'Pro' && <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-orange-400/10 text-orange-400">PRO</span>}
                        </div>
                        <p className="text-xs text-text-tertiary truncate">{plugin.description}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:flex items-center gap-1">{stars(plugin.rating)}<span className="text-[10px] text-text-tertiary ml-1">{plugin.rating}</span></div>
                        <span className="hidden md:block text-[10px] text-text-tertiary">{fmt(plugin.installs)} installs</span>
                        <span className="hidden md:block text-[10px] text-text-tertiary">{plugin.category}</span>
                        <button
                          onClick={e => { e.stopPropagation(); handleInstall(plugin) }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isIns
                              ? 'bg-green-400/10 text-green-400 border border-green-400/30'
                              : 'bg-accent hover:bg-accent/90 text-white'
                          }`}
                        >
                          {installing === plugin.id ? <><Sparkles size={11} className="animate-spin" /> Installing…</> :
                           isIns ? <><CheckCircle2 size={11} /> Installed</> :
                           <><Download size={11} /> Install</>}
                        </button>
                        <ArrowUpRight size={14} className="text-text-tertiary group-hover:text-text-primary transition-colors" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Installed section */}
          {installed.size > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} className="text-green-400" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary opacity-70">Installed ({installed.size})</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLUGINS.filter(p => installed.has(p.id)).map(plugin => {
                  const Icon = plugin.icon
                  return (
                    <div key={plugin.id} className="flex items-center gap-2 px-3 py-2 bg-green-400/5 border border-green-400/20 rounded-xl">
                      <Icon size={12} className={plugin.iconColor} />
                      <span className="text-xs text-text-primary font-medium">{plugin.name}</span>
                      <button onClick={() => handleInstall(plugin)} className="text-text-tertiary hover:text-red-400 transition-colors ml-1">
                        <X size={11} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
