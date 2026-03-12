'use client'
import { useState, useRef } from 'react'
import { Search, Globe, Sparkles, ExternalLink, Clock, Copy, ArrowRight, X, TrendingUp, ChevronDown, ChevronUp, Loader2, CheckCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

interface Result { title: string; snippet: string; url: string }

const SUGGESTED_SEARCHES = [
  'Best AI models in 2025',
  'How does RAG work?',
  'Latest AI breakthroughs',
  'Open source LLM comparison',
  'AI agent frameworks',
  'Prompt engineering tips',
]

const SEARCH_MODES = [
  { id: 'smart', label: 'Smart', icon: Sparkles, desc: 'AI synthesizes answer from web' },
  { id: 'sources', label: 'Sources', icon: Globe, desc: 'Raw web results only' },
]

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function getFavicon(url: string): string {
  try { return `https://www.google.com/s2/favicons?sz=16&domain=${new URL(url).hostname}` } catch { return '' }
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
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
  const [expandedResults, setExpandedResults] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addToHistory = (q: string) => {
    setHistory(prev => {
      const next = [q, ...prev.filter(h => h !== q)].slice(0, 8)
      try { localStorage.setItem('pyxis-search-history', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const search = async (q?: string) => {
    const searchQuery = (q ?? query).trim()
    if (!searchQuery) return
    setQuery(searchQuery)
    setLoading(true); setResults([]); setAiAnswer(''); setFollowUps([]); setShowHistory(false); setExpandedResults(false)
    addToHistory(searchQuery)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      const webResults = data.results || []
      setResults(webResults)

      if (mode === 'smart' && webResults.length > 0) {
        const context = webResults.map((r: Result, i: number) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`).join('\n\n')
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 35000)

        const aiRes = await fetch('/api/tool-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemPrompt: 'You are an expert AI search assistant. Based on the web results, provide a comprehensive, well-structured answer. Use markdown formatting with headers and bullet points where appropriate. Cite sources with [1], [2] etc. Be concise but thorough.',
            messages: [{
              role: 'user',
              content: `Query: "${searchQuery}"\n\nWeb Sources:\n${context}\n\nProvide a comprehensive, well-structured answer with source citations.`
            }],
            stream: false,
          }),
        })
        clearTimeout(timer)
        const aiData = await aiRes.json()
        setAiAnswer(aiData.content || '')
        generateFollowUps(searchQuery, aiData.content || '')
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') toast.error('Search failed. Please try again.')
      else setAiAnswer('⏱ AI answer timed out. Web results are shown below.')
    } finally {
      setLoading(false)
    }
  }

  const generateFollowUps = async (q: string, answer: string) => {
    setFollowUpLoading(true)
    try {
      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'Generate exactly 3 short follow-up questions based on the search query and answer. Return ONLY a JSON array of strings, nothing else. Each question max 10 words.',
          messages: [{ role: 'user', content: `Query: "${q}"\nAnswer summary: "${answer.slice(0, 500)}"` }],
          stream: false,
        }),
      })
      const data = await res.json()
      const content = data.content || ''
      const match = content.match(/\[[\s\S]*\]/)
      if (match) setFollowUps(JSON.parse(match[0]).slice(0, 3))
    } catch {} finally { setFollowUpLoading(false) }
  }

  const copyAnswer = () => {
    navigator.clipboard.writeText(aiAnswer).then(() => {
      setCopied(true); toast.success('Answer copied!')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const clearHistory = () => {
    setHistory([]); localStorage.removeItem('pyxis-search-history'); toast('History cleared')
  }

  const visibleResults = expandedResults ? results : results.slice(0, 4)

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-semibold">AI Web Search</h1>
          <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">Free · No API key</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">

          {/* Search bar */}
          <div className="relative mb-3">
            <div className="flex items-center gap-3 bg-surface border border-border focus-within:border-blue-500/50 rounded-2xl px-4 py-3.5 transition-all">
              <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') search(); if (e.key === 'ArrowDown') setShowHistory(true) }}
                onFocus={() => history.length > 0 && setShowHistory(true)}
                onBlur={() => setTimeout(() => setShowHistory(false), 150)}
                placeholder="Search anything… AI will synthesize the answer"
                className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary outline-none text-sm"
              />
              {query && <button onClick={() => { setQuery(''); setResults([]); setAiAnswer('') }} className="text-text-tertiary hover:text-text-primary"><X className="w-4 h-4" /></button>}
            </div>

            {/* History dropdown */}
            {showHistory && history.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-xs text-text-tertiary flex items-center gap-1.5"><Clock className="w-3 h-3" /> Recent searches</span>
                  <button onClick={clearHistory} className="text-xs text-text-tertiary hover:text-red-400 transition-colors">Clear</button>
                </div>
                {history.map(h => (
                  <button key={h} onClick={() => { setQuery(h); search(h); setShowHistory(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors text-left">
                    <Clock className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mode + Search button */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-xl">
              {SEARCH_MODES.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                    mode === m.id ? 'bg-blue-600 text-white' : 'text-text-secondary hover:text-text-primary'
                  }`}>
                  <m.icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              ))}
            </div>
            <button onClick={() => search()} disabled={loading || !query.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-all">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {/* Suggested searches (empty state) */}
          {!loading && !aiAnswer && results.length === 0 && (
            <div className="text-center">
              <Globe className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary font-medium mb-1">AI-powered web search</p>
              <p className="text-text-tertiary text-sm mb-6">Ask anything — AI synthesizes answers from live web results</p>
              <div className="flex items-center gap-2 justify-center mb-4">
                <TrendingUp className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-xs text-text-tertiary">Try these searches</span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                {SUGGESTED_SEARCHES.map(s => (
                  <button key={s} onClick={() => { setQuery(s); search(s) }}
                    className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-border rounded-xl text-xs text-text-secondary hover:text-text-primary hover:border-blue-500/30 transition-all text-left">
                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Answer */}
          {aiAnswer && (
            <div className="mb-6 p-5 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/20 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-400">AI Answer</span>
                  <span className="text-xs text-text-tertiary">based on {results.length} sources</span>
                </div>
                <button onClick={copyAnswer}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                    copied ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-text-tertiary bg-surface border-border hover:text-text-primary'
                  }`}>
                  {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="prose prose-sm prose-invert max-w-none text-text-primary">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAnswer}</ReactMarkdown>
              </div>

              {/* Follow-up questions */}
              {(followUps.length > 0 || followUpLoading) && (
                <div className="mt-4 pt-4 border-t border-blue-500/10">
                  <p className="text-xs text-text-tertiary mb-2">Follow-up questions</p>
                  {followUpLoading ? (
                    <div className="flex gap-2">
                      {[1, 2, 3].map(i => <div key={i} className="h-7 w-32 bg-surface rounded-lg animate-pulse" />)}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {followUps.map(q => (
                        <button key={q} onClick={() => { setQuery(q); search(q) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary hover:text-blue-400 hover:border-blue-500/30 transition-all">
                          {q} <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Web Results */}
          {results.length > 0 && (
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Web Sources · {results.length} results
              </p>
              <div className="space-y-2">
                {visibleResults.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 p-4 bg-surface border border-border rounded-xl hover:border-blue-500/30 transition-all group"
                    style={{ animation: 'msgSlideIn .15s ease' }}>
                    <span className="text-xs font-mono text-text-tertiary mt-0.5 w-5 flex-shrink-0">[{i + 1}]</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={getFavicon(r.url)} className="w-4 h-4 rounded-sm" alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                        <span className="text-xs text-text-tertiary">{getDomain(r.url)}</span>
                      </div>
                      <h3 className="text-sm font-medium text-text-primary group-hover:text-blue-300 transition-colors line-clamp-1 mb-1">{r.title}</h3>
                      <p className="text-xs text-text-tertiary line-clamp-2">{r.snippet}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-text-tertiary group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
                  </a>
                ))}
              </div>

              {results.length > 4 && (
                <button onClick={() => setExpandedResults(e => !e)}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-surface border border-border rounded-xl text-xs text-text-secondary hover:text-text-primary transition-all">
                  {expandedResults ? <><ChevronUp className="w-3.5 h-3.5" /> Show fewer</> : <><ChevronDown className="w-3.5 h-3.5" /> Show {results.length - 4} more results</>}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
