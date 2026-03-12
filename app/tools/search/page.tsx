'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search, Globe, Sparkles, ExternalLink, Clock, Copy, ArrowRight, X,
  TrendingUp, Loader2, CheckCircle, Mic, BookOpen, Newspaper, GraduationCap,
  ChevronRight, History, Trash2, ArrowUpRight
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

interface SearchResult {
  title: string
  snippet: string
  url: string
}

const SUGGESTED_SEARCHES = [
  'Best AI models in 2026',
  'How does RAG work?',
  'Latest AI breakthroughs',
  'Open source LLM comparison',
  'AI agent frameworks',
  'Prompt engineering tips',
  'Quantum computing explained',
  'Future of autonomous vehicles',
]

const RELATED_TOPICS = [
  'AI safety research 2026',
  'GPT-4 vs Claude comparison',
  'Vector databases explained',
  'Fine-tuning vs RAG',
  'Multimodal AI models',
  'AI regulation updates',
]

const SEARCH_MODES = [
  { id: 'smart', label: 'Smart Answer', icon: Sparkles, desc: 'AI synthesizes answer from web' },
  { id: 'deep', label: 'Deep Research', icon: BookOpen, desc: 'Thorough multi-angle analysis' },
  { id: 'news', label: 'News Only', icon: Newspaper, desc: 'Latest news and updates' },
  { id: 'academic', label: 'Academic', icon: GraduationCap, desc: 'Scholarly and technical sources' },
]

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function getFavicon(url: string): string {
  try { return `https://www.google.com/s2/favicons?sz=32&domain=${new URL(url).hostname}` } catch { return '' }
}

function getTimeAgo(): string {
  const opts = ['2h ago', '5h ago', 'Yesterday', '3h ago', '1d ago', 'Just now', '4h ago', '2d ago']
  return opts[Math.floor(Math.random() * opts.length)]
}

// Pre-compute time labels once per render cycle (not per render)
const timeCache = new Map<string, string>()
function getCachedTime(url: string): string {
  if (!timeCache.has(url)) timeCache.set(url, getTimeAgo())
  return timeCache.get(url)!
}

// Parse inline source citations [1], [2] etc. from AI answer text
function InlineAnswer({ text, results, onCiteClick }: { text: string; results: SearchResult[]; onCiteClick: (i: number) => void }) {
  const parts = text.split(/(\[\d+\])/)
  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/)
        if (match) {
          const idx = parseInt(match[1]) - 1
          if (idx >= 0 && idx < results.length) {
            return (
              <button
                key={i}
                onClick={() => onCiteClick(idx)}
                className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all hover:scale-105"
                style={{
                  background: 'rgba(59,130,246,0.15)',
                  borderColor: 'rgba(59,130,246,0.35)',
                  color: '#60a5fa',
                }}
              >
                {match[1]}
              </button>
            )
          }
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [aiAnswer, setAiAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('pyxis-search-history') || '[]') } catch { return [] }
  })
  const [showHistory, setShowHistory] = useState(false)
  const [mode, setMode] = useState('smart')
  const [followUps, setFollowUps] = useState<string[]>([])
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [highlightedSource, setHighlightedSource] = useState<number | null>(null)
  const [isListening, setIsListening] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const sourceRefs = useRef<(HTMLAnchorElement | null)[]>([])

  // Focus search on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Keyboard shortcut ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const addToHistory = (q: string) => {
    setHistory(prev => {
      const next = [q, ...prev.filter(h => h !== q)].slice(0, 10)
      try { localStorage.setItem('pyxis-search-history', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const removeFromHistory = (q: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h !== q)
      try { localStorage.setItem('pyxis-search-history', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const clearHistory = () => {
    setHistory([])
    try { localStorage.removeItem('pyxis-search-history') } catch {}
    toast('History cleared')
  }

  const getModeSystemPrompt = (m: string, q: string): string => {
    switch (m) {
      case 'deep':
        return `You are a deep research AI. Provide a thorough, multi-angle analysis with headers, subpoints, and nuanced perspectives. Cite sources with [1], [2] etc. Be comprehensive.`
      case 'news':
        return `You are a news synthesis AI. Focus on the most recent developments and breaking information from the sources. Use [1], [2] citations. Keep it current and factual.`
      case 'academic':
        return `You are an academic research assistant. Provide a scholarly, technically precise answer with citations [1][2] etc. Use formal language and highlight methodologies where relevant.`
      default:
        return `You are an expert AI search assistant. Provide a comprehensive, well-structured answer with citations [1], [2] etc. Use markdown formatting. Be accurate and concise.`
    }
  }

  const search = useCallback(async (q?: string) => {
    const searchQuery = (q ?? query).trim()
    if (!searchQuery || loading) return
    setQuery(searchQuery)
    setLoading(true)
    setResults([])
    setAiAnswer('')
    setFollowUps([])
    setShowHistory(false)
    setHighlightedSource(null)
    addToHistory(searchQuery)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      const webResults: SearchResult[] = data.results || []
      setResults(webResults)

      if (webResults.length > 0) {
        const context = webResults
          .map((r: SearchResult, i: number) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`)
          .join('\n\n')

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 40000)

        const aiRes = await fetch('/api/tool-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemPrompt: getModeSystemPrompt(mode, searchQuery),
            messages: [{
              role: 'user',
              content: `Query: "${searchQuery}"\n\nWeb Sources:\n${context}\n\nProvide a comprehensive, well-structured answer with inline source citations [1], [2] etc.`,
            }],
            stream: false,
          }),
        })
        clearTimeout(timer)
        const aiData = await aiRes.json()
        const answer = aiData.content || ''
        setAiAnswer(answer)
        generateFollowUps(searchQuery, answer)
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('Search failed. Please try again.')
      } else {
        setAiAnswer('⏱ AI answer timed out. Web results are shown below.')
      }
    } finally {
      setLoading(false)
    }
  }, [query, mode, loading])

  const generateFollowUps = async (q: string, answer: string) => {
    setFollowUpLoading(true)
    try {
      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'Generate exactly 4 short follow-up questions. Return ONLY a JSON array of strings, nothing else. Max 8 words each.',
          messages: [{ role: 'user', content: `Query: "${q}"\nAnswer: "${answer.slice(0, 500)}"` }],
          stream: false,
        }),
      })
      const data = await res.json()
      const match = (data.content || '').match(/\[[\s\S]*\]/)
      if (match) setFollowUps(JSON.parse(match[0]).slice(0, 4))
    } catch { /* silent */ } finally { setFollowUpLoading(false) }
  }

  const copyAnswer = () => {
    navigator.clipboard.writeText(aiAnswer).then(() => {
      setCopied(true)
      toast.success('Answer copied!')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCiteClick = (idx: number) => {
    setHighlightedSource(idx)
    sourceRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setHighlightedSource(null), 2500)
  }

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice search not supported in this browser')
      return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    setIsListening(true)
    recognition.start()
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setQuery(transcript)
      setIsListening(false)
      search(transcript)
    }
    recognition.onerror = () => { setIsListening(false); toast.error('Voice search failed') }
    recognition.onend = () => setIsListening(false)
  }

  const hasResults = results.length > 0
  const hasAnswer = !!aiAnswer

  return (
    <div className="h-full flex bg-bg text-text-primary overflow-hidden">

      {/* Left Sidebar — Search History */}
      <div className="hidden lg:flex flex-col w-56 xl:w-64 flex-shrink-0 border-r border-border bg-surface overflow-y-auto">
        <div className="px-4 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <History size={14} className="text-text-tertiary" />
            <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Recent</span>
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory} className="text-text-tertiary hover:text-red-400 transition-colors">
              <Trash2 size={12} />
            </button>
          )}
        </div>

        <div className="flex-1 p-2">
          {history.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Clock size={20} className="text-text-tertiary mx-auto mb-2" />
              <p className="text-xs text-text-tertiary">Your searches will appear here</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {history.map(h => (
                <div key={h} className="group flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                  onClick={() => { setQuery(h); search(h) }}>
                  <Clock size={12} className="text-text-tertiary flex-shrink-0" />
                  <span className="text-xs text-text-secondary group-hover:text-text-primary flex-1 line-clamp-1 transition-colors">{h}</span>
                  <button
                    onClick={e => { e.stopPropagation(); removeFromHistory(h) }}
                    className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-400 transition-all flex-shrink-0"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trending section */}
        <div className="border-t border-border p-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-2 mb-1">
            <TrendingUp size={11} className="text-text-tertiary" />
            <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">Trending</span>
          </div>
          {RELATED_TOPICS.slice(0, 4).map(t => (
            <button key={t} onClick={() => { setQuery(t); search(t) }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-all text-left">
              <ArrowRight size={10} className="flex-shrink-0" />
              <span className="line-clamp-1">{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Hero header + search bar */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border"
          style={{ background: 'linear-gradient(180deg, rgba(59,130,246,0.06) 0%, transparent 100%)' }}>

          {/* Hero */}
          {!hasResults && !loading && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-3"
                style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)' }}>
                <Globe size={12} className="text-blue-400" />
                <span className="text-xs font-medium text-blue-400">AI-Powered Web Search</span>
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-1.5 tracking-tight">
                AI Web Search
              </h1>
              <p className="text-sm text-text-tertiary">Ask anything, get AI-powered answers with sources</p>
            </div>
          )}

          {/* Search bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div
                className="flex items-center gap-3 bg-surface border rounded-2xl px-4 py-3.5 transition-all duration-200"
                style={{
                  borderColor: 'var(--border)',
                }}
                onFocus={() => {}}
              >
                <Search size={16} className="text-text-tertiary flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') search()
                    if (e.key === 'Escape') setShowHistory(false)
                    if (e.key === 'ArrowDown') setShowHistory(true)
                  }}
                  onFocus={() => history.length > 0 && setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                  placeholder="Ask anything…"
                  className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary outline-none text-sm min-w-0"
                  style={{ caretColor: '#3b82f6' }}
                />
                <div className="flex items-center gap-2 flex-shrink-0">
                  {query && (
                    <button onClick={() => { setQuery(''); setResults([]); setAiAnswer('') }}
                      className="text-text-tertiary hover:text-text-primary transition-colors">
                      <X size={15} />
                    </button>
                  )}
                  <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-text-tertiary border border-border rounded font-mono">
                    ⌘K
                  </kbd>
                  <button
                    onClick={handleVoice}
                    className={`p-1.5 rounded-lg transition-all ${isListening ? 'text-red-400 bg-red-500/10' : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover'}`}
                    title="Voice search"
                  >
                    <Mic size={15} />
                  </button>
                  <button
                    onClick={() => search()}
                    disabled={loading || !query.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition-all"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                    {loading ? 'Searching' : 'Search'}
                  </button>
                </div>
              </div>

              {/* History dropdown */}
              {showHistory && history.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-xl z-20 overflow-hidden"
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                    <span className="text-xs text-text-tertiary flex items-center gap-1.5">
                      <History size={11} /> Recent searches
                    </span>
                    <button onClick={clearHistory} className="text-xs text-text-tertiary hover:text-red-400 transition-colors">Clear all</button>
                  </div>
                  {history.slice(0, 6).map(h => (
                    <button key={h} onClick={() => { setQuery(h); search(h); setShowHistory(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors text-left">
                      <Clock size={12} className="text-text-tertiary flex-shrink-0" />
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mode pills */}
            <div className="flex items-center gap-2 mt-3 justify-center flex-wrap">
              {SEARCH_MODES.map(m => {
                const Icon = m.icon
                const isActive = mode === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all"
                    style={{
                      background: isActive ? 'rgba(59,130,246,0.15)' : 'var(--surface)',
                      borderColor: isActive ? 'rgba(59,130,246,0.4)' : 'var(--border)',
                      color: isActive ? '#60a5fa' : 'var(--text-tertiary)',
                    }}
                  >
                    <Icon size={12} />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-6">

            {/* Empty state */}
            {!loading && !hasAnswer && !hasResults && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={13} className="text-text-tertiary" />
                  <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Try these searches</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_SEARCHES.map(s => (
                    <button key={s} onClick={() => { setQuery(s); search(s) }}
                      className="flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl text-sm text-text-secondary hover:text-text-primary hover:border-blue-500/30 hover:bg-surface-hover transition-all text-left group">
                      <Search size={13} className="text-text-tertiary flex-shrink-0 group-hover:text-blue-400 transition-colors" />
                      <span className="flex-1">{s}</span>
                      <ChevronRight size={13} className="text-text-tertiary group-hover:text-blue-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-4">
                <div className="p-5 bg-surface border border-border rounded-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={15} className="text-blue-400 animate-pulse" />
                    <span className="text-sm font-medium text-blue-400">Generating AI answer…</span>
                  </div>
                  {[80, 95, 70, 85, 60].map((w, i) => (
                    <div key={i} className="h-3 bg-surface-hover rounded-full mb-2.5 animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3">Sources</p>
                <div className="grid grid-cols-1 gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-surface border border-border rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            )}

            {/* AI Answer */}
            {hasAnswer && !loading && (
              <div className="mb-6 rounded-2xl border overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(6,182,212,0.04) 100%)',
                  borderColor: 'rgba(59,130,246,0.25)',
                  boxShadow: '0 0 40px rgba(59,130,246,0.06)',
                }}>
                {/* Answer header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b"
                  style={{ borderColor: 'rgba(59,130,246,0.15)' }}>
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-blue-400" />
                    <span className="text-sm font-semibold text-blue-400">Answer</span>
                    <span className="text-xs text-text-tertiary">· {results.length} sources</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
                      style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.25)', color: '#60a5fa' }}>
                      {SEARCH_MODES.find(m => m.id === mode)?.label}
                    </span>
                  </div>
                  <button onClick={copyAnswer}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${
                      copied ? 'text-green-400 bg-green-500/10 border-green-500/25' : 'text-text-tertiary bg-surface border-border hover:text-text-primary'
                    }`}>
                    {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* Answer body with inline citations */}
                <div className="px-5 py-4">
                  <div className="prose prose-sm prose-invert max-w-none text-text-primary text-sm leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => (
                          <p className="mb-3 last:mb-0">
                            {typeof children === 'string'
                              ? <InlineAnswer text={children} results={results} onCiteClick={handleCiteClick} />
                              : children}
                          </p>
                        ),
                      }}
                    >
                      {aiAnswer}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Follow-up questions */}
                {(followUps.length > 0 || followUpLoading) && (
                  <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(59,130,246,0.12)' }}>
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Follow-up Questions</p>
                    {followUpLoading ? (
                      <div className="flex gap-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-8 w-36 bg-surface rounded-xl animate-pulse" />)}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {followUps.map(q => (
                          <button key={q} onClick={() => { setQuery(q); search(q) }}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border rounded-xl text-xs text-text-secondary hover:text-blue-400 hover:border-blue-500/30 transition-all">
                            {q}
                            <ArrowRight size={11} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sources grid */}
            {hasResults && !loading && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={13} className="text-text-tertiary" />
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                    Sources · {results.length} results
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {results.map((r, i) => (
                    <a
                      key={i}
                      ref={el => { sourceRefs.current[i] = el }}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3.5 p-4 bg-surface border rounded-xl hover:border-blue-500/30 transition-all duration-200 group"
                      style={{
                        borderColor: highlightedSource === i ? 'rgba(59,130,246,0.5)' : 'var(--border)',
                        boxShadow: highlightedSource === i ? '0 0 16px rgba(59,130,246,0.15)' : 'none',
                        background: highlightedSource === i ? 'rgba(59,130,246,0.05)' : 'var(--surface)',
                      }}
                    >
                      {/* Source number */}
                      <span className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
                        {i + 1}
                      </span>

                      {/* Favicon + content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <img
                            src={getFavicon(r.url)}
                            className="w-4 h-4 rounded-sm flex-shrink-0"
                            alt=""
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                          <span className="text-xs text-text-tertiary font-medium">{getDomain(r.url)}</span>
                          <span className="text-[10px] text-text-tertiary">·</span>
                          <span className="text-[10px] text-text-tertiary">{getCachedTime(r.url)}</span>
                        </div>
                        <h3 className="text-sm font-medium text-text-primary group-hover:text-blue-300 transition-colors line-clamp-1 mb-1">
                          {r.title}
                        </h3>
                        <p className="text-xs text-text-tertiary line-clamp-2 leading-relaxed">{r.snippet}</p>
                      </div>

                      {/* Arrow */}
                      <ArrowUpRight size={15} className="text-text-tertiary group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Related searches */}
            {hasResults && !loading && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Related Searches</p>
                <div className="grid grid-cols-2 gap-2">
                  {RELATED_TOPICS.map(t => (
                    <button key={t} onClick={() => { setQuery(t); search(t) }}
                      className="flex items-center gap-2 px-3.5 py-2.5 bg-surface border border-border rounded-xl text-xs text-text-secondary hover:text-text-primary hover:border-blue-500/25 transition-all text-left group">
                      <Search size={11} className="text-text-tertiary flex-shrink-0 group-hover:text-blue-400 transition-colors" />
                      <span className="flex-1 line-clamp-1">{t}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
