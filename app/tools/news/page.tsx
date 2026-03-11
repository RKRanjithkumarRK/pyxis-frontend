'use client'
import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw, Rss } from 'lucide-react'

interface Article { title: string; link: string; description: string; pubDate: string; source: string }

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const SOURCE_COLORS: Record<string, string> = {
  'TechCrunch AI': 'bg-green-500/10 text-green-400',
  'VentureBeat AI': 'bg-blue-500/10 text-blue-400',
  'The Verge AI': 'bg-purple-500/10 text-purple-400',
  'MIT Tech Review': 'bg-red-500/10 text-red-400',
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/news')
      const data = await res.json()
      setArticles(data.articles || [])
    } catch { setError('Failed to load news. Try again.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Rss className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-text-primary">AI News Feed</h1>
            <p className="text-xs text-text-tertiary">Live from TechCrunch, VentureBeat, The Verge, MIT Tech Review</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 bg-surface-hover hover:bg-surface-hover rounded-lg text-xs text-text-secondary transition-all disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-text-tertiary text-sm">Loading latest AI news…</p>
            </div>
          </div>
        )}

        {error && <div className="text-center text-red-400 py-12">{error}</div>}

        {!loading && !error && (
          <div className="max-w-3xl mx-auto space-y-3">
            {articles.map((article, i) => (
              <a
                key={i}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-surface border border-border rounded-xl hover:border-indigo-500/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[article.source] || 'bg-zinc-500/10 text-text-secondary'}`}>
                        {article.source}
                      </span>
                      {article.pubDate && (
                        <span className="text-xs text-text-tertiary">{timeAgo(article.pubDate)}</span>
                      )}
                    </div>
                    <h3 className="text-text-primary font-medium text-sm leading-snug group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    {article.description && (
                      <p className="text-text-tertiary text-xs mt-1 line-clamp-2">{article.description}</p>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-text-tertiary group-hover:text-indigo-400 flex-shrink-0 transition-colors mt-0.5" />
                </div>
              </a>
            ))}

            {articles.length === 0 && (
              <div className="text-center text-text-tertiary py-12">No articles found. Try refreshing.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
