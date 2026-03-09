'use client'
import { useState } from 'react'
import { Code2, Send, Loader2, Copy, Check, Clapperboard, Layers } from 'lucide-react'

const MODES = [
  {
    id: 'code',
    label: 'Code Generator',
    icon: Code2,
    color: 'from-green-500 to-emerald-500',
    placeholder: 'Describe what you want to build…  e.g. "A REST API in FastAPI that handles user auth with JWT"',
    system: `You are an expert software engineer. Generate clean, well-commented, production-ready code. Always:
- Include all imports/dependencies
- Add brief inline comments
- Show a usage example at the end
- Mention the language/framework at the top`,
  },
  {
    id: 'saas',
    label: 'SaaS Architect',
    icon: Layers,
    color: 'from-slate-500 to-gray-600',
    placeholder: 'Describe your SaaS idea…  e.g. "AI-powered resume builder with subscription payments"',
    system: `You are a senior SaaS architect and startup advisor. When given a SaaS idea, provide:
1. **Tech Stack** — frontend, backend, database, auth, payments
2. **Core Features** — MVP features (prioritized)
3. **Database Schema** — key tables/collections
4. **API Endpoints** — RESTful design
5. **Monetization** — pricing tiers and strategy
6. **Launch Checklist** — step-by-step to go live
Be specific, practical, and startup-focused.`,
  },
  {
    id: 'video',
    label: 'Video Script',
    icon: Clapperboard,
    color: 'from-red-500 to-pink-500',
    placeholder: 'Describe your video topic…  e.g. "YouTube tutorial: How to build an AI chatbot in 10 minutes"',
    system: `You are a professional YouTube scriptwriter and content strategist. Create compelling video scripts with:
- **Hook** (first 15 seconds to grab attention)
- **Intro** (problem statement + what they'll learn)
- **Main Content** (broken into clear sections with timestamps)
- **B-roll suggestions** (visual cues)
- **CTA** (like, subscribe, comment prompt)
- **Title options** (5 clickbait-worthy titles)
- **Description** (SEO-optimized)
Write in a conversational, engaging tone.`,
  },
]

export default function CodePage() {
  const [mode, setMode] = useState(MODES[0])
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [copied, setCopied] = useState(false)

  const run = async () => {
    if (!input.trim() || streaming) return
    setOutput('')
    setStreaming(true)

    const controller = new AbortController()
    // 60s timeout — code generation can be long
    const timer = setTimeout(() => controller.abort(), 60000)

    try {
      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemPrompt: mode.system,
          messages: [{ role: 'user', content: input.trim() }],
          stream: false,   // reliable JSON — no SSE buffering issues
        }),
      })

      clearTimeout(timer)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const text = data.content || data.error || '⚠️ Empty response from AI.'
      setOutput(text)
    } catch (e: any) {
      clearTimeout(timer)
      if (e.name === 'AbortError') {
        setOutput('⏱ Timed out after 60s. The AI may be busy — please try again.')
      } else {
        setOutput('⚠️ Error connecting to AI. Please try again.')
      }
    } finally {
      setStreaming(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1f1f2e] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 bg-gradient-to-br ${mode.color} rounded-lg flex items-center justify-center`}>
              <mode.icon className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-semibold text-white">{mode.label}</h1>
            <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Free</span>
          </div>
          {/* Mode tabs */}
          <div className="flex gap-1 bg-[#111118] border border-[#2a2a3e] rounded-xl p-1">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m); setOutput(''); setInput('') }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mode.id === m.id ? 'bg-[#2a2a3e] text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <m.icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Input */}
          <div className="mb-6">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run() }}
              placeholder={mode.placeholder}
              rows={4}
              className="w-full bg-[#111118] border border-[#2a2a3e] focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none resize-none transition-all"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-zinc-600">Press Ctrl+Enter to generate</p>
              <button
                onClick={run}
                disabled={streaming || !input.trim()}
                className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${mode.color} disabled:opacity-50 rounded-xl text-sm font-medium transition-all hover:opacity-90`}
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {streaming ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Quick prompts — hidden while generating or output is shown */}
          {!output && !streaming && (
            <div className="mb-6">
              <p className="text-xs text-zinc-600 uppercase tracking-wider mb-3">Quick Start</p>
              <div className="flex flex-wrap gap-2">
                {mode.id === 'code' && [
                  'Next.js 14 dashboard with auth and dark mode',
                  'FastAPI CRUD API with SQLite',
                  'Python web scraper with BeautifulSoup',
                  'React custom hooks for data fetching',
                  'Stripe payment integration in Node.js',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="px-3 py-1.5 bg-[#111118] border border-[#2a2a3e] rounded-lg text-xs text-zinc-400 hover:text-white hover:border-green-500/40 transition-all">
                    {s}
                  </button>
                ))}
                {mode.id === 'saas' && [
                  'AI writing assistant with subscription',
                  'Freelancer invoicing & contract platform',
                  'Social media scheduler for creators',
                  'No-code website builder for restaurants',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="px-3 py-1.5 bg-[#111118] border border-[#2a2a3e] rounded-lg text-xs text-zinc-400 hover:text-white hover:border-slate-500/40 transition-all">
                    {s}
                  </button>
                ))}
                {mode.id === 'video' && [
                  'How I built a SaaS in 30 days',
                  '5 AI tools that replace 10 employees',
                  'Learn Python in 10 minutes (beginner)',
                  'React vs Next.js — which should you use?',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="px-3 py-1.5 bg-[#111118] border border-[#2a2a3e] rounded-lg text-xs text-zinc-400 hover:text-white hover:border-red-500/40 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generating indicator — shown while waiting for response */}
          {streaming && !output && (
            <div className="bg-[#111118] border border-[#1f1f2e] rounded-2xl p-8 flex flex-col items-center gap-4">
              <div className="flex gap-2 items-center">
                {[0,1,2].map(i => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${mode.color}`}
                    style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
              <p className="text-zinc-500 text-sm">Generating {mode.label.toLowerCase()}… this may take a moment</p>
              <style jsx>{`@keyframes bounce { 0%,100%{transform:translateY(0);opacity:0.5} 50%{transform:translateY(-8px);opacity:1} }`}</style>
            </div>
          )}

          {/* Output */}
          {output && (
            <div className="bg-[#111118] border border-[#1f1f2e] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f2e]">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${mode.color} flex items-center justify-center`}>
                    <mode.icon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-zinc-200">{mode.label} Output</span>
                </div>
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a3e] hover:bg-[#333345] rounded-lg text-xs text-zinc-300 transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="px-5 py-5 overflow-x-auto">
                <pre className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                  {output}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
