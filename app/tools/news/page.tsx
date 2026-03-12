'use client'
import { useEffect, useState, useMemo } from 'react'
import { ExternalLink, RefreshCw, Rss, Bookmark, BookmarkCheck, Sparkles, Search, Clock, TrendingUp, Loader2, X, ChevronRight, Globe } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

interface Article {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
}

const SOURCES = ['All', 'TechCrunch AI', 'VentureBeat AI', 'The Verge AI', 'MIT Tech Review']

const SOURCE_CONFIG: Record<string, { color: string; dot: string }> = {
  'TechCrunch AI': { color: 'bg-green-500/10 text-green-400 border-green-500/20', dot: 'bg-green-400' },
  'VentureBeat AI': { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-400' },
  'The Verge AI': { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-400' },
  'MIT Tech Review': { color: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-400' },
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function readTime(text: string): number {
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200))
}

const TRENDING_TOPICS = [
  'GPT-5', 'Gemini Ultra', 'AI Agents', 'Open Source LLM', 'Multimodal AI',
  'AI Safety', 'Claude 4', 'Llama 4', 'AI Regulation', 'DeepSeek'
]

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSource, setActiveSource] = useState('All')
  const [search, setSearch] = useState('')
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { return new Set(JSON.parse(localStorage.getItem('pyxis-news-bookmarks') || '[]')) } catch { return new Set() }
  })
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [digest, setDigest] = useState('')
  const [digestLoading, setDigestLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/news')
      const data = await res.json()
      setArticles(data.articles || [])
      setLastRefresh(new Date())
    } catch { setError('Failed to load news. Check your connection.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const toggleBookmark = (link: string) => {
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(link)) { next.delete(link); toast('Bookmark removed') }
      else { next.add(link); toast.success('Bookmarked!') }
      try { localStorage.setItem('pyxis-news-bookmarks', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const filtered = useMemo(() => {
    let list = articles
    if (showBookmarks) list = list.filter(a => bookmarks.has(a.link))
    if (activeSource !== 'All') list = list.filter(a => a.source === activeSource)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q))
    }
    return list
  }, [articles, activeSource, search, showBookmarks, bookmarks])

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { All: articles.length }
    for (const a of articles) counts[a.source] = (counts[a.source] || 0) + 1
    return counts
  }, [articles])

  const generateDigest = async () => {
    if (!filtered.length) return
    setDigestLoading(true); setDigest('')
    const headlines = filtered.slice(0, 10).map((a, i) => `${i + 1}. ${a.title} (${a.source})`).join('\n')
    try {
      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'You are an AI news analyst. Create a concise, insightful digest of today\'s top AI news headlines. Group by theme, highlight the most significant developments, and provide brief analysis. Use markdown formatting with bullet points.',
          messages: [{ role: 'user', content: `Today's top AI news:\n${headlines}\n\nProvide a smart 3-paragraph digest with key themes and takeaways.` }],
          stream: false,
        }),
      })
      const data = await res.json()
      setDigest(data.content || '')
    } catch { toast.error('Failed to generate digest') }
    finally { setDigestLoading(false) }
  }

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Rss className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-text-primary flex items-center gap-2">
                AI News Feed
                <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">Live</span>
              </h1>
              <p className="text-xs text-text-tertiary">
                {lastRefresh ? `Updated ${timeAgo(lastRefresh.toISOString())}` : 'Loading…'} · {articles.length} articles
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBookmarks(b => !b)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                showBookmarks ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-surface text-text-secondary border-border hover:text-text-primary'
              }`}>
              {showBookmarks ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              Saved ({bookmarks.size})
            </button>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover rounded-lg text-xs text-text-secondary border border-border transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border flex-shrink-0 space-y-3">
        {/* Search */}
        <div className="flex items-center gap-2 bg-surface border border-border focus-within:border-cyan-500/40 rounded-xl px-3 py-2 transition-all">
          <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search articles…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none" />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-text-tertiary hover:text-text-primary" /></button>}
        </div>

        {/* Source filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {SOURCES.map(src => (
            <button key={src} onClick={() => setActiveSource(src)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                activeSource === src
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'bg-surface text-text-secondary border border-border hover:text-text-primary'
              }`}>
              {src !== 'All' && <span className={`w-1.5 h-1.5 rounded-full ${SOURCE_CONFIG[src]?.dot || 'bg-gray-400'}`} />}
              {src}
              {sourceCounts[src] !== undefined && (
                <span className="text-[10px] opacity-60">({sourceCounts[src]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Trending topics */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <TrendingUp className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
          {TRENDING_TOPICS.map(t => (
            <button key={t} onClick={() => setSearch(t)}
              className="px-2.5 py-1 bg-surface border border-border rounded-full text-[11px] text-text-tertiary hover:text-text-primary hover:border-cyan-500/30 transition-all whitespace-nowrap flex-shrink-0">
              #{t}
            </button>
          ))}
        </div>
      </div>

      {/* AI Digest banner */}
      {digest ? (
        <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-2xl flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">AI Digest</span>
            <button onClick={() => setDigest('')} className="ml-auto text-text-tertiary hover:text-text-primary"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="prose prose-sm prose-invert max-w-none text-text-secondary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{digest}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-4 flex-shrink-0">
          <button onClick={generateDigest} disabled={digestLoading || !filtered.length}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl text-sm text-cyan-400 hover:from-cyan-500/15 hover:to-blue-500/15 transition-all disabled:opacity-50">
            {digestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {digestLoading ? 'Generating AI Digest…' : `Generate AI Digest of ${filtered.length} articles`}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-text-tertiary text-sm">Fetching latest AI news…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto mt-12 text-center">
            <Globe className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button onClick={load} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-all">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="max-w-3xl mx-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <Rss className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary text-sm mb-2">No articles found</p>
                <p className="text-text-tertiary text-xs">
                  {showBookmarks ? 'No saved articles yet — bookmark some articles to see them here' : 'Try a different search or source filter'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-text-tertiary mb-4">
                  Showing {filtered.length} article{filtered.length !== 1 ? 's' : ''}
                  {activeSource !== 'All' ? ` from ${activeSource}` : ''}
                  {search ? ` matching "${search}"` : ''}
                </p>
                {filtered.map((article, i) => {
                  const cfg = SOURCE_CONFIG[article.source]
                  const isBookmarked = bookmarks.has(article.link)
                  const rt = readTime(article.description || article.title)
                  return (
                    <div key={i} className="group relative p-4 bg-surface border border-border rounded-2xl hover:border-cyan-500/20 transition-all"
                      style={{ animation: 'msgSlideIn .2s ease' }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${cfg?.color || 'bg-zinc-500/10 text-text-secondary border-zinc-500/20'}`}>
                              {article.source}
                            </span>
                            {article.pubDate && (
                              <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                                <Clock className="w-3 h-3" />
                                {timeAgo(article.pubDate)}
                              </span>
                            )}
                            <span className="text-[11px] text-text-tertiary">{rt} min read</span>
                          </div>

                          <a href={article.link} target="_blank" rel="noopener noreferrer" className="block group/link">
                            <h3 className="text-text-primary font-medium text-sm leading-snug group-hover/link:text-cyan-300 transition-colors mb-1.5 flex items-start gap-1">
                              {article.title}
                              <ExternalLink className="w-3 h-3 text-text-tertiary flex-shrink-0 mt-0.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                            </h3>
                          </a>

                          {article.description && (
                            <p className="text-text-tertiary text-xs leading-relaxed line-clamp-2">{article.description}</p>
                          )}

                          <div className="flex items-center gap-2 mt-3">
                            <a href={article.link} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                              Read full article <ChevronRight className="w-3 h-3" />
                            </a>
                          </div>
                        </div>

                        <button onClick={() => toggleBookmark(article.link)}
                          className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                            isBookmarked
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-text-tertiary hover:text-amber-400 hover:bg-amber-500/5 opacity-0 group-hover:opacity-100'
                          }`}>
                          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
