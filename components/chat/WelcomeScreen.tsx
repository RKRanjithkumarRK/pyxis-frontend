'use client'

import { useState, useEffect } from 'react'
import { Pencil, Code2, FileSearch, Lightbulb, Mail, BookOpen, Map, Globe, Radar, Workflow } from 'lucide-react'

const CAPABILITY_PILLS = ['Write', 'Code', 'Analyze', 'Research', 'Strategize', 'Summarize', 'Translate', 'Debug', 'Automate']

const PROMPT_CARDS = [
  {
    icon: Mail,
    title: 'Write a cold email',
    subtitle: 'To a potential client or investor',
    prompt: 'Help me write a compelling cold email to a potential client for my business.',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    iconColor: 'text-blue-400',
    borderHover: 'hover:border-blue-500/50',
  },
  {
    icon: Code2,
    title: 'Debug my code',
    subtitle: 'Paste code and describe the issue',
    prompt: 'Help me debug this code. I\'ll paste it below and describe what\'s going wrong.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-400',
    borderHover: 'hover:border-emerald-500/50',
  },
  {
    icon: FileSearch,
    title: 'Summarize an article',
    subtitle: 'Paste text and get key points',
    prompt: 'Please summarize the following article and extract the key points and insights.',
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
    borderHover: 'hover:border-amber-500/50',
  },
  {
    icon: Radar,
    title: 'Run deep research',
    subtitle: 'Competitive research with cited sources',
    prompt: 'Help me perform deep research on a topic and structure the findings into a competitive brief with key insights, risks, and next moves.',
    gradient: 'from-cyan-500/20 to-indigo-500/20',
    iconColor: 'text-cyan-400',
    borderHover: 'hover:border-cyan-500/50',
  },
  {
    icon: Map,
    title: 'Build a roadmap',
    subtitle: 'For a product, project or goal',
    prompt: 'Help me build a detailed roadmap for my project. I\'ll describe what I\'m working on.',
    gradient: 'from-purple-500/20 to-violet-500/20',
    iconColor: 'text-purple-400',
    borderHover: 'hover:border-purple-500/50',
  },
  {
    icon: BookOpen,
    title: 'Explain a concept',
    subtitle: 'Like I\'m 5 or like an expert',
    prompt: 'Explain the following concept to me — start simple, then go deeper if I ask.',
    gradient: 'from-rose-500/20 to-pink-500/20',
    iconColor: 'text-rose-400',
    borderHover: 'hover:border-rose-500/50',
  },
  {
    icon: Lightbulb,
    title: 'Brainstorm ideas',
    subtitle: 'For any project or challenge',
    prompt: 'Help me brainstorm creative ideas for my project. Here\'s what I\'m working on:',
    gradient: 'from-yellow-500/20 to-amber-500/20',
    iconColor: 'text-yellow-400',
    borderHover: 'hover:border-yellow-500/50',
  },
  {
    icon: Pencil,
    title: 'Write a LinkedIn post',
    subtitle: 'Thought leadership content',
    prompt: 'Help me write an engaging LinkedIn post on a topic I care about. I\'ll share the topic.',
    gradient: 'from-sky-500/20 to-blue-500/20',
    iconColor: 'text-sky-400',
    borderHover: 'hover:border-sky-500/50',
  },
  {
    icon: Globe,
    title: 'Create a study plan',
    subtitle: 'For any subject or exam',
    prompt: 'Help me create a structured study plan. I\'ll tell you what I\'m studying and my timeline.',
    gradient: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-400',
    borderHover: 'hover:border-cyan-500/50',
  },
  {
    icon: Workflow,
    title: 'Design a workflow',
    subtitle: 'Turn a task into an AI system',
    prompt: 'Help me design an AI workflow with triggers, steps, decision points, and outputs for this business process.',
    gradient: 'from-fuchsia-500/20 to-violet-500/20',
    iconColor: 'text-fuchsia-400',
    borderHover: 'hover:border-fuchsia-500/50',
  },
]

const PROVIDERS = [
  { name: 'Gemini 2.5', color: 'bg-blue-500' },
  { name: 'Llama 3.3', color: 'bg-orange-500' },
  { name: 'Mistral', color: 'bg-rose-500' },
  { name: 'DeepSeek', color: 'bg-emerald-500' },
]

interface Props {
  onSend?: (text: string) => void
}

export default function WelcomeScreen({ onSend }: Props) {
  const [activePill, setActivePill] = useState(0)
  const [cardOffset] = useState(() => Math.floor(Math.random() * PROMPT_CARDS.length))

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePill(prev => (prev + 1) % CAPABILITY_PILLS.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  const visibleCards = Array.from({ length: 4 }, (_, i) => PROMPT_CARDS[(cardOffset + i) % PROMPT_CARDS.length])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10 gap-8 overflow-y-auto">

      {/* Animated heading */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight animate-shimmer bg-gradient-to-r from-text-primary via-accent to-text-primary bg-[length:200%_auto] bg-clip-text text-transparent">
          Launch your next move.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-text-secondary">
          Pyxis One now supports faster chat, deeper research, stronger strategy work, and multi-step AI execution from one workspace.
        </p>

        {/* Rotating capability pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          {CAPABILITY_PILLS.map((pill, i) => (
            <span
              key={pill}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-all duration-500 ${
                i === activePill
                  ? 'bg-accent/15 border-accent/50 text-accent scale-105'
                  : 'bg-surface border-border/40 text-text-tertiary'
              }`}
            >
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* Prompt cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {visibleCards.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.title}
              onClick={() => onSend?.(card.prompt)}
              className={`group relative flex items-start gap-3 p-4 rounded-2xl bg-surface border border-border/60 ${card.borderHover} hover:bg-surface-hover text-left transition-all duration-200 hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5`}
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />

              <div className={`relative shrink-0 p-2 rounded-xl bg-surface-hover group-hover:bg-white/5 transition-colors`}>
                <Icon size={18} className={card.iconColor} />
              </div>

              <div className="relative min-w-0">
                <div className="text-sm font-semibold text-text-primary">{card.title}</div>
                <div className="text-xs text-text-tertiary mt-0.5 leading-relaxed">{card.subtitle}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Bottom provider strip */}
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        <span>Powered by</span>
        {PROVIDERS.map((p, i) => (
          <span key={p.name} className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${p.color} opacity-80`} />
            <span>{p.name}</span>
            {i < PROVIDERS.length - 1 && <span className="text-border ml-1">·</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
