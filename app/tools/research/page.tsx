'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  FileText,
  Globe2,
  Layers,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

type SearchResult = {
  title: string
  snippet: string
  url: string
}

const DEPTH_OPTIONS = [
  { id: 'rapid', label: 'Rapid scan', detail: 'Fast briefing with the clearest signals.' },
  { id: 'strategic', label: 'Strategic brief', detail: 'Balanced synthesis with opportunities and risks.' },
  { id: 'exhaustive', label: 'Deep dossier', detail: 'Long-form research memo with scenarios and next actions.' },
] as const

const DELIVERABLE_OPTIONS = [
  { id: 'executive', label: 'Executive brief', icon: Briefcase },
  { id: 'market', label: 'Market map', icon: Globe2 },
  { id: 'competitive', label: 'Competitive memo', icon: Target },
  { id: 'product', label: 'Product insight pack', icon: Layers },
] as const

const STARTERS = [
  'Compare the best enterprise AI assistants in 2026',
  'How should we position an AI operating system against ChatGPT and Gemini?',
  'What are the biggest gaps in today’s AI productivity products?',
  'Research the future of deep research and agentic workflows',
]

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function buildPrompt({
  topic,
  objective,
  depth,
  deliverable,
  sources,
}: {
  topic: string
  objective: string
  depth: (typeof DEPTH_OPTIONS)[number]['id']
  deliverable: (typeof DELIVERABLE_OPTIONS)[number]['id']
  sources: SearchResult[]
}) {
  const sourceBlock = sources
    .map((source, index) => `[${index + 1}] ${source.title}\n${source.snippet}\nURL: ${source.url}`)
    .join('\n\n')

  const depthInstruction =
    depth === 'rapid'
      ? 'Keep this sharp and high-signal. Focus on the most important findings only.'
      : depth === 'strategic'
        ? 'Provide balanced strategic analysis with implications, risks, and opportunities.'
        : 'Be exhaustive and structured. Include assumptions, scenarios, and a high-confidence point of view.'

  const deliverableInstruction =
    deliverable === 'executive'
      ? 'Format as an executive brief with a concise summary, strategic insights, risks, and recommended actions.'
      : deliverable === 'market'
        ? 'Format as a market map with category framing, competitive clusters, whitespace, and key differentiators.'
        : deliverable === 'competitive'
          ? 'Format as a competitive memo with direct comparisons, strengths, weaknesses, gaps, and positioning opportunities.'
          : 'Format as a product insight pack with user needs, feature opportunities, product bets, and launch implications.'

  return `Research topic: ${topic}

Research objective: ${objective || 'Identify the strongest strategic insights and synthesize them into a decision-ready document.'}

Instructions:
- ${depthInstruction}
- ${deliverableInstruction}
- Cite sources inline using [1], [2], [3] format.
- Separate facts from interpretation.
- End with a "Recommended Next Moves" section.

Web source snippets:
${sourceBlock}`
}

export default function ResearchPage() {
  const [topic, setTopic] = useState('')
  const [objective, setObjective] = useState('')
  const [depth, setDepth] = useState<(typeof DEPTH_OPTIONS)[number]['id']>('strategic')
  const [deliverable, setDeliverable] = useState<(typeof DELIVERABLE_OPTIONS)[number]['id']>('competitive')
  const [sources, setSources] = useState<SearchResult[]>([])
  const [report, setReport] = useState('')
  const [followUps, setFollowUps] = useState<string[]>([])
  const [phase, setPhase] = useState<'idle' | 'collecting' | 'synthesizing'>('idle')

  const stages = useMemo(() => [
    {
      title: 'Discover',
      description: 'Gather live web signals and competitive references.',
      active: phase === 'collecting',
      complete: phase === 'synthesizing' || (!!report && phase === 'idle'),
      icon: Search,
    },
    {
      title: 'Synthesize',
      description: 'Transform sources into a point of view with citations.',
      active: phase === 'synthesizing',
      complete: !!report && phase === 'idle',
      icon: BrainCircuit,
    },
    {
      title: 'Deliver',
      description: 'Export an executive-ready research asset.',
      active: false,
      complete: !!report && phase === 'idle',
      icon: FileText,
    },
  ], [phase, report])

  const activeDeliverable = DELIVERABLE_OPTIONS.find((option) => option.id === deliverable)

  const runResearch = async (seed?: string) => {
    const nextTopic = (seed ?? topic).trim()
    if (!nextTopic) {
      toast.error('Enter a research topic first.')
      return
    }

    setTopic(nextTopic)
    setPhase('collecting')
    setReport('')
    setSources([])
    setFollowUps([])

    try {
      const searchRes = await fetch(`/api/search?q=${encodeURIComponent(nextTopic)}`)
      const searchData = await searchRes.json()
      const webSources: SearchResult[] = searchData.results || []

      if (!webSources.length) {
        toast.error('No sources found. Try a broader topic.')
        setPhase('idle')
        return
      }

      setSources(webSources)
      setPhase('synthesizing')

      const synthesisRes = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'You are a world-class research strategist. Produce crisp, original, structured research deliverables that feel useful to a founder, product lead, or enterprise buyer.',
          messages: [
            {
              role: 'user',
              content: buildPrompt({
                topic: nextTopic,
                objective,
                depth,
                deliverable,
                sources: webSources,
              }),
            },
          ],
          stream: false,
        }),
      })
      const synthesisData = await synthesisRes.json()
      const content = synthesisData.content || synthesisData.error || 'No report generated.'
      setReport(content)

      const followUpRes = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'Generate exactly 4 short follow-up research questions. Return only a JSON array of strings. Keep each under 10 words.',
          messages: [
            {
              role: 'user',
              content: `Topic: ${nextTopic}\nObjective: ${objective || 'Competitive product strategy'}\nReport excerpt: ${content.slice(0, 900)}`,
            },
          ],
          stream: false,
        }),
      })
      const followUpData = await followUpRes.json()
      const jsonMatch = (followUpData.content || '').match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed)) {
          setFollowUps(parsed.filter((item): item is string => typeof item === 'string').slice(0, 4))
        }
      }

      toast.success('Research report ready.')
    } catch {
      toast.error('Research run failed. Please try again.')
    } finally {
      setPhase('idle')
    }
  }

  const copyReport = async () => {
    if (!report) return
    await navigator.clipboard.writeText(report)
    toast.success('Report copied.')
  }

  const downloadReport = () => {
    if (!report) return
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pyxis-research-report.md'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded.')
  }

  return (
    <div className="h-full overflow-y-auto bg-bg text-text-primary">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 sm:px-7 lg:px-8">
        <section className="panel overflow-hidden rounded-[34px]">
          <div className="grid gap-8 p-7 lg:grid-cols-[0.9fr_1.1fr] lg:p-9">
            <div>
              <div className="pill mb-5 text-sm text-text-secondary">
                <Globe2 size={14} />
                New flagship surface
              </div>
              <h1 className="font-display text-4xl leading-tight text-text-primary sm:text-5xl">
                Deep Research Studio
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-text-secondary">
                A stronger competitive surface for Pyxis: live source discovery, AI synthesis, executive-ready briefing output,
                and product strategy workflows in one experience.
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {[
                  ['Live web signals', 'Search-backed inputs'],
                  ['Cited synthesis', 'Decision-ready output'],
                  ['Exportable brief', 'Markdown-ready'],
                ].map(([title, description]) => (
                  <div key={title} className="metric-card rounded-3xl p-4">
                    <p className="font-semibold text-text-primary">{title}</p>
                    <p className="mt-2 text-sm text-text-secondary">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {stages.map((stage) => (
                <div
                  key={stage.title}
                  className={`rounded-[24px] border p-5 transition-colors ${
                    stage.active
                      ? 'border-cyan-400/40 bg-cyan-400/10'
                      : stage.complete
                        ? 'border-emerald-400/30 bg-emerald-400/10'
                        : 'border-border/80 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                      <stage.icon size={18} className={stage.complete ? 'text-emerald-300' : stage.active ? 'text-cyan-300' : 'text-text-secondary'} />
                    </div>
                    {stage.complete ? (
                      <CheckCircle2 size={18} className="text-emerald-300" />
                    ) : stage.active ? (
                      <Loader2 size={18} className="animate-spin text-cyan-300" />
                    ) : (
                      <Clock3 size={18} className="text-text-tertiary" />
                    )}
                  </div>
                  <p className="mt-5 font-display text-2xl text-text-primary">{stage.title}</p>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">{stage.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <aside className="space-y-6">
            <section className="panel rounded-[30px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-text-tertiary">Research setup</p>
                  <h2 className="mt-2 font-display text-3xl text-text-primary">Define the mission.</h2>
                </div>
                <ShieldCheck className="text-cyan-300" size={18} />
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">
                    Topic
                  </label>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Example: Compare Pyxis against ChatGPT, Gemini, Claude, and Perplexity"
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">
                    Objective
                  </label>
                  <textarea
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    rows={4}
                    placeholder="Example: Identify product gaps, positioning advantages, and the highest-value new features for Pyxis."
                    className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary"
                  />
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-[30px] p-6">
              <p className="text-sm uppercase tracking-[0.28em] text-text-tertiary">Depth</p>
              <div className="mt-4 space-y-3">
                {DEPTH_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setDepth(option.id)}
                    className={`w-full rounded-[22px] border px-4 py-4 text-left transition-colors ${
                      depth === option.id ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-border/80 bg-white/5 hover:bg-white/8'
                    }`}
                  >
                    <p className="text-sm font-semibold text-text-primary">{option.label}</p>
                    <p className="mt-1 text-xs leading-6 text-text-secondary">{option.detail}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="glass-panel rounded-[30px] p-6">
              <p className="text-sm uppercase tracking-[0.28em] text-text-tertiary">Deliverable</p>
              <div className="mt-4 grid gap-3">
                {DELIVERABLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setDeliverable(option.id)}
                    className={`flex items-center gap-3 rounded-[22px] border px-4 py-4 text-left transition-colors ${
                      deliverable === option.id ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-border/80 bg-white/5 hover:bg-white/8'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                      <option.icon size={16} className="text-cyan-300" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">{option.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <main className="space-y-6">
            <section className="panel rounded-[30px] p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-text-tertiary">Research run</p>
                  <h2 className="mt-2 font-display text-3xl text-text-primary">
                    {activeDeliverable?.label || 'Executive brief'}
                  </h2>
                </div>
                <button
                  onClick={() => runResearch()}
                  disabled={phase !== 'idle'}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.02] disabled:opacity-50"
                >
                  {phase === 'idle' ? <Sparkles size={16} /> : <Loader2 size={16} className="animate-spin" />}
                  {phase === 'idle' ? 'Run deep research' : phase === 'collecting' ? 'Collecting sources' : 'Synthesizing brief'}
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => runResearch(starter)}
                    className="flex items-center gap-3 rounded-[22px] border border-border/80 bg-white/5 px-4 py-4 text-left transition-colors hover:bg-white/8"
                  >
                    <Target size={16} className="text-cyan-300" />
                    <span className="text-sm leading-6 text-text-secondary">{starter}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel rounded-[30px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-text-tertiary">Research output</p>
                  <h3 className="mt-2 font-display text-3xl text-text-primary">Decision-ready report</h3>
                </div>
                {report && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyReport}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                    <button
                      onClick={downloadReport}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
                    >
                      <Download size={14} />
                      Export
                    </button>
                  </div>
                )}
              </div>

              {report ? (
                <div className="mt-6 rounded-[24px] border border-border/80 bg-white/5 px-6 py-5">
                  <div className="markdown-body text-sm text-text-primary">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[24px] border border-dashed border-border px-6 py-14 text-center">
                  <FileText className="mx-auto text-text-tertiary" size={28} />
                  <p className="mt-4 font-semibold text-text-primary">No report yet</p>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">
                    Pick a topic, choose a deliverable, and run research to generate a competitive, export-ready memo.
                  </p>
                </div>
              )}
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="glass-panel rounded-[30px] p-6">
                <p className="text-sm uppercase tracking-[0.28em] text-text-tertiary">Source stack</p>
                <div className="mt-5 space-y-3">
                  {sources.length === 0 ? (
                    <p className="text-sm text-text-secondary">No sources collected yet.</p>
                  ) : (
                    sources.map((source, index) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 rounded-[22px] border border-border/80 bg-white/5 px-4 py-4 transition-colors hover:bg-white/8"
                      >
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/15 text-[11px] font-semibold text-cyan-200">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-primary">{source.title}</p>
                          <p className="mt-1 text-xs text-text-tertiary">{getDomain(source.url)}</p>
                          <p className="mt-2 text-sm leading-6 text-text-secondary">{source.snippet}</p>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-panel rounded-[30px] p-6">
                <p className="text-sm uppercase tracking-[0.28em] text-text-tertiary">Next angles</p>
                <div className="mt-5 space-y-3">
                  {followUps.length === 0 ? (
                    <p className="text-sm text-text-secondary">Run one report to generate next-step research angles.</p>
                  ) : (
                    followUps.map((question) => (
                      <button
                        key={question}
                        onClick={() => runResearch(question)}
                        className="flex w-full items-center gap-3 rounded-[22px] border border-border/80 bg-white/5 px-4 py-4 text-left transition-colors hover:bg-white/8"
                      >
                        <ArrowRight size={15} className="text-cyan-300" />
                        <span className="text-sm leading-6 text-text-secondary">{question}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
