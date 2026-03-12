'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Command,
  Globe2,
  Lock,
  Network,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
  Workflow,
} from 'lucide-react'

const ROUTE_HISTORY_KEY = 'pyxis_recent_routes'

type LaunchModule = {
  title: string
  href: string
  description: string
  tag: string
  stat: string
  icon: typeof Command
}

const LAUNCH_MODULES: LaunchModule[] = [
  {
    title: 'AI Chat',
    href: '/chat',
    description: 'Run high-speed multimodel conversations with streamed responses and provider fallback.',
    tag: 'Core surface',
    stat: '4 model lanes',
    icon: Sparkles,
  },
  {
    title: 'Command Center',
    href: '/tools/command-center',
    description: 'Watch your model mesh, agent throughput, and live system events from one cockpit.',
    tag: 'Operations',
    stat: '24 live events',
    icon: Radar,
  },
  {
    title: 'Research Studio',
    href: '/tools/research',
    description: 'Run live-search research and turn sources into exportable competitive briefs.',
    tag: 'Flagship new',
    stat: 'Cited briefs',
    icon: Search,
  },
  {
    title: 'Agent Fleet',
    href: '/tools/agents',
    description: 'Deploy specialist agents across research, content, analysis, and execution workflows.',
    tag: 'Autonomous',
    stat: '12 agents',
    icon: Bot,
  },
  {
    title: 'Workflow Builder',
    href: '/tools/workflow',
    description: 'Chain models, tools, and approval logic into reusable AI runbooks.',
    tag: 'Automation',
    stat: '8 templates',
    icon: Workflow,
  },
  {
    title: 'Knowledge Mesh',
    href: '/tools/rag',
    description: 'Ground responses in your files, documents, and project context with retrieval.',
    tag: 'Memory',
    stat: 'Source-aware answers',
    icon: BrainCircuit,
  },
  {
    title: 'Code Studio',
    href: '/tools/code',
    description: 'Generate, inspect, and refine code inside the same enterprise AI workspace.',
    tag: 'Builder mode',
    stat: '50+ languages',
    icon: Wand2,
  },
]

const ENTERPRISE_SIGNALS = [
  {
    title: 'Model Mesh',
    value: 'Healthy',
    detail: 'Gemini, Groq, Together, Mistral, and OpenRouter lanes ready for routing.',
    icon: Network,
  },
  {
    title: 'Governance',
    value: 'Guarded',
    detail: 'Identity, project isolation, and token-aware APIs form the current control baseline.',
    icon: ShieldCheck,
  },
  {
    title: 'Retrieval',
    value: 'Indexed',
    detail: 'Document intelligence, search, and project memory are ready to expand into a full knowledge fabric.',
    icon: Search,
  },
  {
    title: 'Global UX',
    value: 'Immersive',
    detail: 'The upgraded shell now looks like a real AI command platform rather than a plain tool grid.',
    icon: Globe2,
  },
]

const OPS_FEED = [
  'Agent deployment lane active and ready for multi-step runbooks.',
  'Prompt, code, media, voice, and search surfaces remain available inside the same workspace shell.',
  'Firebase-backed identity and persisted user state continue to support the upgraded front-end.',
  'The platform story now aligns more closely with enterprise AI operating systems and control towers.',
]

export default function HubPage() {
  const router = useRouter()
  const [recentRoutes, setRecentRoutes] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROUTE_HISTORY_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setRecentRoutes(parsed.filter((route): route is string => typeof route === 'string'))
        }
      }
    } catch {
      setRecentRoutes([])
    }
  }, [])

  const featuredMomentum = useMemo(() => {
    const recentSet = new Set(recentRoutes)
    const recent = LAUNCH_MODULES.filter((module) => recentSet.has(module.href))
    return recent.length > 0 ? recent.slice(0, 3) : LAUNCH_MODULES.slice(0, 3)
  }, [recentRoutes])

  const launch = (module: LaunchModule) => {
    try {
      const next = [module.href, ...recentRoutes.filter((route) => route !== module.href)].slice(0, 6)
      localStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(next))
      setRecentRoutes(next)
    } catch {}
    router.push(module.href)
  }

  return (
    <div className="min-h-full overflow-y-auto px-4 pb-8 pt-4 sm:px-6 lg:px-7 xl:px-8">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section className="panel overflow-hidden rounded-[32px]">
          <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(400px,0.84fr)] xl:p-7 2xl:grid-cols-[minmax(0,1.22fr)_minmax(420px,0.78fr)]">
            <div>
              <div className="pill mb-5 text-sm text-text-secondary">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)]" />
                Control Tower live
              </div>
              <h1 className="font-display text-[clamp(2.9rem,4.7vw,5rem)] leading-[0.95] text-text-primary">
                Welcome to the upgraded <span className="text-gradient">Pyxis One</span> workspace.
              </h1>
              <p className="mt-4 max-w-3xl text-[15px] leading-7 text-text-secondary sm:text-base sm:leading-8 lg:max-w-2xl">
                This hub is now the front door to a larger AI operating system: an executive-style launch surface for chat, agents, workflows, knowledge, media, and model operations.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ['17+', 'Integrated AI surfaces'],
                  ['5', 'Provider lanes currently wired in'],
                  ['1', 'Unified operational shell'],
                ].map(([value, label]) => (
                  <div key={label} className="metric-card rounded-[28px] p-4">
                    <p className="font-display text-[clamp(2rem,2.8vw,3rem)] leading-none text-text-primary">{value}</p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {ENTERPRISE_SIGNALS.map((signal) => (
                <div key={signal.title} className="glass-panel rounded-[26px] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8">
                      <signal.icon className="text-cyan-300" size={20} />
                    </div>
                    <span className="pill text-xs text-cyan-200">{signal.value}</span>
                  </div>
                  <p className="mt-4 font-display text-[clamp(1.55rem,2vw,2rem)] text-text-primary">{signal.title}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{signal.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-text-tertiary">Launch surfaces</p>
                <h2 className="mt-2 font-display text-[clamp(2rem,2.4vw,2.8rem)] leading-tight text-text-primary">Start from the right operational lane.</h2>
              </div>
              <button
                onClick={() => router.push('/tools/command-center')}
                className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
              >
                Open control center
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {LAUNCH_MODULES.map((module) => (
                <button
                  key={module.href}
                  onClick={() => launch(module)}
                  className="panel group rounded-[28px] p-5 text-left transition-transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8">
                      <module.icon className="text-cyan-300" size={20} />
                    </div>
                    <span className="pill text-xs text-text-secondary">{module.tag}</span>
                  </div>
                  <h3 className="mt-5 font-display text-[clamp(1.45rem,1.8vw,2rem)] text-text-primary">{module.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{module.description}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-text-primary">{module.stat}</span>
                    <span className="inline-flex items-center gap-1 text-sm text-text-tertiary transition-colors group-hover:text-text-primary">
                      Launch
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel rounded-[28px] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-text-tertiary">Momentum</p>
                  <h2 className="mt-2 font-display text-[clamp(2rem,2.3vw,2.7rem)] leading-tight text-text-primary">Continue from your strongest surfaces.</h2>
                </div>
                <Activity className="text-cyan-300" size={18} />
              </div>

              <div className="mt-5 space-y-3">
                {featuredMomentum.map((module, index) => (
                  <button
                    key={module.href}
                    onClick={() => launch(module)}
                    className="flex w-full items-center gap-3 rounded-[20px] border border-border/80 bg-white/5 px-4 py-3.5 text-left transition-colors hover:bg-white/8"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-text-primary">
                      <module.icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">{module.title}</p>
                      <p className="mt-1 text-xs text-text-tertiary">
                        {index === 0 ? 'Recommended next action' : 'Recent high-value surface'}
                      </p>
                    </div>
                    <ArrowRight className="text-text-tertiary" size={16} />
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-[28px] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-text-tertiary">Ops feed</p>
                  <h3 className="mt-2 font-display text-[clamp(1.8rem,2vw,2.3rem)] text-text-primary">System narrative</h3>
                </div>
                <Lock className="text-cyan-300" size={18} />
              </div>
              <div className="mt-4 space-y-3">
                {OPS_FEED.map((item) => (
                  <div key={item} className="flex gap-3 rounded-[20px] bg-white/5 px-4 py-3.5">
                    <CheckCircle2 className="mt-0.5 text-emerald-300" size={18} />
                    <p className="text-sm leading-6 text-text-secondary">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
