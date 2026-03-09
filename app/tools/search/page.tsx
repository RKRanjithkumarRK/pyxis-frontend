'use client'
import { useState } from 'react'
import { Search, Globe, Sparkles, ExternalLink } from 'lucide-react'

interface Result { title: string; snippet: string; url: string }

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [aiAnswer, setAiAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')

  const search = async () => {
    if (!query.trim()) return
    setLoading(true); setResults([]); setAiAnswer(''); setStreamText('')

    try {
      // 1. Fetch web results
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.results || [])

      const context = (data.results || []).map((r: Result, i: number) =>
        `[${i+1}] ${r.title}: ${r.snippet}`
      ).join('\n')

      // 2. Ask AI to synthesize — use stream:false for reliability
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)

      const aiRes = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemPrompt: 'You are a search assistant. Based on the web results provided, give a clear, concise, and accurate answer. Cite sources with [1], [2] etc.',
          messages: [{ role: 'user', content: `Query: "${query}"\n\nWeb Results:\n${context || 'No results found.'}\n\nProvide a comprehensive answer.` }],
          stream: false,
        }),
      })

      clearTimeout(timer)
      const aiData = await aiRes.json()
      setAiAnswer(aiData.content || aiData.error || '⚠️ No AI answer available.')
      setStreamText(aiData.content || '')
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setAiAnswer('⏱ AI answer timed out. Web results are shown above.')
      } else {
        setAiAnswer('⚠️ Error fetching results. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1f1f2e] flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-semibold text-white">AI Web Search</h1>
          <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Free · No API key</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Search bar */}
          <div className="flex gap-3 mb-8">
            <div className="flex-1 flex items-center gap-3 bg-[#111118] border border-[#2a2a3e] focus-within:border-indigo-500/50 rounded-xl px-4 py-3 transition-all">
              <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Search anything… AI will synthesize the results"
                className="flex-1 bg-transparent text-white placeholder-zinc-600 outline-none text-sm"
              />
            </div>
            <button onClick={search} disabled={loading || !query.trim()}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-all">
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {/* AI Answer */}
          {(streamText || aiAnswer) && (
            <div className="mb-6 p-5 bg-[#111118] border border-indigo-500/20 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-indigo-400">AI Answer</span>
              </div>
              <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{streamText || aiAnswer}</p>
            </div>
          )}

          {/* Web Results */}
          {results.length > 0 && (
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider mb-3">Web Sources</p>
              <div className="space-y-3">
                {results.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="block p-4 bg-[#111118] border border-[#1f1f2e] rounded-xl hover:border-blue-500/30 transition-all group">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono text-zinc-600 mt-0.5">[{i+1}]</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors truncate">{r.title}</h3>
                          <ExternalLink className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{r.snippet}</p>
                        <p className="text-xs text-zinc-700 mt-1 truncate">{r.url}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!loading && !streamText && results.length === 0 && (
            <div className="text-center py-16">
              <Globe className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-600">Search anything — AI will find and synthesize the answer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
