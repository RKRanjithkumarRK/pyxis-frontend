'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Code2, Layers, Database, GitBranch, Search, Cpu,
  Eye, FlaskConical, Copy, Check, Download, Zap,
  Loader2, X, ChevronDown, ChevronUp, Terminal,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModeId = 'codegen' | 'architect' | 'database' | 'api' | 'regex' | 'algorithm' | 'review' | 'tests'

interface Mode {
  id: ModeId
  label: string
  sublabel: string
  icon: React.ElementType
  emoji: string
  accent: string
  accentRgb: string
  langDefault: string
  fileExt: string
  placeholder: string
  starters: string[]
  system: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const LANGUAGES = [
  'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust',
  'Java', 'C++', 'C#', 'Swift', 'Kotlin',
  'SQL', 'Bash', 'Ruby', 'PHP', 'Scala',
]

const LANG_EXT: Record<string, string> = {
  Python: 'py', JavaScript: 'js', TypeScript: 'ts', Go: 'go',
  Rust: 'rs', Java: 'java', 'C++': 'cpp', 'C#': 'cs',
  Swift: 'swift', Kotlin: 'kt', SQL: 'sql', Bash: 'sh',
  Ruby: 'rb', PHP: 'php', Scala: 'scala',
}

const LANG_COLOR: Record<string, string> = {
  Python: '#3b82f6', JavaScript: '#f59e0b', TypeScript: '#6366f1',
  Go: '#06b6d4', Rust: '#f97316', Java: '#ef4444',
  'C++': '#8b5cf6', 'C#': '#10b981', Swift: '#f43f5e',
  Kotlin: '#a855f7', SQL: '#0ea5e9', Bash: '#84cc16',
  Ruby: '#dc2626', PHP: '#7c3aed', Scala: '#e11d48',
}

const MODES: Mode[] = [
  {
    id: 'codegen',
    label: 'Code Gen',
    sublabel: 'Generate production code',
    icon: Code2,
    emoji: '💻',
    accent: '#7c3aed',
    accentRgb: '124,58,237',
    langDefault: 'TypeScript',
    fileExt: 'ts',
    placeholder: 'Describe what you want to build…\ne.g. "A REST API in FastAPI that handles user auth with JWT tokens and refresh token rotation"',
    starters: [
      'Next.js 14 auth system with Firebase',
      'FastAPI CRUD API with SQLite & JWT',
      'React dashboard with Chart.js & dark mode',
      'WebSocket chat server in TypeScript',
    ],
    system: `You are a senior software engineer with 15+ years of experience. Generate clean, well-commented, production-ready code.

Rules:
- Include all necessary imports
- Add inline comments explaining WHY not just what
- Include proper error handling
- Provide a complete, runnable example with usage section
- Use modern, idiomatic patterns
- Always wrap code in a properly labeled fenced code block`,
  },
  {
    id: 'architect',
    label: 'Architect',
    sublabel: 'System design & architecture',
    icon: Layers,
    emoji: '🏗️',
    accent: '#475569',
    accentRgb: '71,85,105',
    langDefault: 'TypeScript',
    fileExt: 'md',
    placeholder: 'Describe your system or SaaS idea…\ne.g. "AI-powered resume builder with subscription payments and team collaboration"',
    starters: [
      'Microservices architecture for e-commerce',
      'Event-driven system with Kafka & Redis',
      'Multi-tenant SaaS backend design',
      'Real-time collaboration platform',
    ],
    system: `You are a Principal Systems Architect and CTO who has built multiple successful products. Produce a complete technical blueprint with tech stack, core features, database schema, API design, scaling strategy, and a launch roadmap. Use markdown headers and code blocks.`,
  },
  {
    id: 'database',
    label: 'Database',
    sublabel: 'Schema & queries',
    icon: Database,
    emoji: '🗄️',
    accent: '#0284c7',
    accentRgb: '2,132,199',
    langDefault: 'SQL',
    fileExt: 'sql',
    placeholder: 'Describe your data model…\ne.g. "E-commerce platform with users, products, orders, reviews, and inventory tracking"',
    starters: [
      'Multi-tenant SaaS with organizations & roles',
      'E-commerce with products, carts & orders',
      'Social network with posts & followers',
      'CRM with contacts, deals & pipelines',
    ],
    system: `You are a senior database architect specializing in PostgreSQL. Design comprehensive, optimized schemas with CREATE TABLE statements, indexes, constraints, sample queries, and optimization notes. Always use proper data types and include timestamps.`,
  },
  {
    id: 'api',
    label: 'API Design',
    sublabel: 'REST/GraphQL specs',
    icon: GitBranch,
    emoji: '🔌',
    accent: '#7c3aed',
    accentRgb: '124,58,237',
    langDefault: 'TypeScript',
    fileExt: 'md',
    placeholder: 'Describe your API…\ne.g. "REST API for a task management app with auth, projects, tasks, and team members"',
    starters: [
      'RESTful API for a social media app',
      'GraphQL API for an e-commerce store',
      'Public API with rate limiting & versioning',
      'Webhook system for payment processing',
    ],
    system: `You are a senior API architect. Create comprehensive OpenAPI-style documentation with authentication, base URL, all endpoints (method, path, params, request/response bodies with JSON examples), error codes, rate limits, and SDK code examples in curl, Python, and JavaScript.`,
  },
  {
    id: 'regex',
    label: 'Regex',
    sublabel: 'Pattern matching',
    icon: Search,
    emoji: '🔍',
    accent: '#d97706',
    accentRgb: '217,119,6',
    langDefault: 'JavaScript',
    fileExt: 'md',
    placeholder: 'Describe what you need to match…\ne.g. "Extract all email addresses from text" or "Validate strong passwords (8+ chars, uppercase, number, special char)"',
    starters: [
      'Validate email addresses',
      'Extract URLs from text',
      'Validate strong passwords',
      'Match international phone numbers',
    ],
    system: `You are a regex expert. Build precise, efficient regular expressions with a breakdown of each component, match/non-match examples, JavaScript and Python code samples, and notes on edge cases and alternatives.`,
  },
  {
    id: 'algorithm',
    label: 'Algorithm',
    sublabel: 'Data structures & algorithms',
    icon: Cpu,
    emoji: '⚡',
    accent: '#0d9488',
    accentRgb: '13,148,136',
    langDefault: 'Python',
    fileExt: 'py',
    placeholder: 'Describe the algorithm or data structure…\ne.g. "Implement an LRU cache" or "Explain quicksort vs mergesort with complexity analysis"',
    starters: [
      'Implement LRU Cache from scratch',
      'Binary search tree with all operations',
      'Dynamic programming — knapsack problem',
      'Graph BFS and DFS implementation',
    ],
    system: `You are a computer science expert and competitive programmer. Explain and implement algorithms with: problem statement, approach/intuition, time & space complexity analysis, clean implementation in Python and JavaScript, test cases including edge cases, step-by-step visual trace, and real-world applications.`,
  },
  {
    id: 'review',
    label: 'Code Review',
    sublabel: 'Review & improve existing code',
    icon: Eye,
    emoji: '🔍',
    accent: '#db2777',
    accentRgb: '219,39,119',
    langDefault: 'TypeScript',
    fileExt: 'md',
    placeholder: 'Paste your code here and describe any concerns…\ne.g. Paste a function and ask "Is this secure? Any performance issues? How can I improve it?"',
    starters: [
      'Review this API endpoint for security holes',
      'Find performance bottlenecks in my code',
      'Suggest improvements for readability',
      'Check for memory leaks and resource issues',
    ],
    system: `You are a senior code reviewer with expertise in security, performance, and maintainability. Analyze the provided code and produce a structured review covering: bugs & correctness issues, security vulnerabilities, performance problems, code style & readability, best practice violations, and a refactored version with all improvements applied. Use markdown with clear sections and inline code references.`,
  },
  {
    id: 'tests',
    label: 'Unit Tests',
    sublabel: 'Generate test suites',
    icon: FlaskConical,
    emoji: '🧪',
    accent: '#16a34a',
    accentRgb: '22,163,74',
    langDefault: 'TypeScript',
    fileExt: 'test.ts',
    placeholder: 'Paste your code or describe a module to test…\ne.g. Paste a function and ask for "Jest unit tests with edge cases, mocking, and 100% branch coverage"',
    starters: [
      'Jest tests for a user authentication service',
      'Pytest suite for a REST API with fixtures',
      'React Testing Library for a form component',
      'Integration tests for a database repository',
    ],
    system: `You are a senior QA engineer and testing expert. Generate comprehensive test suites that include: happy path tests, edge cases, boundary conditions, error/exception scenarios, mocked dependencies, setup/teardown, and descriptive test names following the "given/when/then" or "should..." pattern. Aim for high branch coverage. Always include the full import statements and any required mock setup.`,
  },
]

// ─── Syntax Highlighting (lightweight, CSS-class-based) ────────────────────────

function tokenizeLine(line: string): React.ReactNode[] {
  // A minimal tokenizer that applies color spans without a heavy library
  const tokens: React.ReactNode[] = []

  const patterns: [RegExp, string][] = [
    [/(\/\/.*$|#.*$)/, 'cmt'],
    [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/, 'str'],
    [/\b(import|export|from|const|let|var|function|return|if|else|for|while|class|extends|new|this|typeof|async|await|try|catch|throw|def|self|None|True|False|pass|in|not|and|or|is|lambda|yield|with|as|raise|del|global|nonlocal|elif|except|finally|type|interface|implements|public|private|protected|static|void|int|float|bool|str|list|dict|tuple|set|fn|mut|use|mod|pub|impl|struct|enum|match|Some|Ok|Err|None)\b/, 'kw'],
    [/\b([A-Z][a-zA-Z0-9_]*)/, 'type'],
    [/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/, 'fn'],
    [/\b(\d+\.?\d*)\b/, 'num'],
    [/(=>|->|===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|^~])/, 'op'],
  ]

  let remaining = line
  let key = 0

  while (remaining.length > 0) {
    let matched = false
    for (const [re, cls] of patterns) {
      const m = remaining.match(new RegExp(`^(${re.source})`, re.flags.includes('m') ? 'm' : ''))
      if (m) {
        const colors: Record<string, string> = {
          cmt: '#8b949e',
          str: '#a5d6ff',
          kw: '#ff7b72',
          type: '#ffa657',
          fn: '#d2a8ff',
          num: '#79c0ff',
          op: '#ff7b72',
        }
        tokens.push(
          <span key={key++} style={{ color: colors[cls] }}>
            {m[1]}
          </span>
        )
        remaining = remaining.slice(m[1].length)
        matched = true
        break
      }
    }
    if (!matched) {
      // Emit one character as plain text
      const plain = remaining[0]
      tokens.push(<span key={key++} style={{ color: '#e6edf3' }}>{plain}</span>)
      remaining = remaining.slice(1)
    }
  }

  return tokens
}

function CodeBlock({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace", fontSize: 13, lineHeight: '1.65' }}>
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', minHeight: '1.65em' }}>
          <span
            style={{
              userSelect: 'none',
              color: '#6e7681',
              textAlign: 'right',
              minWidth: 40,
              paddingRight: 20,
              flexShrink: 0,
              fontSize: 12,
              paddingTop: 1,
            }}
          >
            {i + 1}
          </span>
          <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {tokenizeLine(line)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Detect language from fenced code blocks ───────────────────────────────────

function detectLanguage(output: string): string | null {
  const m = output.match(/```(\w+)/)
  if (!m) return null
  const raw = m[1].toLowerCase()
  const map: Record<string, string> = {
    python: 'Python', py: 'Python',
    javascript: 'JavaScript', js: 'JavaScript',
    typescript: 'TypeScript', ts: 'TypeScript',
    go: 'Go', golang: 'Go',
    rust: 'Rust', rs: 'Rust',
    java: 'Java',
    cpp: 'C++', 'c++': 'C++',
    csharp: 'C#', cs: 'C#',
    swift: 'Swift',
    kotlin: 'Kotlin',
    sql: 'SQL',
    bash: 'Bash', sh: 'Bash', shell: 'Bash',
    ruby: 'Ruby', rb: 'Ruby',
    php: 'PHP',
    scala: 'Scala',
  }
  return map[raw] ?? null
}

// Extract raw code from fenced block
function extractCode(output: string): string {
  const m = output.match(/```(?:\w+)?\n([\s\S]*?)```/)
  return m ? m[1] : output
}

// Estimate token count (rough: ~4 chars per token)
function estimateTokens(text: string): number {
  return Math.round(text.length / 4)
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CodeStudio() {
  const [activeMode, setActiveMode] = useState<Mode>(MODES[0])
  const [language, setLanguage] = useState<string>('TypeScript')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [genTime, setGenTime] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [explainOpen, setExplainOpen] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [explainLoading, setExplainLoading] = useState(false)
  const [langDropOpen, setLangDropOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-detect language from output
  const detectedLang = output ? (detectLanguage(output) ?? language) : language
  const detectedColor = LANG_COLOR[detectedLang] ?? '#6e7681'
  const lineCount = output ? output.split('\n').length : 0
  const tokenEstimate = estimateTokens(output)

  // Keyboard shortcut: Ctrl+Enter to generate, ESC to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        generate()
      }
      if (e.key === 'Escape' && streaming) {
        abortRef.current?.abort()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const generate = useCallback(async () => {
    if (!input.trim() || streaming) return
    setOutput('')
    setGenTime(null)
    setExplainOpen(false)
    setExplanation('')
    setStreaming(true)
    const start = Date.now()
    abortRef.current = new AbortController()
    const timer = setTimeout(() => abortRef.current?.abort(), 90000)

    const systemWithLang = `${activeMode.system}\n\nPrimary language: ${language}. Unless the user specifies otherwise, write code in ${language}.`

    try {
      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          systemPrompt: systemWithLang,
          messages: [{ role: 'user', content: input.trim() }],
          stream: false,
        }),
      })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const text: string = data.content || data.error || '⚠️ Empty response.'
      setOutput(text)
      setGenTime(Math.round((Date.now() - start)))
    } catch (e: any) {
      clearTimeout(timer)
      setOutput(e.name === 'AbortError'
        ? '// Generation cancelled.'
        : '// ⚠️ Error connecting to AI. Please try again.')
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, activeMode, language])

  const callAI = async (prompt: string, systemPrompt: string): Promise<string> => {
    const res = await fetch('/api/tool-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.content || ''
  }

  const handleExplain = async () => {
    if (!output) return
    setExplainOpen(true)
    if (explanation) return // already fetched
    setExplainLoading(true)
    try {
      const result = await callAI(
        `Explain this code in clear, beginner-friendly terms. Cover what it does, how it works, key patterns used, and any gotchas:\n\n${output}`,
        'You are a patient senior developer who excels at explaining code clearly and concisely. Use markdown.'
      )
      setExplanation(result)
    } catch {
      setExplanation('Failed to generate explanation. Please try again.')
    } finally {
      setExplainLoading(false)
    }
  }

  const handleAddTests = async () => {
    if (!output) return
    const testPrompt = `Generate a comprehensive unit test suite for the following code. Include happy path, edge cases, boundary conditions, and error scenarios:\n\n${output}`
    setInput(testPrompt)
    setActiveMode(MODES.find(m => m.id === 'tests')!)
    setTimeout(() => generate(), 100)
  }

  const handleOptimize = async () => {
    if (!output) return
    setInput(`Optimize this code for performance and readability. Explain each improvement made:\n\n${output}`)
    setOutput('')
    setExplainOpen(false)
    setExplanation('')
    setTimeout(() => generate(), 100)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const ext = LANG_EXT[detectedLang] ?? activeMode.fileExt
    const filename = `pyxis-${activeMode.id}-${Date.now()}.${ext}`
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const switchMode = (m: Mode) => {
    setActiveMode(m)
    setOutput('')
    setInput('')
    setGenTime(null)
    setExplainOpen(false)
    setExplanation('')
    setLanguage(m.langDefault)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0d1117',
        color: '#e6edf3',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ── Mode Tab Bar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 12px',
          borderBottom: '1px solid #21262d',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          flexShrink: 0,
          background: '#010409',
        }}
      >
        <Terminal size={16} style={{ color: '#6e7681', marginRight: 6, flexShrink: 0 }} />
        {MODES.map(m => {
          const Icon = m.icon
          const active = activeMode.id === m.id
          return (
            <button
              key={m.id}
              onClick={() => switchMode(m)}
              title={m.sublabel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 6,
                border: active ? `1px solid ${m.accent}44` : '1px solid transparent',
                background: active ? `${m.accent}22` : 'transparent',
                color: active ? '#e6edf3' : '#8b949e',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 13 }}>{m.emoji}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon size={13} />
                {m.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Split Panels ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT PANEL (40%) ─────────────────────────────────────────────── */}
        <div
          style={{
            width: '40%',
            minWidth: 280,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #21262d',
            background: '#0d1117',
            overflow: 'hidden',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid #21262d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{activeMode.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{activeMode.label}</div>
                <div style={{ fontSize: 11, color: '#6e7681' }}>{activeMode.sublabel}</div>
              </div>
            </div>

            {/* Language selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLangDropOpen(v => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: '1px solid #30363d',
                  background: '#161b22',
                  color: '#e6edf3',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: detectedColor,
                    flexShrink: 0,
                  }}
                />
                {language}
                <ChevronDown size={11} style={{ color: '#6e7681' }} />
              </button>
              {langDropOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: 8,
                    padding: '4px 0',
                    zIndex: 50,
                    minWidth: 140,
                    maxHeight: 240,
                    overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(1,4,9,0.8)',
                  }}
                >
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setLangDropOpen(false) }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '6px 14px',
                        background: lang === language ? '#21262d' : 'transparent',
                        color: lang === language ? '#e6edf3' : '#8b949e',
                        fontSize: 12,
                        cursor: 'pointer',
                        border: 'none',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: LANG_COLOR[lang] ?? '#6e7681',
                          flexShrink: 0,
                        }}
                      />
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Textarea */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, gap: 10, overflow: 'hidden' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={activeMode.placeholder}
              style={{
                flex: 1,
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                padding: '12px 14px',
                color: '#e6edf3',
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineHeight: 1.6,
                resize: 'none',
                outline: 'none',
                transition: 'border-color 0.15s',
                width: '100%',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = activeMode.accent }}
              onBlur={e => { e.currentTarget.style.borderColor = '#30363d' }}
            />

            {/* Char count & shortcut hint */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#6e7681' }}>
                {input.length > 0 ? `${input.length} chars` : 'Ctrl+Enter to generate · ESC to cancel'}
              </span>
              <span style={{ fontSize: 11, color: '#6e7681', fontFamily: 'monospace' }}>
                {input.length > 0 && 'Ctrl+↵'}
              </span>
            </div>

            {/* Quick-start chips */}
            {!output && !streaming && (
              <div>
                <div style={{ fontSize: 10, color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>
                  Quick Start
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {activeMode.starters.map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        border: `1px solid #30363d`,
                        background: 'transparent',
                        color: '#8b949e',
                        fontSize: 11,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = activeMode.accent
                        e.currentTarget.style.color = '#e6edf3'
                        e.currentTarget.style.background = `${activeMode.accent}18`
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#30363d'
                        e.currentTarget.style.color = '#8b949e'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={streaming ? () => abortRef.current?.abort() : generate}
              disabled={!streaming && !input.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 0',
                borderRadius: 8,
                border: 'none',
                background: streaming
                  ? '#21262d'
                  : !input.trim()
                    ? '#21262d'
                    : `linear-gradient(135deg, ${activeMode.accent}, ${activeMode.accent}cc)`,
                color: streaming ? '#f85149' : !input.trim() ? '#6e7681' : '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: !streaming && !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: !streaming && input.trim() ? `0 0 20px ${activeMode.accent}44` : 'none',
                letterSpacing: '0.01em',
              }}
            >
              {streaming ? (
                <>
                  <X size={15} />
                  Cancel (ESC)
                </>
              ) : (
                <>
                  <Zap size={15} />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL (60%) ────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#0d1117',
            overflow: 'hidden',
          }}
        >
          {/* IDE Header bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              borderBottom: '1px solid #21262d',
              background: '#010409',
              flexShrink: 0,
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Traffic lights */}
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />

              {output && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                  {/* Language badge */}
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: `${detectedColor}25`,
                      border: `1px solid ${detectedColor}55`,
                      color: detectedColor,
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: detectedColor, display: 'inline-block' }} />
                    {detectedLang}
                  </span>

                  <span style={{ color: '#6e7681', fontSize: 11 }}>{lineCount} lines</span>
                  <span style={{ color: '#6e7681', fontSize: 11 }}>~{tokenEstimate.toLocaleString()} tokens</span>
                  {genTime && (
                    <span
                      style={{
                        padding: '1px 7px',
                        borderRadius: 4,
                        background: '#238636' + '33',
                        border: '1px solid #238636' + '66',
                        color: '#3fb950',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      ⚡ {(genTime / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              )}

              {streaming && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                  <Loader2 size={13} style={{ color: activeMode.accent, animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 12, color: '#8b949e' }}>Generating…</span>
                </div>
              )}

              {!output && !streaming && (
                <span style={{ fontSize: 12, color: '#6e7681', marginLeft: 8 }}>
                  output.{LANG_EXT[language] ?? 'txt'}
                </span>
              )}
            </div>

            {output && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleDownload}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 6,
                    border: '1px solid #30363d', background: '#161b22',
                    color: '#8b949e', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  <Download size={12} />
                  Download
                </button>
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 6,
                    border: '1px solid #30363d',
                    background: copied ? '#238636' + '33' : '#161b22',
                    color: copied ? '#3fb950' : '#8b949e',
                    fontSize: 11, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {/* Code output area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              background: '#161b22',
              padding: output ? '16px 0' : 0,
              position: 'relative',
            }}
          >
            {/* Empty state */}
            {!output && !streaming && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 16,
                  color: '#6e7681',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: `${activeMode.accent}18`,
                    border: `1px solid ${activeMode.accent}33`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                  }}
                >
                  {activeMode.emoji}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: '#e6edf3', fontWeight: 500, marginBottom: 4 }}>
                    Ready to Generate
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Describe your task on the left and press{' '}
                    <kbd
                      style={{
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: '#21262d',
                        border: '1px solid #30363d',
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: '#e6edf3',
                      }}
                    >
                      Ctrl+Enter
                    </kbd>
                  </div>
                </div>
              </div>
            )}

            {/* Streaming loader */}
            {streaming && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 20,
                }}
              >
                <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      style={{
                        width: 4,
                        borderRadius: 4,
                        background: activeMode.accent,
                        height: 12 + i * 6,
                        opacity: 0.85,
                        animation: `waveBar 0.9s ease-in-out ${i * 0.1}s infinite alternate`,
                      }}
                    />
                  ))}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#e6edf3', fontWeight: 500 }}>
                    AI is writing your {activeMode.label.toLowerCase()}…
                  </div>
                  <div style={{ fontSize: 11, color: '#6e7681', marginTop: 4 }}>
                    Complex outputs may take 15–30 seconds
                  </div>
                </div>
              </div>
            )}

            {/* Code output */}
            {output && !streaming && (
              <div style={{ padding: '0 0 8px 0' }}>
                <CodeBlock code={output} />
              </div>
            )}
          </div>

          {/* ── Action bar + Stats ────────────────────────────────────────── */}
          {output && !streaming && (
            <>
              <div
                style={{
                  borderTop: '1px solid #21262d',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#010409',
                  flexShrink: 0,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={handleExplain}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 6,
                    border: `1px solid ${explainOpen ? activeMode.accent + '55' : '#30363d'}`,
                    background: explainOpen ? activeMode.accent + '18' : '#161b22',
                    color: explainOpen ? '#e6edf3' : '#8b949e',
                    fontSize: 12, cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  <Eye size={13} />
                  Explain
                  {explainOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                <button
                  onClick={handleAddTests}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 6,
                    border: '1px solid #30363d', background: '#161b22',
                    color: '#8b949e', fontSize: 12, cursor: 'pointer', fontWeight: 500,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#16a34a55'; e.currentTarget.style.color = '#3fb950' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#8b949e' }}
                >
                  <FlaskConical size={13} />
                  Add Tests
                </button>

                <button
                  onClick={handleOptimize}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 6,
                    border: '1px solid #30363d', background: '#161b22',
                    color: '#8b949e', fontSize: 12, cursor: 'pointer', fontWeight: 500,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#d9770655'; e.currentTarget.style.color = '#f0883e' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#8b949e' }}
                >
                  <Zap size={13} />
                  Optimize
                </button>

                <div style={{ flex: 1 }} />

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3fb950', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: '#6e7681' }}>Ready</span>
                </div>
              </div>

              {/* Explanation panel */}
              {explainOpen && (
                <div
                  style={{
                    borderTop: '1px solid #21262d',
                    padding: '14px 18px',
                    background: '#0d1117',
                    maxHeight: 260,
                    overflowY: 'auto',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e6edf3', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Eye size={14} style={{ color: activeMode.accent }} />
                      Code Explanation
                    </div>
                    <button
                      onClick={() => setExplainOpen(false)}
                      style={{ background: 'none', border: 'none', color: '#6e7681', cursor: 'pointer', padding: 2 }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {explainLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8b949e', fontSize: 13 }}>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Analyzing code…
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.65,
                        color: '#c9d1d9',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    >
                      {explanation}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Global keyframe animations injected via style tag */}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(1); opacity: 0.6; }
          to   { transform: scaleY(1.8); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        /* Hide scrollbar globally for the tab bar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }
      `}</style>
    </div>
  )
}
