'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Code2, Send, Loader2, Copy, Check, Clapperboard, Layers,
  Database, Search, Cpu, GitBranch, Download, RefreshCw, Zap,
} from 'lucide-react'

const MODES = [
  {
    id: 'code',
    label: 'Code Generator',
    icon: Code2,
    emoji: '💻',
    color: 'from-green-500 to-emerald-500',
    accentColor: 'rgba(16,185,129,0.35)',
    placeholder: 'Describe what you want to build…  e.g. "A REST API in FastAPI that handles user auth with JWT tokens"',
    fileExt: 'md',
    starters: [
      'Next.js 14 auth system with Firebase',
      'FastAPI CRUD API with SQLite & JWT',
      'React dashboard with Chart.js & dark mode',
      'Python web scraper with BeautifulSoup',
      'Stripe subscription payments in Node.js',
      'WebSocket chat app in TypeScript',
    ],
    system: `You are a senior software engineer with 15+ years of experience. Generate clean, well-commented, production-ready code.

Guidelines:
- Always include all necessary imports and dependencies
- Add meaningful inline comments that explain WHY, not just what
- Include proper error handling and edge cases
- Provide a complete, runnable example
- Show a "Usage" section with example commands/output
- Use modern, idiomatic patterns for the language
- Specify the language/framework version at the top
- Format code blocks with the proper language tag`,
  },
  {
    id: 'saas',
    label: 'SaaS Architect',
    icon: Layers,
    emoji: '🏗️',
    color: 'from-slate-500 to-gray-600',
    accentColor: 'rgba(100,116,139,0.35)',
    placeholder: 'Describe your SaaS idea…  e.g. "AI-powered resume builder with subscription payments and team collaboration"',
    fileExt: 'md',
    starters: [
      'AI writing assistant with subscription billing',
      'Freelancer invoicing & contract platform',
      'B2B CRM with AI-powered lead scoring',
      'Social media scheduler for creators',
      'No-code website builder for restaurants',
      'Team knowledge base with AI search',
    ],
    system: `You are a Principal SaaS Architect and startup CTO who has built multiple successful products. When given a SaaS idea, produce a complete technical blueprint:

## [Product Name]

### 🔧 Tech Stack
- Frontend: [Framework + libraries]
- Backend: [Language + framework]
- Database: [Primary + cache]
- Auth: [Solution]
- Payments: [Provider + plan]
- Hosting: [Infrastructure]
- Monitoring: [Tools]

### ⭐ Core Features (MVP)
[Prioritized list with effort estimates]

### 🗄️ Database Schema
[Key tables/collections with fields]

### 📡 API Endpoints
[RESTful design with methods and descriptions]

### 💰 Monetization Strategy
[Pricing tiers, freemium model, upsell paths]

### 🚀 30-Day Launch Plan
[Week-by-week milestones]

### ⚠️ Key Risks & Mitigations
[Technical, market, and operational risks]`,
  },
  {
    id: 'database',
    label: 'DB Schema',
    icon: Database,
    emoji: '🗄️',
    color: 'from-blue-500 to-indigo-500',
    accentColor: 'rgba(59,130,246,0.35)',
    placeholder: 'Describe your application data model…  e.g. "E-commerce platform with users, products, orders, reviews, and inventory"',
    fileExt: 'sql',
    starters: [
      'Multi-tenant SaaS with organizations & users',
      'E-commerce with products, carts & orders',
      'Social network with posts, comments & follows',
      'Hotel booking system with rooms & reservations',
      'Learning platform with courses & progress tracking',
      'CRM with contacts, deals & pipelines',
    ],
    system: `You are a senior database architect specializing in PostgreSQL and modern data modeling. Design comprehensive, optimized database schemas.

For each schema, provide:

## [System Name] Database Schema

### 📊 Entity-Relationship Overview
[Brief description of main entities and relationships]

### 🗄️ SQL Schema
\`\`\`sql
-- Complete CREATE TABLE statements with:
-- - Proper data types
-- - Primary and foreign keys
-- - Indexes for performance
-- - Constraints and defaults
-- - Timestamps (created_at, updated_at)
\`\`\`

### 🔍 Key Indexes
[Performance-critical indexes explained]

### 📝 Sample Queries
[Common queries for the system]

### ⚡ Optimization Notes
[Partitioning, caching, scaling considerations]`,
  },
  {
    id: 'api',
    label: 'API Designer',
    icon: GitBranch,
    emoji: '🔌',
    color: 'from-purple-500 to-violet-500',
    accentColor: 'rgba(168,85,247,0.35)',
    placeholder: 'Describe your API…  e.g. "REST API for a task management app with auth, projects, tasks, and team members"',
    fileExt: 'md',
    starters: [
      'RESTful API for a social media app',
      'GraphQL API for an e-commerce platform',
      'Webhook system for payment processing',
      'Public API with rate limiting & authentication',
      'Real-time API with WebSocket events',
      'Microservices API gateway design',
    ],
    system: `You are a senior API architect who designs elegant, developer-friendly APIs. Create comprehensive OpenAPI-style documentation.

## [API Name] — API Reference

### 🔐 Authentication
[Auth method, token types, examples]

### 📡 Base URL & Versioning
\`\`\`
https://api.example.com/v1
\`\`\`

### 📚 Endpoints
For each endpoint:
**[METHOD] /path**
- Description
- Request headers
- Path/query parameters
- Request body (with JSON example)
- Response (200, 400, 401, 404, 500 examples)

### ⚡ Rate Limiting
[Limits, headers, retry strategy]

### 🔄 Webhooks
[Events, payload format, verification]

### 📘 Code Examples
[Curl, Python, JavaScript SDK examples]`,
  },
  {
    id: 'regex',
    label: 'Regex Builder',
    icon: Search,
    emoji: '🔍',
    color: 'from-amber-500 to-yellow-500',
    accentColor: 'rgba(245,158,11,0.35)',
    placeholder: 'Describe what you need to match…  e.g. "Extract all email addresses from text" or "Validate strong passwords (8+ chars, uppercase, number, special)"',
    fileExt: 'md',
    starters: [
      'Validate email addresses',
      'Extract URLs from text',
      'Validate strong passwords',
      'Parse credit card numbers',
      'Match phone numbers (international)',
      'Extract hashtags and @mentions',
    ],
    system: `You are a regex expert. Build precise, efficient regular expressions with full explanations.

## [Pattern Name]

### 🔍 The Pattern
\`\`\`
/YOUR_PATTERN/flags
\`\`\`

### 📖 Pattern Breakdown
[Explain each component character by character]

### ✅ Matches (should match)
\`\`\`
[examples that match]
\`\`\`

### ❌ Non-matches (should NOT match)
\`\`\`
[examples that don't match]
\`\`\`

### 💻 Code Examples
\`\`\`javascript
// JavaScript
\`\`\`
\`\`\`python
# Python
\`\`\`

### ⚠️ Edge Cases
[Known limitations and how to handle them]

### 🔄 Alternative Approaches
[Simpler alternatives if applicable]`,
  },
  {
    id: 'algo',
    label: 'Algorithm',
    icon: Cpu,
    emoji: '⚙️',
    color: 'from-teal-500 to-cyan-500',
    accentColor: 'rgba(20,184,166,0.35)',
    placeholder: 'Describe the algorithm problem…  e.g. "Implement a LRU cache" or "Sort algorithm comparison — quicksort vs mergesort vs heapsort"',
    fileExt: 'md',
    starters: [
      'Implement LRU Cache from scratch',
      'Binary search tree with all operations',
      'Dynamic programming — knapsack problem',
      'Graph BFS and DFS implementation',
      'Sorting algorithms comparison',
      'Trie data structure implementation',
    ],
    system: `You are a computer science expert and competitive programmer. Explain and implement algorithms with clarity and rigor.

## [Algorithm Name]

### 📐 Problem Statement
[Clear definition of the problem]

### 💡 Approach & Intuition
[Explain the strategy in plain English]

### ⏱️ Complexity Analysis
- Time: O(?) — explanation
- Space: O(?) — explanation

### 💻 Implementation
\`\`\`python
# Clean, well-commented implementation
\`\`\`
\`\`\`javascript
// JavaScript implementation
\`\`\`

### 🧪 Test Cases
\`\`\`python
# Test cases including edge cases
\`\`\`

### 📊 Visual Trace
[Step-by-step trace with a small example]

### 🔄 Variations & Optimizations
[Space-optimized, alternative approaches]

### 🎯 When to Use
[Real-world applications]`,
  },
  {
    id: 'video',
    label: 'Video Script',
    icon: Clapperboard,
    emoji: '🎬',
    color: 'from-red-500 to-pink-500',
    accentColor: 'rgba(239,68,68,0.35)',
    placeholder: 'Describe your video topic…  e.g. "YouTube tutorial: How to build a full-stack app with Next.js 14 and Supabase in 30 minutes"',
    fileExt: 'md',
    starters: [
      'How I built a SaaS in 30 days',
      '5 AI tools that replace 10 employees',
      'Next.js 14 full-stack tutorial',
      'Learn Python in 10 minutes (beginner)',
      'The honest truth about freelancing',
      'Why most developers fail at interviews',
    ],
    system: `You are a top YouTube scriptwriter with 10M+ views experience. Create compelling, viewer-retention-optimized scripts.

## [Video Title]

### 🎣 HOOK (0-15 seconds)
[Pattern interrupt — shocking stat, bold claim, or question that creates immediate curiosity]

### 📺 INTRO (15-60 seconds)
[Problem identification + promise of what they'll learn + credibility]

### 📋 MAIN CONTENT
[Structured sections with timestamps, b-roll cues, and transitions]
[Timestamp] **Section Title**
- Key point
- Visual cue: [what to show on screen]
- Engagement hook: [question or callback]

### 📣 CTA (Last 30 seconds)
[Like, subscribe, comment prompt with specific reason]

---
### 🎯 5 Title Options (A/B test these)
1. [Power word] How...
2. The truth about...
3. Why [audience] is wrong about...
4. [Number] [things] in [timeframe]
5. I [did thing] so you don't have to

### 📝 SEO Description
[First 2 lines: hook, rest: keywords and timestamps]

### 🏷️ Tags
[20 relevant tags]`,
  },
]

export default function CodePage() {
  const [mode, setMode] = useState(MODES[0])
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [genTime, setGenTime] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setCharCount(output.length)
  }, [output])

  const run = async () => {
    if (!input.trim() || streaming) return
    setOutput('')
    setGenTime(null)
    setStreaming(true)
    const start = Date.now()

    abortRef.current = new AbortController()
    const timer = setTimeout(() => abortRef.current?.abort(), 60000)

    try {
      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          systemPrompt: mode.system,
          messages: [{ role: 'user', content: input.trim() }],
          stream: false,
        }),
      })

      clearTimeout(timer)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const text = data.content || data.error || '⚠️ Empty response from AI.'
      setOutput(text)
      setGenTime(Math.round((Date.now() - start) / 100) / 10)
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

  const download = () => {
    const filename = `pyxis-${mode.id}-${Date.now()}.${mode.fileExt}`
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    abortRef.current?.abort()
    setStreaming(false)
    setOutput('')
    setInput('')
    setGenTime(null)
  }

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 bg-gradient-to-br ${mode.color} rounded-lg flex items-center justify-center shrink-0`}>
              <span className="text-base">{mode.emoji}</span>
            </div>
            <div>
              <h1 className="font-semibold text-text-primary text-sm">{mode.label}</h1>
              <p className="text-xs text-text-tertiary">AI-powered code & content generation</p>
            </div>
          </div>

          {/* Mode tabs — scrollable on mobile */}
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 overflow-x-auto">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m); setOutput(''); setInput(''); setGenTime(null) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0"
                style={{
                  background: mode.id === m.id ? 'var(--surface-hover)' : 'transparent',
                  color: mode.id === m.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                <span>{m.emoji}</span>
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-4xl mx-auto">
          {/* Input area */}
          <div className="mb-5">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run() }}
              placeholder={mode.placeholder}
              rows={4}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none transition-all"
              style={{ fontFamily: 'inherit' }}
            />
            <div className="flex items-center justify-between mt-2.5">
              <p className="text-xs text-text-tertiary">
                <span className="font-mono">⌘+Enter</span> to generate · <span className="opacity-60">{input.length} chars</span>
              </p>
              <div className="flex items-center gap-2">
                {output && (
                  <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 bg-surface-hover rounded-lg text-xs text-text-tertiary hover:text-text-secondary transition-all">
                    <RefreshCw size={12} />
                    Reset
                  </button>
                )}
                <button
                  onClick={run}
                  disabled={streaming || !input.trim()}
                  className={`flex items-center gap-2 px-5 py-2 bg-gradient-to-r ${mode.color} disabled:opacity-40 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90`}
                >
                  {streaming ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                  {streaming ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick starters */}
          {!output && !streaming && (
            <div className="mb-6">
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3 font-medium">Quick Start</p>
              <div className="flex flex-wrap gap-2">
                {mode.starters.map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary transition-all"
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = mode.accentColor }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {streaming && !output && (
            <div className="bg-surface border border-border rounded-2xl p-10 flex flex-col items-center gap-5">
              <div className="flex gap-2 items-end">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`w-2 rounded-full bg-gradient-to-b ${mode.color}`}
                    style={{ height: 8 + i * 8, animation: `waveBar 0.8s ease-in-out ${i * 0.12}s infinite alternate` }}
                  />
                ))}
              </div>
              <div className="text-center">
                <p className="text-text-secondary text-sm font-medium">Generating {mode.label}…</p>
                <p className="text-text-tertiary text-xs mt-1">This may take 10-30 seconds for complex outputs</p>
              </div>
            </div>
          )}

          {/* Output */}
          {output && (
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              {/* Output header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-base">{mode.emoji}</span>
                  <span className="text-sm font-medium text-text-primary">{mode.label} Output</span>
                  {genTime && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                      ⚡ {genTime}s
                    </span>
                  )}
                  <span className="text-xs text-text-tertiary">{charCount.toLocaleString()} chars</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={download}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover rounded-lg text-xs text-text-secondary hover:text-text-primary transition-all"
                    title="Download as file"
                  >
                    <Download size={12} />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  <button
                    onClick={copy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover rounded-lg text-xs text-text-secondary hover:text-text-primary transition-all"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Rendered markdown output */}
              <div className="px-5 py-5 overflow-x-auto">
                <div className="markdown-body text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
