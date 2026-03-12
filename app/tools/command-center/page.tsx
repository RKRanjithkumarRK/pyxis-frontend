'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Brain, Activity, Zap, Cpu, TrendingUp, Play, Square,
  RefreshCw, ChevronRight, CheckCircle2, AlertCircle,
  Clock, Layers, BarChart3, Globe, Bot, Code2, FileText,
  Sparkles, Send, X, ArrowUpRight, Loader2, Shield, Server
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
  errorRate: number
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
  model: string
  tool: string
  latency: number
  ts: number
  ok: boolean
}

interface HourlyBar {
  hour: number
  count: number
}

/* ─── Constants ──────────────────────────────────────────── */
const MODELS: ModelStat[] = [
  { id: 'gemini',   name: 'Gemini 2.5 Flash',   provider: 'Google',         emoji: '🔵', requests: 4821, latency: 245,  errorRate: 0.3,  color: 'text-blue-400',   accentColor: '#3b82f6' },
  { id: 'llama',    name: 'Llama 3.3 70B',       provider: 'Meta/OpenRouter',emoji: '🟣', requests: 2390, latency: 892,  errorRate: 0.8,  color: 'text-purple-400', accentColor: '#a855f7' },
  { id: 'mistral',  name: 'Mistral Small 3.1',   provider: 'Mistral',        emoji: '🔴', requests: 1204, latency: 334,  errorRate: 0.1,  color: 'text-rose-400',   accentColor: '#f43f5e' },
  { id: 'deepseek', name: 'DeepSeek R1',          provider: 'OpenRouter',     emoji: '🟡', requests: 876,  latency: 1840, errorRate: 0.5,  color: 'text-amber-400',  accentColor: '#f59e0b' },
  { id: 'gemma',    name: 'Gemma 3 27B',          provider: 'Google/OpenRouter',emoji: '🟢',requests: 641,  latency: 512,  errorRate: 0.2,  color: 'text-emerald-400',accentColor: '#10b981' },
  { id: 'qwen',     name: 'Qwen 2.5 72B',         provider: 'OpenRouter',     emoji: '🟤', requests: 388,  latency: 720,  errorRate: 0.4,  color: 'text-orange-400', accentColor: '#f97316' },
]

const TOOLS = ['Code Studio', 'AI Agents', 'Writing Studio', 'Web Search', 'Document Q&A', 'Workflow', 'Benchmark', 'AI Chat']
const MODEL_NAMES = MODELS.map(m => m.name)

const SAMPLE_GOALS = [
  'Research top 5 AI breakthroughs of 2025',
  'Write a cover letter for a senior engineer role',
  'Analyze electric vehicle market trends',
  'Generate REST API architecture document',
  'Create 30-day social media calendar for SaaS',
]

const TOOL_LINKS = [
  { label: 'AI Chat',      href: '/chat',               icon: Sparkles,  color: 'text-indigo-400' },
  { label: 'Agents',       href: '/tools/agents',       icon: Bot,       color: 'text-orange-400' },
  { label: 'Code Studio',  href: '/tools/code',         icon: Code2,     color: 'text-emerald-400' },
  { label: 'Document Q&A', href: '/tools/rag',          icon: FileText,  color: 'text-teal-400' },
  { label: 'Benchmark',    href: '/tools/compare',      icon: BarChart3, color: 'text-yellow-400' },
  { label: 'Web Search',   href: '/tools/search',       icon: Globe,     color: 'text-blue-400' },
  { label: 'Workflow',     href: '/tools/workflow',     icon: Layers,    color: 'text-purple-400' },
  { label: 'Marketplace',  href: '/tools/marketplace',  icon: Zap,       color: 'text-pink-400' },
]

const STATUS_STYLES = {
  queued:    { dot: 'bg-zinc-500',                          text: 'text-zinc-400',    bg: 'bg-zinc-500/10' },
  planning:  { dot: 'bg-blue-400',                          text: 'text-blue-400',    bg: 'bg-blue-400/10' },
  executing: { dot: 'bg-indigo-400 animate-pulse',          text: 'text-indigo-400',  bg: 'bg-indigo-400/10' },
  completed: { dot: 'bg-emerald-400',                       text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  failed:    { dot: 'bg-red-400',                           text: 'text-red-400',     bg: 'bg-red-400/10' },
}

function randomPick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function generateHourlyBars(): HourlyBar[] {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const hour = (now.getHours() - 11 + i + 24) % 24
    const base = 80 + Math.floor(Math.random() * 120)
    const bump = hour >= 9 && hour <= 17 ? Math.floor(Math.random() * 80) : 0
    return { hour, count: base + bump }
  })
}

/* ─── Component ──────────────────────────────────────────── */
export default function CommandCenterPage() {
  const [models,      setModels]      = useState<ModelStat[]>(MODELS)
  const [tasks,       setTasks]       = useState<AgentTask[]>([])
  const [events,      setEvents]      = useState<LiveEvent[]>([])
  const [goal,        setGoal]        = useState('')
  const [deploying,   setDeploying]   = useState(false)
  const [tab,         setTab]         = useState<'overview' | 'models' | 'agents' | 'activity'>('overview')
  const [clock,       setClock]       = useState('')
  const [totalCalls,  setTotalCalls]  = useState(() => 1000 + Math.floor(Math.random() * 1000))
  const [avgRespTime, setAvgRespTime] = useState(1.2)
  const [hourlyBars,  setHourlyBars]  = useState<HourlyBar[]>(generateHourlyBars)
  const [refreshKey,  setRefreshKey]  = useState(0)

  const eventIdRef = useRef(0)
  const taskIdRef  = useRef(0)

  /* ── Live clock ── */
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour12: false }))
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])

  /* ── Simulate live metrics every 3s ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setTotalCalls(c => c + Math.floor(Math.random() * 5 + 1))
      setAvgRespTime(t => Math.max(0.8, Math.min(2.5, t + (Math.random() * 0.2 - 0.1))))
      setModels(prev => prev.map(m => ({
        ...m,
        requests: m.requests + Math.floor(Math.random() * 6 + 1),
        latency: Math.max(100, m.latency + (Math.random() * 60 - 30)),
        errorRate: Math.max(0, Math.min(5, m.errorRate + (Math.random() * 0.06 - 0.03))),
      })))

      const model = randomPick(MODEL_NAMES)
      const tool  = randomPick(TOOLS)
      const lat   = Math.floor(Math.random() * 1800 + 120)
      const ok    = Math.random() > 0.03
      setEvents(prev => [{
        id: String(eventIdRef.current++),
        model, tool, latency: lat, ts: Date.now(), ok,
      }, ...prev].slice(0, 60))
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  /* ── Simulate task progression ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setTasks(prev => prev.map(t => {
        if (t.status === 'queued')   return { ...t, status: 'planning',  progress: 10 }
        if (t.status === 'planning') return { ...t, status: 'executing', progress: 30, steps: [...t.steps, 'Decomposed goal into subtasks'] }
        if (t.status === 'executing' && t.progress < 95) {
          const stepTexts = ['Searched web for context', 'Analyzed retrieved data', 'Generated draft output', 'Running quality check', 'Synthesizing final result']
          const newStep = stepTexts[t.steps.length] || 'Processing...'
          return { ...t, progress: Math.min(95, t.progress + 20), steps: [...t.steps, newStep] }
        }
        if (t.status === 'executing' && t.progress >= 95)
          return { ...t, status: 'completed', progress: 100, steps: [...t.steps, 'Task completed successfully'] }
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
    setTasks(prev => [{
      id, goal: goal.trim(), status: 'queued',
      steps: [], progress: 0, createdAt: Date.now(),
      model: randomPick(['Gemini 2.5 Flash', 'Llama 3.3 70B', 'Mistral Small 3.1']),
    }, ...prev])
    setGoal('')
    setDeploying(false)
    toast.success('Agent deployed!', { icon: '🤖' })
    setTab('agents')
  }, [goal])

  const cancelTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id && t.status !== 'completed' ? { ...t, status: 'failed' } : t))
    toast('Task cancelled')
  }

  const handleRefresh = () => {
    setHourlyBars(generateHourlyBars())
    setRefreshKey(k => k + 1)
    toast.success('Dashboard refreshed')
  }

  const totalRequests = models.reduce((s, m) => s + m.requests, 0)
  const activeAgents  = tasks.filter(t => ['queued', 'planning', 'executing'].includes(t.status)).length
  const successRate   = 99.2 - (Math.random() * 0.3)

  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'models',    label: 'Models' },
    { id: 'agents',    label: `Agents${activeAgents ? ` (${activeAgents})` : ''}` },
    { id: 'activity',  label: 'Activity' },
  ] as const

  const maxBar = Math.max(...hourlyBars.map(b => b.count))

  return (
    <>
      <style>{`
        @keyframes counterUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rowIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        .counter-anim { animation: counterUp 0.4s ease forwards; }
        .row-in { animation: rowIn 0.35s ease forwards; }
      `}</style>

      <div className="h-full flex flex-col bg-bg text-text-primary overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight">Pyxis Command Center</h1>
              <p className="text-text-tertiary text-xs">Enterprise AI Operations Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-text-tertiary text-xs font-mono">{clock}</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">System Operational</span>
            </div>
            <button onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary hover:text-text-primary text-xs transition-all">
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-px bg-border flex-shrink-0">
          {[
            {
              label: 'AI Calls Today',
              value: totalCalls.toLocaleString(),
              icon: Activity,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
              sub: `+${Math.floor(totalCalls * 0.04).toLocaleString()} last hour`,
            },
            {
              label: 'Active Models',
              value: '6',
              icon: Cpu,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
              sub: 'All healthy',
            },
            {
              label: 'Avg Response Time',
              value: `${avgRespTime.toFixed(2)}s`,
              icon: Zap,
              color: 'text-yellow-400',
              bg: 'bg-yellow-500/10',
              sub: 'Within SLA target',
            },
            {
              label: 'Success Rate',
              value: `${successRate.toFixed(1)}%`,
              icon: Shield,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
              sub: 'SLA: > 99.0%',
            },
          ].map(s => (
            <div key={s.label} className="bg-bg px-5 py-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-text-tertiary text-xs mb-0.5">{s.label}</p>
                <p className={`font-bold text-xl leading-none counter-anim ${s.color}`} key={`${s.value}-${refreshKey}`}>{s.value}</p>
                <p className="text-text-tertiary text-[10px] mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-border flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.id
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-hidden">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="h-full grid grid-cols-3 gap-px bg-border overflow-hidden">

              {/* Left 2/3: table + chart */}
              <div className="col-span-2 bg-bg flex flex-col overflow-hidden">

                {/* Model performance table */}
                <div className="flex-1 overflow-y-auto p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-3">Model Performance</p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface">
                          <th className="text-left px-4 py-2.5 text-text-tertiary text-xs font-medium">Model</th>
                          <th className="text-right px-4 py-2.5 text-text-tertiary text-xs font-medium">Requests</th>
                          <th className="text-right px-4 py-2.5 text-text-tertiary text-xs font-medium">Avg Latency</th>
                          <th className="text-right px-4 py-2.5 text-text-tertiary text-xs font-medium">Error Rate</th>
                          <th className="text-center px-4 py-2.5 text-text-tertiary text-xs font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {models.map((m, i) => {
                          const pct = Math.round((m.requests / totalRequests) * 100)
                          return (
                            <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors group">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-base">{m.emoji}</span>
                                  <div>
                                    <p className="text-text-primary text-xs font-medium">{m.name}</p>
                                    <p className="text-text-tertiary text-[10px]">{m.provider}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <p className="text-text-primary text-xs font-bold">{m.requests.toLocaleString()}</p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <div className="h-1 rounded-full overflow-hidden w-16 bg-surface-hover">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: m.accentColor }} />
                                  </div>
                                  <span className="text-text-tertiary text-[9px]">{pct}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-xs font-bold ${m.latency < 500 ? 'text-emerald-400' : m.latency < 1000 ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {Math.round(m.latency)}ms
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-xs ${m.errorRate < 0.5 ? 'text-emerald-400' : m.errorRate < 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {m.errorRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  <span className="text-emerald-400 text-[10px]">Live</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Usage chart */}
                <div className="p-5 border-t border-border flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Hourly Usage (last 12h)</p>
                    <span className="text-text-tertiary text-[10px]">Requests / hour</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-20">
                    {hourlyBars.map((bar, i) => {
                      const heightPct = Math.round((bar.count / maxBar) * 100)
                      const isRecent = i >= 10
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div
                            title={`${bar.hour}:00 — ${bar.count} requests`}
                            style={{ height: `${heightPct}%`, minHeight: 4, transition: 'height 0.5s ease' }}
                            className={`w-full rounded-sm cursor-pointer ${isRecent ? 'bg-indigo-500' : 'bg-indigo-500/35'} hover:bg-indigo-400 transition-colors`}
                          />
                          <span className="text-[9px] text-text-tertiary">{bar.hour.toString().padStart(2,'0')}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right: live feed + agent queue */}
              <div className="bg-bg flex flex-col overflow-hidden">

                {/* Live activity feed */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Live Activity</p>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 text-[10px]">Live</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {events.slice(0, 20).map((ev, i) => (
                      <div key={ev.id} className="row-in flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0"
                        style={{ opacity: 1 - i * 0.04 }}>
                        <span className={`text-xs flex-shrink-0 ${ev.ok ? 'text-emerald-400' : 'text-red-400'}`}>{ev.ok ? '✅' : '❌'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-[11px] font-medium truncate">{ev.model}</p>
                          <p className="text-text-tertiary text-[10px] truncate">→ {ev.tool}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-[10px] font-mono ${ev.latency < 500 ? 'text-emerald-400' : ev.latency < 1000 ? 'text-yellow-400' : 'text-orange-400'}`}>
                            {ev.latency}ms
                          </p>
                          <p className="text-text-tertiary text-[9px]">{fmtTime(ev.ts)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent queue */}
                <div className="p-4 border-t border-border flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Agent Queue</p>
                    {activeAgents > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 rounded font-medium">
                        {activeAgents} running
                      </span>
                    )}
                  </div>
                  {tasks.length === 0 ? (
                    <div className="text-center py-4">
                      <Bot className="w-6 h-6 text-text-tertiary mx-auto mb-1.5" />
                      <p className="text-text-tertiary text-[10px]">No agents running</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {tasks.slice(0, 5).map(t => {
                        const s = STATUS_STYLES[t.status]
                        return (
                          <div key={t.id} className="bg-surface border border-border rounded-lg p-2.5">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                              <p className="text-text-primary text-[11px] font-medium truncate flex-1">{t.goal}</p>
                              <span className={`text-[9px] px-1 py-0.5 rounded capitalize ${s.text} ${s.bg}`}>{t.status}</span>
                            </div>
                            {t.status !== 'queued' && (
                              <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                                  style={{ width: `${t.progress}%` }} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODELS */}
          {tab === 'models' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4 max-w-4xl">
                {models.map(m => (
                  <div key={m.id} className="bg-surface border border-border rounded-2xl p-5 hover:border-indigo-500/25 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{m.emoji}</span>
                        <div>
                          <p className="text-text-primary font-semibold text-sm">{m.name}</p>
                          <p className="text-text-tertiary text-xs">{m.provider}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 text-[10px]">Live</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: 'Requests', value: m.requests.toLocaleString(), color: 'text-text-primary' },
                        { label: 'Avg Latency', value: `${Math.round(m.latency)}ms`, color: m.latency < 500 ? 'text-emerald-400' : m.latency < 1200 ? 'text-yellow-400' : 'text-orange-400' },
                        { label: 'Error Rate', value: `${m.errorRate.toFixed(1)}%`, color: m.errorRate < 0.5 ? 'text-emerald-400' : 'text-yellow-400' },
                      ].map(s => (
                        <div key={s.label} className="bg-bg rounded-xl p-3 text-center">
                          <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
                          <p className="text-text-tertiary text-[10px] mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="relative h-1.5 bg-surface-hover rounded-full overflow-hidden">
                      <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((m.requests / totalRequests) * 100)}%`, background: `linear-gradient(90deg, ${m.accentColor}80, ${m.accentColor})` }} />
                    </div>
                    <p className="text-text-tertiary text-[10px] mt-1">{Math.round((m.requests / totalRequests) * 100)}% of total traffic</p>
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
                  <div className="flex-1">
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
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Live Activity Log</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-xs">Streaming</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {events.slice(0, 50).map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-surface-hover px-2 rounded-lg transition-colors">
                      <span className="text-xs flex-shrink-0">{ev.ok ? '✅' : '❌'}</span>
                      <span className="text-text-tertiary text-xs font-mono flex-shrink-0 w-20">{fmtTime(ev.ts)}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-text-primary text-xs font-medium">{ev.model}</span>
                        <span className="text-text-tertiary text-xs"> → </span>
                        <span className="text-text-secondary text-xs">"{ev.tool}"</span>
                      </div>
                      <span className={`text-xs font-mono flex-shrink-0 ${ev.latency < 500 ? 'text-emerald-400' : ev.latency < 1000 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {ev.latency}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Quick Actions toolbar ── */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-t border-border flex-shrink-0 bg-bg overflow-x-auto">
          <p className="text-text-tertiary text-xs flex-shrink-0 font-medium">Quick launch:</p>
          {TOOL_LINKS.map(t => (
            <a key={t.href} href={t.href}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary transition-all flex-shrink-0 whitespace-nowrap group">
              <t.icon className={`w-3 h-3 ${t.color}`} />
              {t.label}
              <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
            </a>
          ))}
        </div>
      </div>
    </>
  )
}
