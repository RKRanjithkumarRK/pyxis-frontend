'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Brain, Activity, Zap, Cpu, TrendingUp, Play, Square,
  RefreshCw, ChevronRight, CheckCircle2, AlertCircle,
  Clock, Layers, BarChart3, Globe, Bot, Code2, FileText,
  Sparkles, Send, X, ArrowUpRight, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ─── Types ─────────────────────────────────────────────── */
interface ModelStat {
  id: string
  name: string
  provider: string
  emoji: string
  requests: number
  latency: number
  errors: number
  color: string
  accentColor: string
}

interface AgentTask {
  id: string
  goal: string
  status: 'queued' | 'planning' | 'executing' | 'completed' | 'failed'
  steps: string[]
  progress: number
  createdAt: number
  model: string
}

interface LiveEvent {
  id: string
  type: 'model' | 'agent' | 'workflow' | 'search' | 'error'
  text: string
  meta: string
  ts: number
}

/* ─── Constants ──────────────────────────────────────────── */
const MODELS: ModelStat[] = [
  { id: 'gemini', name: 'Gemini 2.0 Flash', provider: 'Google', emoji: '🔵', requests: 8234, latency: 892, errors: 12, color: 'text-blue-400', accentColor: '#3b82f6' },
  { id: 'claude', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', emoji: '🟠', requests: 3122, latency: 1840, errors: 3, color: 'text-orange-400', accentColor: '#f97316' },
  { id: 'llama', name: 'Llama 3.3 70B', provider: 'Meta/OpenRouter', emoji: '🟣', requests: 2100, latency: 1200, errors: 45, color: 'text-purple-400', accentColor: '#a855f7' },
  { id: 'deepseek', name: 'DeepSeek R1', provider: 'OpenRouter', emoji: '🟡', requests: 987, latency: 3200, errors: 8, color: 'text-yellow-400', accentColor: '#eab308' },
  { id: 'mistral', name: 'Mistral Small 3.1', provider: 'Mistral', emoji: '🔴', requests: 386, latency: 650, errors: 1, color: 'text-red-400', accentColor: '#ef4444' },
  { id: 'gemma', name: 'Gemma 3 27B', provider: 'Google/OpenRouter', emoji: '🟢', requests: 421, latency: 980, errors: 5, color: 'text-green-400', accentColor: '#22c55e' },
]

const SAMPLE_GOALS = [
  'Research and summarize the top 5 AI breakthroughs of 2025',
  'Write a professional cover letter for a senior engineer role',
  'Analyze market trends for the electric vehicle industry',
  'Create a 30-day social media content calendar for a SaaS startup',
  'Generate a technical architecture document for a REST API',
]

const TOOL_LINKS = [
  { label: 'AI Chat', href: '/chat', icon: Sparkles, color: 'text-accent' },
  { label: 'Agents', href: '/tools/agents', icon: Bot, color: 'text-orange-400' },
  { label: 'Code Studio', href: '/tools/code', icon: Code2, color: 'text-green-400' },
  { label: 'Document Q&A', href: '/tools/rag', icon: FileText, color: 'text-emerald-400' },
  { label: 'Benchmark', href: '/tools/compare', icon: BarChart3, color: 'text-yellow-400' },
  { label: 'Web Search', href: '/tools/search', icon: Globe, color: 'text-blue-400' },
  { label: 'Workflow', href: '/tools/workflow', icon: Layers, color: 'text-purple-400' },
  { label: 'Marketplace', href: '/tools/marketplace', icon: Zap, color: 'text-pink-400' },
]

const STATUS_STYLES = {
  queued:    { dot: 'bg-zinc-500', text: 'text-zinc-400',  bg: 'bg-zinc-500/10' },
  planning:  { dot: 'bg-blue-400',  text: 'text-blue-400',  bg: 'bg-blue-400/10' },
  executing: { dot: 'bg-indigo-400 animate-pulse', text: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  completed: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  failed:    { dot: 'bg-red-400',  text: 'text-red-400',   bg: 'bg-red-400/10' },
}

function randomPick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

/* ─── Component ──────────────────────────────────────────── */
export default function CommandCenterPage() {
  const [models, setModels] = useState<ModelStat[]>(MODELS)
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [goal, setGoal] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [tab, setTab] = useState<'overview' | 'models' | 'agents' | 'activity'>('overview')
  const [tick, setTick] = useState(0)
  const eventIdRef = useRef(0)
  const taskIdRef = useRef(0)
  const feedRef = useRef<HTMLDivElement>(null)

  /* ── Simulate live metrics ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setTick(t => t + 1)
      setModels(prev => prev.map(m => ({
        ...m,
        requests: m.requests + Math.floor(Math.random() * 8),
        latency: Math.max(200, m.latency + (Math.random() * 100 - 50)),
        errors: m.errors + (Math.random() > 0.97 ? 1 : 0),
      })))
      const modelNames = MODELS.map(m => m.name)
      const eventTypes: LiveEvent['type'][] = ['model', 'agent', 'workflow', 'search']
      const msgs = [
        ['model', 'Chat completion — reasoning task', `${Math.floor(Math.random() * 2000 + 300)}ms`],
        ['model', 'Code generation request', `${Math.floor(Math.random() * 1500 + 500)}ms`],
        ['agent', 'Research agent completed subtask', `${Math.floor(Math.random() * 5 + 2)} steps`],
        ['workflow', 'Automation pipeline executed', `${Math.floor(Math.random() * 6 + 1)} nodes`],
        ['search', 'Web search — AI query processed', `${Math.floor(Math.random() * 10 + 3)} results`],
        ['model', 'Document analysis task', `${Math.floor(Math.random() * 3000 + 800)}ms`],
      ]
      const pick = msgs[Math.floor(Math.random() * msgs.length)]
      setEvents(prev => [{
        id: String(eventIdRef.current++),
        type: pick[0] as LiveEvent['type'],
        text: pick[1],
        meta: pick[2],
        ts: Date.now(),
      }, ...prev].slice(0, 50))
    }, 2200)
    return () => clearInterval(iv)
  }, [])

  /* ── Simulate task progression ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setTasks(prev => prev.map(t => {
        if (t.status === 'queued') return { ...t, status: 'planning', progress: 10 }
        if (t.status === 'planning') return { ...t, status: 'executing', progress: 30, steps: [...t.steps, 'Decomposed goal into subtasks'] }
        if (t.status === 'executing' && t.progress < 95) {
          const stepTexts = ['Searched web for context', 'Analyzed retrieved data', 'Generated draft output', 'Running quality check', 'Synthesizing final result']
          const newStep = stepTexts[t.steps.length] || 'Processing...'
          return { ...t, progress: Math.min(95, t.progress + 20), steps: [...t.steps, newStep] }
        }
        if (t.status === 'executing' && t.progress >= 95) return { ...t, status: 'completed', progress: 100, steps: [...t.steps, '✓ Task completed successfully'] }
        return t
      }))
    }, 2500)
    return () => clearInterval(iv)
  }, [])

  const deployAgent = useCallback(async () => {
    if (!goal.trim()) { toast.error('Enter a goal first'); return }
    setDeploying(true)
    await new Promise(r => setTimeout(r, 600))
    const id = String(taskIdRef.current++)
    const newTask: AgentTask = {
      id,
      goal: goal.trim(),
      status: 'queued',
      steps: [],
      progress: 0,
      createdAt: Date.now(),
      model: randomPick(['Gemini 2.0 Flash', 'Claude 3.5 Sonnet', 'Llama 3.3 70B']),
    }
    setTasks(prev => [newTask, ...prev])
    setGoal('')
    setDeploying(false)
    toast.success('Agent deployed!', { icon: '🤖' })
    setTab('agents')
  }, [goal])

  const cancelTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id && t.status !== 'completed' ? { ...t, status: 'failed' } : t))
    toast('Task cancelled')
  }

  const totalRequests = models.reduce((s, m) => s + m.requests, 0)
  const avgLatency = Math.round(models.reduce((s, m) => s + m.latency, 0) / models.length)
  const activeAgents = tasks.filter(t => ['queued','planning','executing'].includes(t.status)).length
  const errorRate = ((models.reduce((s, m) => s + m.errors, 0) / Math.max(totalRequests, 1)) * 100).toFixed(2)

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'models', label: 'Models' },
    { id: 'agents', label: `Agents${activeAgents ? ` (${activeAgents})` : ''}` },
    { id: 'activity', label: 'Activity' },
  ] as const

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">AI Command Center</h1>
            <p className="text-text-tertiary text-xs">Real-time platform intelligence · {models.filter(m => m.errors < 50).length}/{models.length} models healthy</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium">All Systems Live</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-px bg-border flex-shrink-0">
        {[
          { label: 'Total Requests', value: totalRequests.toLocaleString(), icon: Activity, color: 'text-blue-400', trend: '+' + Math.floor(tick * 4.2).toLocaleString() },
          { label: 'Active Models', value: `${models.length}`, icon: Cpu, color: 'text-purple-400', trend: 'All healthy' },
          { label: 'Avg Latency', value: `${avgLatency}ms`, icon: Zap, color: 'text-yellow-400', trend: 'Within SLA' },
          { label: 'Active Agents', value: activeAgents.toString(), icon: Bot, color: 'text-emerald-400', trend: tasks.filter(t => t.status === 'completed').length + ' done' },
        ].map(s => (
          <div key={s.label} className="bg-bg px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center flex-shrink-0">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-text-tertiary text-xs mb-0.5">{s.label}</p>
              <p className="text-text-primary font-bold text-xl leading-none">{s.value}</p>
              <p className={`text-xs mt-0.5 ${s.color}`}>{s.trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2.5 border-b border-border flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="h-full grid grid-cols-3 gap-px bg-border overflow-hidden">
            {/* Left: Model performance */}
            <div className="col-span-2 bg-bg overflow-y-auto p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-4">Model Performance</p>
              <div className="space-y-3">
                {models.map(m => {
                  const pct = Math.round((m.requests / totalRequests) * 100)
                  return (
                    <div key={m.id} className="bg-surface border border-border rounded-xl p-4 hover:border-indigo-500/20 transition-colors group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{m.emoji}</span>
                          <div>
                            <p className="text-text-primary text-sm font-medium">{m.name}</p>
                            <p className="text-text-tertiary text-xs">{m.provider}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-text-primary text-sm font-bold">{m.requests.toLocaleString()}</p>
                            <p className="text-text-tertiary text-[10px]">requests</p>
                          </div>
                          <div>
                            <p className="text-yellow-400 text-sm font-bold">{Math.round(m.latency)}ms</p>
                            <p className="text-text-tertiary text-[10px]">avg latency</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-emerald-400" title="Healthy" />
                        </div>
                      </div>
                      <div className="relative h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${m.accentColor}80, ${m.accentColor})` }} />
                      </div>
                      <p className="text-text-tertiary text-[10px] mt-1">{pct}% of total traffic</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right panel */}
            <div className="bg-bg flex flex-col overflow-hidden">
              {/* Deploy agent */}
              <div className="p-4 border-b border-border flex-shrink-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-3">Deploy Agent</p>
                <div className="bg-surface border border-border rounded-xl p-3">
                  <textarea value={goal} onChange={e => setGoal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); deployAgent() } }}
                    placeholder="Enter agent goal…&#10;e.g. Research AI trends 2025"
                    className="w-full bg-transparent text-text-primary text-xs placeholder:text-text-tertiary resize-none outline-none leading-relaxed" rows={3} />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <div className="flex gap-1.5 flex-wrap">
                      {SAMPLE_GOALS.slice(0,2).map(g => (
                        <button key={g} onClick={() => setGoal(g)} className="text-[10px] px-2 py-1 bg-surface-hover rounded-lg text-text-tertiary hover:text-text-primary transition-colors truncate max-w-[120px]" title={g}>
                          {g.slice(0, 22)}…
                        </button>
                      ))}
                    </div>
                    <button onClick={deployAgent} disabled={deploying || !goal.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 rounded-lg text-white text-xs font-medium transition-all flex-shrink-0">
                      {deploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Deploy
                    </button>
                  </div>
                </div>
              </div>

              {/* Agent status list */}
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-3">Agent Queue</p>
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                    <p className="text-text-tertiary text-xs">No agents deployed yet</p>
                    <p className="text-text-tertiary text-[10px] mt-1">Enter a goal above to deploy one</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.slice(0, 8).map(t => {
                      const s = STATUS_STYLES[t.status]
                      return (
                        <div key={t.id} className="bg-surface border border-border rounded-xl p-3">
                          <div className="flex items-start gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${s.dot}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-text-primary text-xs font-medium line-clamp-2 leading-snug">{t.goal}</p>
                              <p className="text-text-tertiary text-[10px] mt-0.5">{t.model}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${s.text} ${s.bg}`}>{t.status}</span>
                              {['executing','planning','queued'].includes(t.status) && (
                                <button onClick={() => cancelTask(t.id)} className="text-text-tertiary hover:text-red-400 transition-colors">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          {t.status !== 'queued' && (
                            <div className="mt-2">
                              <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${t.progress}%` }} />
                              </div>
                              <p className="text-text-tertiary text-[10px] mt-1">{t.steps[t.steps.length - 1] || '...'}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Live activity feed */}
              <div className="p-4 border-t border-border flex-shrink-0 max-h-44 overflow-hidden">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-2">Live Feed</p>
                <div ref={feedRef} className="space-y-1.5 overflow-y-auto max-h-32">
                  {events.slice(0, 8).map((ev, i) => (
                    <div key={ev.id} className="flex items-center gap-2" style={{ opacity: 1 - i * 0.1 }}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        ev.type === 'error' ? 'bg-red-400' :
                        ev.type === 'agent' ? 'bg-purple-400' :
                        ev.type === 'workflow' ? 'bg-yellow-400' : 'bg-emerald-400'
                      }`} />
                      <p className="text-text-tertiary text-[10px] flex-1 truncate">{ev.text}</p>
                      <span className="text-text-tertiary text-[10px] flex-shrink-0">{ev.meta}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODELS */}
        {tab === 'models' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4 max-w-4xl">
              {models.map(m => (
                <div key={m.id} className="bg-surface border border-border rounded-2xl p-5 hover:border-indigo-500/25 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{m.emoji}</span>
                      <div>
                        <p className="text-text-primary font-semibold text-sm">{m.name}</p>
                        <p className="text-text-tertiary text-xs">{m.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-emerald-400 text-[10px]">Healthy</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Requests', value: m.requests.toLocaleString() },
                      { label: 'Avg Latency', value: `${Math.round(m.latency)}ms` },
                      { label: 'Errors', value: m.errors.toString() },
                    ].map(s => (
                      <div key={s.label} className="bg-bg rounded-xl p-3 text-center">
                        <p className="text-text-primary font-bold text-base">{s.value}</p>
                        <p className="text-text-tertiary text-[10px] mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AGENTS */}
        {tab === 'agents' && (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3 max-w-2xl">
                <div className="flex-1 relative">
                  <textarea value={goal} onChange={e => setGoal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); deployAgent() } }}
                    placeholder="Define an agent goal…"
                    className="w-full bg-surface border border-border focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none transition-all" rows={2} />
                </div>
                <button onClick={deployAgent} disabled={deploying || !goal.trim()}
                  className="flex items-center gap-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 rounded-xl text-white text-sm font-medium transition-all flex-shrink-0">
                  {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Deploy
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {SAMPLE_GOALS.map(g => (
                  <button key={g} onClick={() => setGoal(g)}
                    className="text-xs px-2.5 py-1 bg-surface border border-border rounded-full text-text-tertiary hover:text-text-primary hover:border-indigo-500/30 transition-all">
                    {g.slice(0, 45)}{g.length > 45 ? '…' : ''}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="w-12 h-12 text-text-tertiary mb-3" />
                  <p className="text-text-secondary font-medium mb-1">No agents deployed</p>
                  <p className="text-text-tertiary text-sm">Define a goal above and click Deploy to launch an AI agent</p>
                </div>
              ) : (
                <div className="space-y-3 max-w-3xl">
                  {tasks.map(t => {
                    const s = STATUS_STYLES[t.status]
                    return (
                      <div key={t.id} className="bg-surface border border-border rounded-2xl p-5 hover:border-indigo-500/20 transition-all">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <p className="text-text-primary font-medium text-sm">{t.goal}</p>
                            <p className="text-text-tertiary text-xs mt-1">Model: {t.model} · Started {new Date(t.createdAt).toLocaleTimeString()}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize ${s.text} ${s.bg}`}>{t.status}</span>
                            {['executing','planning','queued'].includes(t.status) && (
                              <button onClick={() => cancelTask(t.id)}
                                className="flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors">
                                <Square className="w-3 h-3" /> Cancel
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                              style={{ width: `${t.progress}%` }} />
                          </div>
                          <span className="text-text-tertiary text-xs flex-shrink-0">{t.progress}%</span>
                        </div>
                        {t.steps.length > 0 && (
                          <div className="space-y-1">
                            {t.steps.slice(-3).map((step, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-text-tertiary">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                {step}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVITY */}
        {tab === 'activity' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-2xl space-y-1">
              {events.slice(0, 30).map(ev => (
                <div key={ev.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    ev.type === 'model' ? 'bg-emerald-500/10' :
                    ev.type === 'agent' ? 'bg-purple-500/10' :
                    ev.type === 'workflow' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
                  }`}>
                    {ev.type === 'model' ? <Cpu className={`w-4 h-4 text-emerald-400`} /> :
                     ev.type === 'agent' ? <Bot className="w-4 h-4 text-purple-400" /> :
                     ev.type === 'workflow' ? <Layers className="w-4 h-4 text-yellow-400" /> :
                     <Globe className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm">{ev.text}</p>
                    <p className="text-text-tertiary text-xs">{new Date(ev.ts).toLocaleTimeString()}</p>
                  </div>
                  <span className="text-text-tertiary text-sm flex-shrink-0">{ev.meta}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom toolbar — quick launch */}
      <div className="flex items-center gap-2 px-6 py-3 border-t border-border flex-shrink-0 bg-bg overflow-x-auto">
        <p className="text-text-tertiary text-xs flex-shrink-0">Quick launch:</p>
        {TOOL_LINKS.map(t => (
          <a key={t.href} href={t.href}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary transition-all flex-shrink-0 whitespace-nowrap">
            <t.icon className={`w-3 h-3 ${t.color}`} />
            {t.label}
          </a>
        ))}
      </div>
    </div>
  )
}
