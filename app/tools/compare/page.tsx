'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Trophy, Zap, Brain, Lightbulb, BarChart2, Code2, Hash, PenLine,
  Loader2, RefreshCw, Copy, Check, Download, Swords, Sparkles, Clock,
  FileText, ChevronDown, ChevronUp
} from 'lucide-react'

const MODELS = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'Google',
    speedTier: 'Fast',
    color: 'text-blue-400',
    bgColor: 'rgba(59,130,246,0.12)',
    borderColor: 'rgba(59,130,246,0.35)',
    glowColor: 'rgba(59,130,246,0.25)',
    dotColor: '#3b82f6',
    context: '1M tokens',
    specialties: ['Multimodal', 'Speed', 'Long context'],
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    label: 'Llama 3.3 70B',
    provider: 'Meta',
    speedTier: 'Balanced',
    color: 'text-orange-400',
    bgColor: 'rgba(249,115,22,0.12)',
    borderColor: 'rgba(249,115,22,0.35)',
    glowColor: 'rgba(249,115,22,0.2)',
    dotColor: '#f97316',
    context: '128K tokens',
    specialties: ['Open source', 'Reasoning', 'Coding'],
  },
  {
    id: 'google/gemma-3-27b-it:free',
    label: 'Gemma 3 27B',
    provider: 'Google',
    speedTier: 'Balanced',
    color: 'text-emerald-400',
    bgColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.35)',
    glowColor: 'rgba(16,185,129,0.2)',
    dotColor: '#10b981',
    context: '128K tokens',
    specialties: ['Efficient', 'Open weights', 'Multilingual'],
  },
  {
    id: 'mistralai/mistral-small-3.1-24b-instruct:free',
    label: 'Mistral Small 3.1',
    provider: 'Mistral',
    speedTier: 'Fast',
    color: 'text-purple-400',
    bgColor: 'rgba(168,85,247,0.12)',
    borderColor: 'rgba(168,85,247,0.35)',
    glowColor: 'rgba(168,85,247,0.2)',
    dotColor: '#a855f7',
    context: '32K tokens',
    specialties: ['European AI', 'Instruction', 'Efficient'],
  },
  {
    id: 'deepseek/deepseek-r1:free',
    label: 'DeepSeek R1',
    provider: 'DeepSeek',
    speedTier: 'Powerful',
    color: 'text-cyan-400',
    bgColor: 'rgba(6,182,212,0.12)',
    borderColor: 'rgba(6,182,212,0.35)',
    glowColor: 'rgba(6,182,212,0.2)',
    dotColor: '#06b6d4',
    context: '64K tokens',
    specialties: ['Chain-of-thought', 'Math', 'Reasoning'],
  },
  {
    id: 'qwen/qwen3-14b:free',
    label: 'Qwen 3 14B',
    provider: 'Alibaba',
    speedTier: 'Balanced',
    color: 'text-pink-400',
    bgColor: 'rgba(236,72,153,0.12)',
    borderColor: 'rgba(236,72,153,0.35)',
    glowColor: 'rgba(236,72,153,0.2)',
    dotColor: '#ec4899',
    context: '32K tokens',
    specialties: ['Multilingual', 'Math', 'Coding'],
  },
  {
    id: 'anthropic/claude-haiku-3-5',
    label: 'Claude Haiku 3.5',
    provider: 'Anthropic',
    speedTier: 'Fast',
    color: 'text-amber-400',
    bgColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.35)',
    glowColor: 'rgba(245,158,11,0.2)',
    dotColor: '#f59e0b',
    context: '200K tokens',
    specialties: ['Safety', 'Speed', 'Writing'],
  },
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'OpenAI',
    speedTier: 'Fast',
    color: 'text-green-400',
    bgColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.35)',
    glowColor: 'rgba(34,197,94,0.2)',
    dotColor: '#22c55e',
    context: '128K tokens',
    specialties: ['Affordable', 'Vision', 'Function calling'],
  },
]

const BENCH_CATEGORIES = [
  {
    id: 'reasoning',
    label: 'Reasoning',
    icon: Brain,
    prompt: 'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Show your reasoning step by step.',
  },
  {
    id: 'creativity',
    label: 'Creativity',
    icon: Lightbulb,
    prompt: 'Write a short story (100 words) that uses all five senses and ends with a surprising twist.',
  },
  {
    id: 'analysis',
    label: 'Analysis',
    icon: BarChart2,
    prompt: 'Analyze the pros and cons of remote work for both employers and employees. Structure your response with headers.',
  },
  {
    id: 'code',
    label: 'Code',
    icon: Code2,
    prompt: 'Write a Python function that checks if a string is a palindrome, handles edge cases, and includes tests.',
  },
  {
    id: 'math',
    label: 'Math',
    icon: Hash,
    prompt: 'If you fold a paper in half 42 times, how thick would it be? Show your calculation step by step.',
  },
  {
    id: 'writing',
    label: 'Writing',
    icon: PenLine,
    prompt: 'Write a compelling opening paragraph for a thriller novel set in a near-future AI surveillance state.',
  },
]

const SPEED_TIER_COLORS: Record<string, string> = {
  Fast: 'text-green-400 bg-green-500/10 border-green-500/25',
  Balanced: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
  Powerful: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
}

interface Result {
  model: typeof MODELS[0]
  text: string
  ms: number
  done: boolean
  error?: boolean
  wordCount?: number
  tokensPerSec?: number
}

function getBadges(results: Result[], r: Result): string[] {
  const done = results.filter(x => x.done && !x.error)
  if (done.length < 2) return []
  const badges: string[] = []
  const minMs = Math.min(...done.map(x => x.ms))
  const maxWords = Math.max(...done.map(x => x.wordCount ?? 0))
  if (r.ms === minMs) badges.push('fastest')
  if ((r.wordCount ?? 0) === maxWords && maxWords > 0) badges.push('detailed')
  return badges
}

export default function ComparePage() {
  const [prompt, setPrompt] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [running, setRunning] = useState(false)
  const [selected, setSelected] = useState<string[]>([MODELS[0].id, MODELS[1].id, MODELS[2].id])
  const [copied, setCopied] = useState<string | null>(null)
  const [exportCopied, setExportCopied] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showTable, setShowTable] = useState(false)
  const abortControllers = useRef<AbortController[]>([])
  const charLimit = 1500

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
    setShowTable(false)
    abortControllers.current = activeModels.map(() => new AbortController())

    await Promise.all(activeModels.map(async (model, idx) => {
      const start = Date.now()
      const controller = abortControllers.current[idx]
      const timer = setTimeout(() => controller.abort(), 40000)
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
        const wordCount = text.split(/\s+/).filter(Boolean).length
        const tokensPerSec = Math.round((wordCount * 1.33) / (ms / 1000))
        setResults(prev => {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], text, done: true, ms, wordCount, tokensPerSec }
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
    setShowTable(true)
  }

  const copyResult = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const exportResults = async () => {
    const done = results.filter(r => r.done && !r.error)
    const text = [
      `# AI Model Arena — Benchmark Results`,
      `**Prompt:** ${prompt}`,
      `**Date:** ${new Date().toLocaleString()}`,
      '',
      ...done.sort((a, b) => a.ms - b.ms).map((r, i) => [
        `## ${i + 1}. ${r.model.label} (${r.model.provider})`,
        `- Latency: ${(r.ms / 1000).toFixed(2)}s`,
        `- Words: ${r.wordCount}`,
        `- Speed: ~${r.tokensPerSec} tok/s`,
        '',
        r.text,
      ].join('\n')),
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setExportCopied(true)
    setTimeout(() => setExportCopied(false), 2500)
  }

  const doneResults = results.filter(r => r.done && !r.error)
  const fastestMs = doneResults.length > 0 ? Math.min(...doneResults.map(r => r.ms)) : null
  const winner = doneResults.length > 0 ? doneResults.find(r => r.ms === fastestMs) : null
  const allDone = results.length > 0 && results.every(r => r.done)

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary">
      {/* Hero header */}
      <div className="px-6 py-5 border-b border-border flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 50%, rgba(236,72,153,0.05) 100%)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Swords size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-text-primary tracking-tight">AI Model Arena</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                  style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)' }}>
                  LIVE BENCHMARKS
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">Compare leading models side-by-side in real-time</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1.5 rounded-full border font-medium"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', borderColor: 'rgba(16,185,129,0.25)' }}>
              {MODELS.length} Models Available
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">

          {/* Model Cards Grid */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                Select Models · {selected.length} of {MODELS.length} selected
              </p>
              <div className="flex gap-2">
                <button onClick={() => setSelected(MODELS.map(m => m.id))}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Select all</button>
                <span className="text-text-tertiary">·</span>
                <button onClick={() => setSelected([MODELS[0].id])}
                  className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">Reset</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {MODELS.map(m => {
                const isSelected = selected.includes(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className="relative text-left p-3.5 rounded-2xl border transition-all duration-200"
                    style={{
                      background: isSelected ? m.bgColor : 'var(--surface)',
                      borderColor: isSelected ? m.borderColor : 'var(--border)',
                      boxShadow: isSelected ? `0 0 20px ${m.glowColor}` : 'none',
                    }}
                  >
                    {/* Checkmark */}
                    <div className="absolute top-2.5 right-2.5">
                      {isSelected ? (
                        <div className="w-4.5 h-4.5 rounded-full flex items-center justify-center"
                          style={{ background: m.dotColor }}>
                          <Check size={9} className="text-white" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-border" />
                      )}
                    </div>

                    {/* Provider color dot + name */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.dotColor }} />
                      <span className="text-[10px] font-medium text-text-tertiary">{m.provider}</span>
                    </div>

                    <p className="text-sm font-semibold text-text-primary leading-tight mb-2 pr-5">{m.label}</p>

                    {/* Speed tier badge */}
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold mb-2.5 ${SPEED_TIER_COLORS[m.speedTier]}`}>
                      <Zap size={8} />
                      {m.speedTier}
                    </span>

                    <p className="text-[10px] text-text-tertiary mb-1.5">{m.context}</p>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-1">
                      {m.specialties.slice(0, 2).map(s => (
                        <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-surface-hover text-text-tertiary">
                          {s}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Benchmark Category Tabs */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest mb-3">Benchmark Categories</p>
            <div className="flex flex-wrap gap-2">
              {BENCH_CATEGORIES.map(cat => {
                const Icon = cat.icon
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(isActive ? null : cat.id)
                      if (!isActive) {
                        setPrompt(cat.prompt)
                      } else {
                        setPrompt('')
                      }
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all"
                    style={{
                      background: isActive ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
                      borderColor: isActive ? 'rgba(99,102,241,0.4)' : 'var(--border)',
                      color: isActive ? '#818cf8' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon size={14} />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Prompt input */}
          <div className="mb-5">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={e => { if (e.target.value.length <= charLimit) setPrompt(e.target.value) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run() } }}
                placeholder="Enter your prompt to test all selected models simultaneously… (Shift+Enter for new line)"
                rows={3}
                className="w-full bg-surface border border-border focus:border-indigo-500/50 rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none transition-all pr-20"
                style={{
                  boxShadow: prompt ? '0 0 0 3px rgba(99,102,241,0.08)' : 'none',
                }}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className={`text-[10px] font-mono ${prompt.length > charLimit * 0.85 ? 'text-yellow-400' : 'text-text-tertiary'}`}>
                  {prompt.length}/{charLimit}
                </span>
              </div>
            </div>
          </div>

          {/* Run Battle Button */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => running ? stop() : run()}
              disabled={!running && !prompt.trim()}
              className="flex items-center gap-2.5 px-8 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: running
                  ? '#ef4444'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                boxShadow: running ? 'none' : '0 4px 24px rgba(99,102,241,0.35)',
              }}
            >
              {running ? (
                <><RefreshCw size={15} className="animate-spin" /> Stop Battle</>
              ) : (
                <><Swords size={15} /> Run Battle · {selected.length} models</>
              )}
            </button>

            {running && (
              <div className="flex items-center gap-2 text-sm text-text-tertiary">
                <Loader2 size={14} className="animate-spin" />
                Comparing {selected.length} models…
              </div>
            )}

            {allDone && doneResults.length > 0 && (
              <button
                onClick={exportResults}
                className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-secondary hover:text-text-primary hover:border-indigo-500/30 transition-all"
              >
                {exportCopied
                  ? <><Check size={14} className="text-green-400" /> Copied!</>
                  : <><Download size={14} /> Export Results</>}
              </button>
            )}
          </div>

          {/* Empty state */}
          {results.length === 0 && !running && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))' }}>
                <Swords size={28} className="text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Ready for Battle</h3>
              <p className="text-text-tertiary text-sm max-w-sm mx-auto leading-relaxed">
                Select your models, pick a benchmark category or write a custom prompt, then hit Run Battle to see them compete in real-time.
              </p>
            </div>
          )}

          {/* WINNER card */}
          {allDone && winner && doneResults.length > 1 && (
            <div className="mb-6 p-5 rounded-2xl border relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(234,179,8,0.1) 0%, rgba(245,158,11,0.08) 100%)',
                borderColor: 'rgba(234,179,8,0.35)',
                boxShadow: '0 0 40px rgba(234,179,8,0.12)',
              }}>
              <div className="flex items-center gap-3 mb-1">
                <Trophy size={22} className="text-yellow-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Winner</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 font-medium">Fastest Response</span>
                  </div>
                  <p className="text-lg font-bold text-text-primary">{winner.model.label}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-bold text-yellow-400">{(winner.ms / 1000).toFixed(2)}s</p>
                  <p className="text-xs text-text-tertiary">response time</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-tertiary mt-2">
                <span>{winner.wordCount} words</span>
                <span>~{winner.tokensPerSec} tok/s</span>
                <span style={{ color: winner.model.dotColor }}>{winner.model.provider}</span>
              </div>
            </div>
          )}

          {/* Results grid */}
          {results.length > 0 && (
            <div className={`grid gap-4 mb-8 ${
              results.length === 1 ? 'grid-cols-1' :
              results.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
              results.length <= 4 ? 'grid-cols-1 md:grid-cols-2' :
              'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            }`}>
              {results.map((r, i) => {
                const isFastest = r.done && !r.error && r.ms === fastestMs && doneResults.length > 1
                const badges = getBadges(results, r)
                const speedPct = (fastestMs && r.ms && r.done && !r.error)
                  ? Math.max(8, Math.round((fastestMs / r.ms) * 100))
                  : 0

                return (
                  <div
                    key={i}
                    className="rounded-2xl border overflow-hidden transition-all duration-300 flex flex-col"
                    style={{
                      background: 'var(--surface)',
                      borderColor: isFastest ? r.model.borderColor : (r.done && !r.error ? r.model.borderColor : 'var(--border)'),
                      boxShadow: isFastest ? `0 0 24px ${r.model.glowColor}` : 'none',
                    }}
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border"
                      style={{ background: r.done && !r.error ? r.model.bgColor : 'transparent' }}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.model.dotColor }} />
                        <span className="text-sm font-bold text-text-primary truncate">{r.model.label}</span>
                        {isFastest && (
                          <Trophy size={12} className="text-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {r.done ? (
                          <>
                            <span className="flex items-center gap-1 text-xs text-text-tertiary">
                              <Clock size={10} />
                              {(r.ms / 1000).toFixed(2)}s
                            </span>
                            {!r.error && (
                              <button onClick={() => copyResult(r.text, r.model.id)}
                                className="p-1 rounded-lg text-text-tertiary hover:text-text-secondary transition-colors">
                                {copied === r.model.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                              </button>
                            )}
                          </>
                        ) : (
                          <Loader2 size={13} className="animate-spin text-indigo-400" />
                        )}
                      </div>
                    </div>

                    {/* Response content */}
                    <div className="flex-1 px-4 py-4 overflow-y-auto" style={{ minHeight: 160, maxHeight: 360 }}>
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
                          <span className="text-xs">Generating…</span>
                        </div>
                      )}
                    </div>

                    {/* Stats row + speed bar */}
                    {r.done && !r.error && (
                      <div className="px-4 pb-4 pt-2 border-t border-border mt-auto">
                        {/* Stats */}
                        <div className="flex items-center gap-3 mb-2.5 text-xs text-text-tertiary">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {(r.ms / 1000).toFixed(2)}s latency
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText size={10} />
                            {r.wordCount} words
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap size={10} />
                            ~{r.tokensPerSec} tok/s
                          </span>
                        </div>

                        {/* Speed bar */}
                        <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden mb-1.5">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${speedPct}%`,
                              background: isFastest
                                ? 'linear-gradient(90deg, #10b981, #34d399)'
                                : `linear-gradient(90deg, ${r.model.dotColor}99, ${r.model.dotColor})`,
                            }}
                          />
                        </div>

                        {/* Badges + speed label */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-text-tertiary">
                            {isFastest ? '⚡ Fastest' : `${Math.round((r.ms / (fastestMs ?? r.ms) - 1) * 100)}% slower`}
                          </span>
                          {badges.includes('fastest') && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
                              🏆 Fastest
                            </span>
                          )}
                          {badges.includes('detailed') && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                              📝 Most Detailed
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Comparison Table */}
          {allDone && doneResults.length > 1 && (
            <div className="mb-6">
              <button
                onClick={() => setShowTable(t => !t)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-surface border border-border rounded-2xl text-sm font-medium text-text-secondary hover:text-text-primary hover:border-indigo-500/25 transition-all"
              >
                <div className="flex items-center gap-2">
                  <BarChart2 size={15} />
                  Comparison Table
                </div>
                {showTable ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {showTable && (
                <div className="mt-3 bg-surface border border-border rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Model</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Provider</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Latency</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Words</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">~Tok/s</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Speed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...doneResults].sort((a, b) => a.ms - b.ms).map((r, i) => {
                        const isFastestRow = r.ms === fastestMs
                        const pct = fastestMs ? Math.round((fastestMs / r.ms) * 100) : 100
                        return (
                          <tr key={r.model.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-surface-hover/30'}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isFastestRow && <Trophy size={12} className="text-yellow-400" />}
                                <div className="w-2 h-2 rounded-full" style={{ background: r.model.dotColor }} />
                                <span className="font-medium text-text-primary">{r.model.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-text-tertiary">{r.model.provider}</td>
                            <td className="px-4 py-3 text-right font-mono text-text-secondary">{(r.ms / 1000).toFixed(2)}s</td>
                            <td className="px-4 py-3 text-right text-text-secondary">{r.wordCount}</td>
                            <td className="px-4 py-3 text-right text-text-secondary">{r.tokensPerSec}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, background: r.model.dotColor }} />
                                </div>
                                <span className="text-[10px] text-text-tertiary w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
