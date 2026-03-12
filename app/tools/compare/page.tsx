'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BarChart2, Send, Loader2, Zap, Copy, Check, RefreshCw, Trophy, Clock } from 'lucide-react'

const MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', badge: 'Google', color: 'text-blue-400', bgColor: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.3)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', badge: 'Meta', color: 'text-orange-400', bgColor: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.3)' },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B', badge: 'OpenRouter', color: 'text-green-400', bgColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small 3.1', badge: 'Mistral', color: 'text-purple-400', bgColor: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.3)' },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1', badge: 'OpenRouter', color: 'text-cyan-400', bgColor: 'rgba(6,182,212,0.12)', borderColor: 'rgba(6,182,212,0.3)' },
  { id: 'qwen/qwen3-14b:free', label: 'Qwen 3 14B', badge: 'Alibaba', color: 'text-pink-400', bgColor: 'rgba(236,72,153,0.12)', borderColor: 'rgba(236,72,153,0.3)' },
]

const QUICK_PROMPTS = [
  'Explain quantum entanglement in simple terms',
  'Write a haiku about artificial intelligence',
  'What are the top 5 SaaS startup ideas for 2026?',
  "What's the difference between machine learning and AI?",
  'Write a persuasive opening paragraph about climate change',
  'Give me a step-by-step plan to learn programming in 3 months',
]

const BENCH_PROMPTS = [
  { label: '🧪 Reasoning', prompt: 'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Show your reasoning step by step.' },
  { label: '🎨 Creativity', prompt: 'Write a short story (100 words) that uses all five senses and ends with a surprising twist.' },
  { label: '📊 Analysis', prompt: 'Analyze the pros and cons of remote work for both employers and employees. Structure your response with headers.' },
  { label: '💻 Code', prompt: 'Write a Python function that checks if a string is a palindrome, handles edge cases, and includes tests.' },
  { label: '🔢 Math', prompt: 'If you fold a paper in half 42 times, how thick would it be? Show your calculation.' },
]

interface Result {
  model: typeof MODELS[0]
  text: string
  ms: number
  done: boolean
  error?: boolean
  wordCount?: number
}

export default function ComparePage() {
  const [prompt, setPrompt] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [running, setRunning] = useState(false)
  const [selected, setSelected] = useState<string[]>([MODELS[0].id, MODELS[1].id, MODELS[2].id])
  const [copied, setCopied] = useState<string | null>(null)
  const [showBench, setShowBench] = useState(false)
  const abortControllers = useRef<AbortController[]>([])

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
    )
  }

  const stop = () => {
    abortControllers.current.forEach(c => c.abort())
    setRunning(false)
  }

  const run = async (overridePrompt?: string) => {
    const p = (overridePrompt ?? prompt).trim()
    if (!p || running) return
    if (overridePrompt) setPrompt(overridePrompt)

    const activeModels = MODELS.filter(m => selected.includes(m.id))
    setRunning(true)
    setResults(activeModels.map(m => ({ model: m, text: '', ms: 0, done: false })))
    abortControllers.current = activeModels.map(() => new AbortController())

    await Promise.all(activeModels.map(async (model, idx) => {
      const start = Date.now()
      const controller = abortControllers.current[idx]
      const timer = setTimeout(() => controller.abort(), 35000)

      try {
        const res = await fetch('/api/tool-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: model.id,
            systemPrompt: 'You are a helpful, accurate, and concise AI assistant.',
            messages: [{ role: 'user', content: p }],
            stream: false,
          }),
        })
        clearTimeout(timer)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const text = data.content || data.error || '⚠️ Empty response.'
        const ms = Date.now() - start
        setResults(prev => {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], text, done: true, ms, wordCount: text.split(/\s+/).filter(Boolean).length }
          return updated
        })
      } catch (e: any) {
        clearTimeout(timer)
        const ms = Date.now() - start
        const msg = e.name === 'AbortError' ? '⏱ Timed out or stopped.' : `⚠️ Error: ${e.message}`
        setResults(prev => {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], text: msg, done: true, ms, error: true }
          return updated
        })
      }
    }))
    setRunning(false)
  }

  const copyResult = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  // Find fastest completed model
  const doneResults = results.filter(r => r.done && !r.error)
  const fastestMs = doneResults.length > 0 ? Math.min(...doneResults.map(r => r.ms)) : null

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
            <BarChart2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-text-primary text-sm">LLM Benchmark Suite</h1>
            <p className="text-xs text-text-tertiary">Compare {MODELS.length} frontier AI models in real-time</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
              {MODELS.length} Models · Free
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-6xl mx-auto">
          {/* Model selector */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Select Models ({selected.length} selected)
              </p>
              <button
                onClick={() => setShowBench(!showBench)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {showBench ? 'Hide benchmark prompts' : '🧪 Benchmark prompts'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {MODELS.map(m => {
                const isSelected = selected.includes(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all border"
                    style={{
                      background: isSelected ? m.bgColor : 'var(--surface)',
                      borderColor: isSelected ? m.borderColor : 'var(--border)',
                    }}
                  >
                    <Zap size={13} className={isSelected ? m.color : 'text-text-tertiary'} />
                    <span className={isSelected ? 'text-text-primary' : 'text-text-tertiary'}>{m.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isSelected ? m.color : 'text-text-tertiary'}`}
                      style={{ background: isSelected ? m.bgColor : 'var(--surface-hover)' }}>
                      {m.badge}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Benchmark prompts */}
          {showBench && (
            <div className="mb-5 p-4 bg-surface border border-border rounded-2xl">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">⚡ Benchmark Categories</p>
              <div className="flex flex-wrap gap-2">
                {BENCH_PROMPTS.map(b => (
                  <button
                    key={b.label}
                    onClick={() => run(b.prompt)}
                    className="px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text-secondary hover:text-text-primary hover:border-indigo-500/40 transition-all"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt input */}
          <div className="flex gap-3 mb-5">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run() } }}
              placeholder="Enter a prompt to benchmark all selected models simultaneously…"
              rows={2}
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none transition-all"
            />
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => running ? stop() : run()}
                disabled={!running && !prompt.trim()}
                className="px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 flex items-center gap-2"
                style={{ background: running ? '#ef4444' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {running ? (
                  <><RefreshCw size={15} className="animate-spin" /> Stop</>
                ) : (
                  <><Send size={15} /> Compare</>
                )}
              </button>
            </div>
          </div>

          {/* Quick prompts */}
          {results.length === 0 && !running && (
            <div className="mb-8">
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3 font-medium">Quick Prompts</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map(s => (
                  <button key={s} onClick={() => run(s)}
                    className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-yellow-500/40 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary stats when done */}
          {results.length > 0 && results.every(r => r.done) && doneResults.length > 0 && (
            <div className="mb-5 p-4 bg-surface border border-border rounded-2xl">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">📊 Benchmark Summary</p>
              <div className="flex flex-wrap gap-4">
                {results.filter(r => r.done && !r.error).sort((a, b) => a.ms - b.ms).map((r, i) => (
                  <div key={r.model.id} className="flex items-center gap-2">
                    {i === 0 && <Trophy size={13} className="text-yellow-400" />}
                    <span className={`text-xs font-medium ${r.model.color}`}>{r.model.label}</span>
                    <span className="text-xs text-text-tertiary">{(r.ms / 1000).toFixed(1)}s</span>
                    {r.wordCount && <span className="text-xs text-text-tertiary">· {r.wordCount} words</span>}
                    {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 font-medium">Fastest</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results grid */}
          {results.length > 0 && (
            <div className={`grid gap-4 ${
              results.length === 1 ? 'grid-cols-1' :
              results.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
              results.length <= 4 ? 'grid-cols-1 md:grid-cols-2' :
              'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            }`}>
              {results.map((r, i) => {
                const isFastest = r.done && !r.error && r.ms === fastestMs && doneResults.length > 1
                return (
                  <div
                    key={i}
                    className="bg-surface border rounded-2xl overflow-hidden transition-all"
                    style={{ borderColor: r.done && !r.error ? r.model.borderColor : 'var(--border)' }}
                  >
                    {/* Model header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border"
                      style={{ background: r.done && !r.error ? r.model.bgColor : 'transparent' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        {isFastest && <Trophy size={13} className="text-yellow-400 shrink-0" />}
                        <Zap size={13} className={r.model.color} />
                        <span className="text-sm font-semibold text-text-primary truncate">{r.model.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${r.model.color}`}
                          style={{ background: r.model.bgColor }}>
                          {r.model.badge}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.done ? (
                          <>
                            <span className="flex items-center gap-1 text-xs text-text-tertiary">
                              <Clock size={11} />
                              {(r.ms / 1000).toFixed(1)}s
                            </span>
                            {r.wordCount && (
                              <span className="text-xs text-text-tertiary">{r.wordCount}w</span>
                            )}
                            {!r.error && (
                              <button onClick={() => copyResult(r.text, r.model.id)}
                                className="p-1 rounded text-text-tertiary hover:text-text-secondary transition-colors">
                                {copied === r.model.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                              </button>
                            )}
                          </>
                        ) : (
                          <Loader2 size={13} className="animate-spin text-text-tertiary" />
                        )}
                      </div>
                    </div>

                    {/* Response */}
                    <div className="px-4 py-4" style={{ minHeight: 140, maxHeight: 400, overflowY: 'auto' }}>
                      {r.text ? (
                        <div className={`text-sm leading-relaxed ${r.error ? 'text-text-tertiary italic' : 'text-text-secondary'}`}>
                          <div className="markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.text}</ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-24 gap-2 text-text-tertiary">
                          <div className="flex gap-1">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                          </div>
                          <span className="text-xs">Generating response…</span>
                        </div>
                      )}
                    </div>

                    {/* Speed bar */}
                    {r.done && !r.error && fastestMs && (
                      <div className="px-4 pb-3">
                        <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(10, (fastestMs / r.ms) * 100)}%`,
                              background: isFastest
                                ? 'linear-gradient(90deg, #10a37f, #34d399)'
                                : `linear-gradient(90deg, ${r.model.bgColor.replace('0.12', '0.5')}, ${r.model.bgColor.replace('0.12', '0.8')})`
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-text-tertiary mt-1">
                          {isFastest ? '⚡ Fastest' : `${((r.ms / fastestMs) * 100 - 100).toFixed(0)}% slower than fastest`}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {results.length === 0 && !running && (
            <div className="text-center py-16">
              <BarChart2 size={48} className="text-text-tertiary mx-auto mb-4" />
              <h3 className="text-text-primary font-medium mb-2">Ready to Benchmark</h3>
              <p className="text-text-tertiary text-sm max-w-sm mx-auto">
                Select your models above, enter a prompt, and see all responses side-by-side with latency tracking
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
