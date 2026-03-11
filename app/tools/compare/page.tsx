'use client'
import { useState } from 'react'
import { BarChart2, Send, Loader2, Zap } from 'lucide-react'

const MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', badge: 'Google', color: 'text-blue-400' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', badge: 'Meta', color: 'text-orange-400' },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B', badge: 'OpenRouter', color: 'text-green-400' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small', badge: 'OpenRouter', color: 'text-purple-400' },
]

interface Result { model: typeof MODELS[0]; text: string; ms: number; done: boolean }

export default function ComparePage() {
  const [prompt, setPrompt] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [running, setRunning] = useState(false)
  const [selected, setSelected] = useState<string[]>([MODELS[0].id, MODELS[1].id])

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
    )
  }

  const run = async () => {
    if (!prompt.trim() || running) return
    const activeModels = MODELS.filter(m => selected.includes(m.id))
    setRunning(true)
    setResults(activeModels.map(m => ({ model: m, text: '', ms: 0, done: false })))

    await Promise.all(activeModels.map(async (model, idx) => {
      const start = Date.now()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)  // 30s timeout

      try {
        const res = await fetch('/api/tool-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: model.id,
            systemPrompt: 'You are a helpful AI assistant. Be concise and accurate.',
            messages: [{ role: 'user', content: prompt.trim() }],
            stream: false,   // ← reliable JSON response
          }),
        })

        clearTimeout(timer)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const text = data.content || data.error || '⚠️ Empty response.'

        setResults(prev => {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], text, done: true, ms: Date.now() - start }
          return updated
        })
      } catch (e: any) {
        clearTimeout(timer)
        const msg = e.name === 'AbortError'
          ? '⏱ Timed out after 30s. This model may be rate-limited right now.'
          : `⚠️ Failed: ${e.message}`
        setResults(prev => {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], text: msg, done: true, ms: Date.now() - start }
          return updated
        })
      }
    }))

    setRunning(false)
  }

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-semibold text-text-primary">Model Comparison</h1>
          <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">All Free</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-5xl mx-auto">
          {/* Model selector */}
          <div className="mb-6">
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3">Select Models to Compare</p>
            <div className="flex flex-wrap gap-2">
              {MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all border ${
                    selected.includes(m.id)
                      ? 'bg-surface-hover border-indigo-500/50 text-text-primary'
                      : 'bg-bg border-border text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 ${selected.includes(m.id) ? m.color : 'text-text-tertiary'}`} />
                  <span>{m.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${selected.includes(m.id) ? 'bg-surface-active' : 'bg-surface'} ${m.color}`}>
                    {m.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          <div className="flex gap-3 mb-8">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run() } }}
              placeholder="Enter a prompt to compare all selected models side-by-side…"
              rows={2}
              className="flex-1 bg-surface border border-border focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none transition-all"
            />
            <button
              onClick={run}
              disabled={running || !prompt.trim()}
              className="px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {running ? 'Running…' : 'Compare'}
            </button>
          </div>

          {/* Quick prompts */}
          {results.length === 0 && (
            <div className="mb-8">
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3">Try These</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Explain quantum entanglement simply',
                  'Write a haiku about coding',
                  'What is the best programming language and why?',
                  'Give me 5 SaaS startup ideas for 2026',
                ].map(s => (
                  <button key={s} onClick={() => setPrompt(s)}
                    className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-indigo-500/40 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results grid */}
          {results.length > 0 && (
            <div className={`grid gap-4 ${results.length === 2 ? 'grid-cols-2' : results.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {results.map((r, i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden">
                  {/* Model header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Zap className={`w-3.5 h-3.5 ${r.model.color}`} />
                      <span className="text-sm font-medium text-text-primary">{r.model.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full bg-white/5 ${r.model.color}`}>{r.model.badge}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.done ? (
                        <span className="text-xs text-text-tertiary">{(r.ms / 1000).toFixed(1)}s</span>
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-text-tertiary" />
                      )}
                    </div>
                  </div>
                  {/* Response */}
                  <div className="px-4 py-4 min-h-[160px]">
                    {r.text ? (
                      <pre className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap font-sans">
                        {r.text}
                        {!r.done && <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-1 animate-pulse rounded-sm" />}
                      </pre>
                    ) : (
                      <div className="flex items-center gap-2 text-text-tertiary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Waiting for response…</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && (
            <div className="text-center py-12">
              <BarChart2 className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-tertiary text-sm">Select models above and enter a prompt to compare their responses side-by-side</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
