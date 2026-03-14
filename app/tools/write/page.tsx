'use client'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  PenLine, Sparkles, Download, Copy, FileText, Loader2,
  ChevronDown, RotateCcw, RotateCw, Save, Wand2, Scissors,
  Maximize2, Minimize2, Type, BookOpen, Zap, CheckCircle, X,
  Hash, AlignLeft, ChevronRight, Target, BarChart2, Lightbulb,
  AlertTriangle, Info, ArrowRight, RefreshCw, PanelRightClose,
  PanelRightOpen, Bold, Italic, Globe, Search, FileDown,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ─── Types ────────────────────────────────────────────────────────── */
type Tone = 'professional' | 'casual' | 'creative' | 'academic' | 'persuasive' | 'technical'
type Audience = 'general' | 'business' | 'technical' | 'academic'
type SuggestionSeverity = 'high' | 'medium' | 'low'
type RightTab = 'issues' | 'style' | 'tone'

interface Suggestion {
  type: string
  severity: SuggestionSeverity
  text: string
  fix: string
  explanation: string
}

interface AnalysisResult {
  score: number
  correctness: number
  clarity: number
  engagement: number
  delivery: number
  suggestions: Suggestion[]
  tone: string
  readingLevel: string
  wordCount: number
}

interface HistoryEntry {
  content: string
  ts: number
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const AUTOSAVE_KEY = 'pyxis-write-studio-v2'
const TITLE_KEY    = 'pyxis-write-title-v2'

const TONES: { id: Tone; label: string; emoji: string; desc: string }[] = [
  { id: 'professional', label: 'Professional', emoji: '💼', desc: 'Formal, polished, business-ready' },
  { id: 'academic',     label: 'Academic',     emoji: '🎓', desc: 'Scholarly, citation-friendly' },
  { id: 'casual',       label: 'Casual',       emoji: '😊', desc: 'Friendly, conversational' },
  { id: 'creative',     label: 'Creative',     emoji: '🎨', desc: 'Imaginative, expressive' },
  { id: 'persuasive',   label: 'Persuasive',   emoji: '🎯', desc: 'Compelling, call-to-action' },
  { id: 'technical',    label: 'Technical',    emoji: '⚙️', desc: 'Precise, detail-oriented' },
]

const AUDIENCES: { id: Audience; label: string }[] = [
  { id: 'general',   label: 'General Public' },
  { id: 'business',  label: 'Business / C-Suite' },
  { id: 'technical', label: 'Technical / Developers' },
  { id: 'academic',  label: 'Academic / Researchers' },
]

const WORD_GOALS = [250, 500, 1000, 1500, 2000, 3000, 5000]

const TEMPLATES = [
  {
    label: 'Blog Post',
    icon: '📝',
    content: `# [Your Blog Post Title]

## Introduction

Hook your reader here with a compelling opening statement or question that draws them in.

## The Problem / Context

Explain the context or problem you're addressing. Why does this matter to your reader?

## Main Point 1

Dive into your first key point. Use specific examples and data to support your argument.

## Main Point 2

Continue with your second key insight. Show, don't just tell — use anecdotes or case studies.

## Main Point 3

Build on your previous points. This is where you can introduce nuance or counterarguments.

## Conclusion

Summarize your key takeaways and end with a clear call to action or thought-provoking close.`,
  },
  {
    label: 'Email',
    icon: '📧',
    content: `Subject: [Clear, Specific Subject Line]

Dear [Recipient Name],

I hope this message finds you well.

[Opening: State your purpose clearly in the first sentence.]

[Body: Provide context, details, and any necessary background information. Keep paragraphs short and scannable.]

[Action Items / Next Steps:]
- [Action 1]
- [Action 2]
- [Action 3]

[Closing: Restate the most important ask or outcome you need.]

Please don't hesitate to reach out if you have any questions.

Best regards,
[Your Name]
[Title] | [Company]
[Email] | [Phone]`,
  },
  {
    label: 'Report',
    icon: '📊',
    content: `# [Report Title]

**Prepared by:** [Author Name]
**Date:** [Date]
**Confidentiality:** [Internal / Confidential]

---

## Executive Summary

A concise overview of the report's key findings and recommendations (2-3 sentences).

## Background & Objectives

Describe the context, why this report was commissioned, and what it aims to address.

## Methodology

Explain how data was collected, analyzed, and what frameworks were applied.

## Key Findings

### Finding 1: [Title]
Detail of the finding with supporting evidence.

### Finding 2: [Title]
Detail of the finding with supporting evidence.

### Finding 3: [Title]
Detail of the finding with supporting evidence.

## Analysis & Discussion

Interpret the findings. What do they mean in context?

## Recommendations

1. **[Recommendation 1]** — Explanation and rationale
2. **[Recommendation 2]** — Explanation and rationale
3. **[Recommendation 3]** — Explanation and rationale

## Conclusion

Summarize the overall situation and reinforce priority actions.

## Appendix

Supporting data, charts, or references.`,
  },
  {
    label: 'Cover Letter',
    icon: '📋',
    content: `[Your Name]
[Address] | [Email] | [Phone] | [LinkedIn]

[Date]

[Hiring Manager Name]
[Title]
[Company Name]
[Address]

Dear [Hiring Manager Name],

I am writing to express my enthusiastic interest in the [Position Title] role at [Company Name]. With [X years] of experience in [relevant field] and a proven track record of [key achievement], I am confident in my ability to make an immediate and lasting impact on your team.

In my current role at [Current Company], I [specific achievement with measurable results]. This experience directly aligns with [Company Name]'s mission to [company mission/goal], and I am excited by the opportunity to bring this expertise to your organization.

What particularly draws me to [Company Name] is [specific, genuine reason — product, culture, mission]. I admire [specific aspect] and believe my background in [relevant skill] positions me to contribute meaningfully from day one.

I would welcome the opportunity to discuss how my experience can benefit [Company Name]. Thank you for your time and consideration.

Sincerely,
[Your Name]`,
  },
  {
    label: 'Essay',
    icon: '🏛️',
    content: `# [Essay Title]

## Introduction

Begin with a hook — a provocative question, striking statistic, or vivid anecdote. Provide context that leads naturally to your thesis statement.

**Thesis:** [Your central argument in one clear sentence.]

## Body Paragraph 1: [Topic]

**Topic sentence:** Introduce the first supporting point.

Evidence and analysis: Present evidence (quote, data, example) and explain how it supports your thesis.

**Transition:** Lead smoothly into the next paragraph.

## Body Paragraph 2: [Topic]

**Topic sentence:** Introduce the second supporting point.

Evidence and analysis: Present your second piece of evidence and its significance.

**Transition:** Connect to the final body paragraph.

## Body Paragraph 3: [Topic]

**Topic sentence:** Present your strongest argument last.

Evidence and analysis: Make your most compelling case here.

## Counterargument & Rebuttal

Acknowledge a possible objection to your thesis. Then explain why your argument still holds.

## Conclusion

Restate your thesis (in new words). Summarize your key points and end with a broader implication or call to reflection.`,
  },
  {
    label: 'Press Release',
    icon: '📢',
    content: `FOR IMMEDIATE RELEASE

**[COMPANY NAME] [ACTION VERB] [ANNOUNCEMENT]**
*[Supporting subheadline in sentence case]*

[CITY, STATE] — [Date] — [Company Name], a [brief company description], today announced [the news in the first paragraph. Cover the who, what, when, where, and why in 1-2 sentences].

[Second paragraph: Provide context and background. Why does this matter? What problem does it solve?]

"[Direct quote from executive that adds color and perspective, not just facts]," said [Name], [Title] at [Company Name]. "[Continue the quote if needed.]"

[Third paragraph: Additional details, statistics, or supporting information. Include any relevant partnerships, integrations, or milestones.]

"[Optional second quote from a partner, customer, or secondary executive]," said [Name], [Title] at [Partner Company].

**About [Company Name]**
[Company Name] is [2-3 sentence boilerplate about the company — its mission, founding date, key offerings, and where it operates].

**Media Contact:**
[Name]
[Title]
[Email]
[Phone]

###`,
  },
  {
    label: 'Product Description',
    icon: '🛍️',
    content: `# [Product Name]

## [One-line value proposition that speaks to the customer's desire]

[Opening paragraph: Describe the product in vivid, sensory language. Focus on what the customer experiences, not just the features. 2-3 sentences.]

### Why You'll Love It

- **[Benefit 1]:** [Explain the benefit from the customer's perspective]
- **[Benefit 2]:** [Connect this feature to an emotional or practical outcome]
- **[Benefit 3]:** [Use specific details — numbers, materials, or results]
- **[Benefit 4]:** [Address a pain point this product solves]

### The Details

| Spec | Value |
|------|-------|
| [Spec 1] | [Value] |
| [Spec 2] | [Value] |
| [Spec 3] | [Value] |

### Perfect For

[Ideal customer or use case description. Paint a picture of the person who will love this product most.]

[Closing CTA — create urgency or reinforce confidence in the purchase decision.]`,
  },
  {
    label: 'Social Post',
    icon: '📱',
    content: `[Hook — first line is everything. Make it impossible to scroll past.]

[2-3 lines of value: insight, story, lesson, or opinion. Short sentences. White space is your friend.]

[The pivot — transition from problem/story to insight or solution.]

[Key takeaway or call to action. Make it specific and actionable.]

[Optional: Invitation to engage — "What do you think?" / "Drop a comment below." / "Save this for later."]

#[Hashtag1] #[Hashtag2] #[Hashtag3]`,
  },
]

const QUICK_ACTIONS = [
  { id: 'improve',   label: 'Improve',       icon: Wand2,       color: 'text-violet-400', bg: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20' },
  { id: 'summarize', label: 'Summarize',     icon: Scissors,    color: 'text-blue-400',   bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20' },
  { id: 'expand',    label: 'Expand',        icon: Maximize2,   color: 'text-green-400',  bg: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20' },
  { id: 'shorten',   label: 'Shorten',       icon: Minimize2,   color: 'text-amber-400',  bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20' },
  { id: 'fix',       label: 'Fix Grammar',   icon: CheckCircle, color: 'text-emerald-400',bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20' },
  { id: 'tone',      label: 'Change Tone',   icon: Type,        color: 'text-pink-400',   bg: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20' },
  { id: 'bullets',   label: 'Make Bullets',  icon: AlignLeft,   color: 'text-cyan-400',   bg: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20' },
  { id: 'outline',   label: 'Create Outline',icon: Hash,        color: 'text-orange-400', bg: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20' },
]

/* ─── Helpers ───────────────────────────────────────────────────────── */
function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}
function countSentences(text: string) {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 3).length
}
function countParagraphs(text: string) {
  return text.split(/\n{2,}/).filter(p => p.trim().length > 0).length
}
function readingTime(words: number) {
  return Math.max(1, Math.ceil(words / 238))
}
function fleschKincaid(text: string): string {
  const words = countWords(text)
  const sentences = countSentences(text) || 1
  const syllables = text.split(/\s+/).reduce((acc, word) => {
    return acc + (word.replace(/[^aeiou]/gi, '').length || 1)
  }, 0)
  const fkgl = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
  if (isNaN(fkgl) || fkgl < 0) return 'N/A'
  const grade = Math.round(fkgl)
  if (grade <= 6)  return `Grade ${grade} (Simple)`
  if (grade <= 9)  return `Grade ${grade} (Easy)`
  if (grade <= 12) return `Grade ${grade} (Standard)`
  return `Grade ${grade}+ (Advanced)`
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}
function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-400'
  if (score >= 60) return 'bg-amber-400'
  return 'bg-red-400'
}
function severityColor(s: SuggestionSeverity) {
  if (s === 'high')   return 'text-red-400 bg-red-500/10 border-red-500/20'
  if (s === 'medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
}
function severityIcon(s: SuggestionSeverity) {
  if (s === 'high')   return AlertTriangle
  if (s === 'medium') return Zap
  return Info
}

/* ─── Sub-components ────────────────────────────────────────────────── */
function RadarChart({ correctness, clarity, engagement, delivery }: {
  correctness: number; clarity: number; engagement: number; delivery: number
}) {
  const size = 120
  const cx = size / 2
  const cy = size / 2
  const r = 44
  const axes = [
    { label: 'Correct', angle: -90, value: correctness },
    { label: 'Clarity',  angle: 0,   value: clarity },
    { label: 'Engage',   angle: 90,  value: engagement },
    { label: 'Delivery', angle: 180, value: delivery },
  ]
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const point = (angle: number, val: number) => {
    const scaled = (val / 100) * r
    return {
      x: cx + scaled * Math.cos(toRad(angle)),
      y: cy + scaled * Math.sin(toRad(angle)),
    }
  }
  const axisEnd = (angle: number) => ({
    x: cx + r * Math.cos(toRad(angle)),
    y: cy + r * Math.sin(toRad(angle)),
  })
  const pts = axes.map(a => point(a.angle, a.value))
  const polygon = pts.map(p => `${p.x},${p.y}`).join(' ')
  const gridLevels = [25, 50, 75, 100]
  return (
    <svg width={size} height={size} className="mx-auto">
      {gridLevels.map(lvl => {
        const gridPts = axes.map(a => point(a.angle, lvl))
        return (
          <polygon key={lvl} points={gridPts.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.6" />
        )
      })}
      {axes.map(a => {
        const end = axisEnd(a.angle)
        return <line key={a.label} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="var(--border)" strokeWidth="0.5" opacity="0.6" />
      })}
      <polygon points={polygon} fill="rgba(139,92,246,0.2)" stroke="rgba(139,92,246,0.7)" strokeWidth="1.5" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="rgba(139,92,246,0.9)" />)}
      {axes.map(a => {
        const end = axisEnd(a.angle)
        const offset = 10
        const lx = cx + (r + offset) * Math.cos(toRad(a.angle))
        const ly = cy + (r + offset) * Math.sin(toRad(a.angle))
        return (
          <text key={a.label} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="7" fill="var(--text-tertiary)" fontFamily="sans-serif">
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}

function SuggestionCard({ s, onApply }: { s: Suggestion; onApply: (fix: string, original: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = severityIcon(s.severity)
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${severityColor(s.severity)}`}>
      <button className="w-full flex items-start gap-2.5 p-3 text-left" onClick={() => setExpanded(e => !e)}>
        <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight">{s.type}</p>
          <p className="text-[11px] opacity-70 mt-0.5 leading-relaxed truncate">{s.explanation}</p>
        </div>
        <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 opacity-50 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {s.text && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="opacity-50 line-through shrink-0">"{s.text}"</span>
              <ArrowRight className="w-3 h-3 opacity-40 flex-shrink-0" />
              <span className="font-medium shrink-0">"{s.fix}"</span>
            </div>
          )}
          <button
            onClick={() => { onApply(s.fix, s.text); setExpanded(false) }}
            className="w-full py-1.5 text-[11px] font-medium rounded-lg bg-current/10 hover:bg-current/20 transition-colors">
            Apply Fix
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function WritingStudioPage() {
  // Editor state
  const [content, setContent] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(AUTOSAVE_KEY) || ''
  })
  const [title, setTitle] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Untitled Document'
    return localStorage.getItem(TITLE_KEY) || 'Untitled Document'
  })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([])
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [focused, setFocused] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)

  // Settings
  const [tone, setTone] = useState<Tone>('professional')
  const [audience, setAudience] = useState<Audience>('general')
  const [wordGoal, setWordGoal] = useState<number>(1000)
  const [showTemplates, setShowTemplates] = useState(false)

  // Right panel
  const [rightOpen, setRightOpen] = useState(true)
  const [rightTab, setRightTab] = useState<RightTab>('issues')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  // AI action
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [aiPreview, setAiPreview] = useState<string>('')
  const [aiPreviewAction, setAiPreviewAction] = useState<string>('')

  // Floating toolbar
  const [floatingToolbar, setFloatingToolbar] = useState<{ x: number; y: number } | null>(null)
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Computed stats ── */
  const words       = useMemo(() => countWords(content), [content])
  const sentences   = useMemo(() => countSentences(content), [content])
  const paragraphs  = useMemo(() => countParagraphs(content), [content])
  const readTime    = useMemo(() => readingTime(words), [words])
  const readLevel   = useMemo(() => (content.length > 50 ? fleschKincaid(content) : '—'), [content])
  const wordGoalPct = Math.min(100, Math.round((words / wordGoal) * 100))

  /* ── Auto-save ── */
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(AUTOSAVE_KEY, content)
      localStorage.setItem(TITLE_KEY, title)
      setLastSaved(new Date())
    }, 1200)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [content, title])

  /* ── Textarea auto-resize ── */
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.max(ta.scrollHeight, 400)}px`
  }, [content])

  /* ── Click outside templates ── */
  useEffect(() => {
    if (!showTemplates) return
    const handler = () => setShowTemplates(false)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTemplates])

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  /* ── History management ── */
  const pushHistory = useCallback((val: string) => {
    setHistory(prev => [...prev.slice(-49), { content: val, ts: Date.now() }])
    setRedoStack([])
  }, [])

  const handleContentChange = (val: string) => {
    pushHistory(content)
    setContent(val)
  }

  const handleUndo = () => {
    if (!history.length) return
    const prev = history[history.length - 1]
    setRedoStack(r => [{ content, ts: Date.now() }, ...r.slice(0, 49)])
    setHistory(h => h.slice(0, -1))
    setContent(prev.content)
  }
  const handleRedo = () => {
    if (!redoStack.length) return
    const next = redoStack[0]
    setHistory(h => [...h, { content, ts: Date.now() }])
    setRedoStack(r => r.slice(1))
    setContent(next.content)
  }

  /* ── Selection / floating toolbar ── */
  const handleSelectionChange = () => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    if (start === end) { setFloatingToolbar(null); setSelection(null); return }
    setSelection({ start, end })
    // Compute position relative to textarea
    const rect = ta.getBoundingClientRect()
    setFloatingToolbar({ x: rect.left + rect.width / 2, y: rect.top - 10 })
  }

  /* ── Get text for AI (selection or full) ── */
  const getWorkingText = (): string => {
    const ta = textareaRef.current
    if (ta && ta.selectionStart !== ta.selectionEnd) {
      return content.substring(ta.selectionStart, ta.selectionEnd)
    }
    return content
  }

  /* ── Build prompts ── */
  const buildPrompt = (actionId: string, text: string): string => {
    const toneLabel = TONES.find(t => t.id === tone)?.label || tone
    const audienceLabel = AUDIENCES.find(a => a.id === audience)?.label || audience
    const ctx = `Target tone: ${toneLabel}. Target audience: ${audienceLabel}.`
    switch (actionId) {
      case 'improve':   return `${ctx} Improve the following text for clarity, flow, and engagement. Return ONLY the improved text:\n\n${text}`
      case 'summarize': return `${ctx} Write a concise summary of the following in 2-3 sentences. Return ONLY the summary:\n\n${text}`
      case 'expand':    return `${ctx} Expand the following text with more detail, examples, and depth. Double the length. Return ONLY the expanded text:\n\n${text}`
      case 'shorten':   return `${ctx} Condense the following to 40-50% of its current length while keeping all key points. Return ONLY the shortened text:\n\n${text}`
      case 'fix':       return `Fix all grammar, spelling, punctuation, and syntax errors. Return ONLY the corrected text:\n\n${text}`
      case 'tone':      return `Rewrite the following in a ${toneLabel} tone for a ${audienceLabel} audience. Keep the exact same meaning. Return ONLY the rewritten text:\n\n${text}`
      case 'bullets':   return `Convert the following into a well-structured bullet-point list using markdown. Use - for bullets, ## for section headers if relevant. Return ONLY the list:\n\n${text}`
      case 'outline':   return `${ctx} Create a detailed outline for the following content using markdown headers (##, ###) and bullets. Include introduction, main sections, and conclusion. Return ONLY the outline:\n\n${text || 'Create a blank professional document outline'}`
      default: return text
    }
  }

  /* ── Run quick action ── */
  const runAction = async (actionId: string) => {
    const text = getWorkingText()
    if (!text && actionId !== 'outline') {
      toast.error('Write some content first, or select text to apply this action.')
      return
    }
    setLoadingAction(actionId)
    setAiPreview('')
    setAiPreviewAction(actionId)
    try {
      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'You are an expert editor and writing coach. Return ONLY the requested output — no preamble, no "Here is..." framing, no explanation. Just the pure written content.',
          messages: [{ role: 'user', content: buildPrompt(actionId, text) }],
          stream: false,
        }),
      })
      const data = await res.json()
      const output = data.content || ''
      if (!output) throw new Error('No output')
      setAiPreview(output)
    } catch {
      toast.error('AI request failed. Please try again.')
    } finally {
      setLoadingAction(null)
    }
  }

  /* ── Accept AI preview ── */
  const acceptPreview = () => {
    const ta = textareaRef.current
    if (ta && ta.selectionStart !== ta.selectionEnd) {
      const start = ta.selectionStart
      const end   = ta.selectionEnd
      pushHistory(content)
      setContent(content.slice(0, start) + aiPreview + content.slice(end))
    } else {
      pushHistory(content)
      const separator = content.trim() ? '\n\n' : ''
      setContent(content + separator + aiPreview)
    }
    setAiPreview('')
    setAiPreviewAction('')
    toast.success('Applied to document!')
  }

  const replaceContent = () => {
    pushHistory(content)
    setContent(aiPreview)
    setAiPreview('')
    setAiPreviewAction('')
    toast.success('Document replaced!')
  }

  /* ── Analyze writing ── */
  const analyzeWriting = async () => {
    if (words < 10) { toast.error('Write at least a few sentences to analyze.'); return }
    setAnalyzing(true)
    try {
      const toneLabel = TONES.find(t => t.id === tone)?.label || tone
      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: `You are an expert writing analysis engine similar to Grammarly. Analyze writing and return structured JSON feedback. Always return valid JSON only — no markdown, no explanation outside the JSON object.`,
          messages: [{
            role: 'user',
            content: `Analyze this text and return a JSON object with this exact shape:
{
  "score": <overall 0-100>,
  "correctness": <0-100>,
  "clarity": <0-100>,
  "engagement": <0-100>,
  "delivery": <0-100>,
  "suggestions": [
    {"type": "<issue name>", "severity": "<high|medium|low>", "text": "<problematic phrase>", "fix": "<suggested fix>", "explanation": "<brief reason>"}
  ],
  "tone": "<detected tone>",
  "readingLevel": "<grade level>",
  "wordCount": <number>
}

Provide 3-7 specific, actionable suggestions. Target tone context: ${toneLabel}.

Text to analyze:
${content}`
          }],
          stream: false,
        }),
      })
      const data = await res.json()
      const raw = data.content || ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      const parsed: AnalysisResult = JSON.parse(jsonMatch[0])
      setAnalysis(parsed)
      setRightTab('issues')
      toast.success('Analysis complete!')
    } catch {
      toast.error('Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  /* ── Apply suggestion fix ── */
  const applySuggestionFix = (fix: string, original: string) => {
    if (original && content.includes(original)) {
      pushHistory(content)
      setContent(content.replace(original, fix))
      toast.success('Fix applied!')
    } else {
      navigator.clipboard.writeText(fix)
      toast.success('Fix copied to clipboard!')
    }
  }

  /* ── Export ── */
  const exportDoc = (fmt: 'txt' | 'md') => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'document'}.${fmt}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported as .${fmt}`)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content).then(() => toast.success('Copied to clipboard!'))
  }

  /* ── Issues / style filtered ── */
  const issueSuggestions  = analysis?.suggestions.filter(s => s.severity === 'high' || s.severity === 'medium') || []
  const styleSuggestions  = analysis?.suggestions.filter(s => s.severity === 'low') || []

  /* ─────────────────── RENDER ─────────────────────────────────────── */
  return (
    <div className="h-full flex flex-col bg-bg text-text-primary overflow-hidden select-none">

      {/* ── Top Header Bar ── */}
      <div className="flex-shrink-0 h-12 border-b border-border flex items-center px-4 gap-3 bg-bg z-20">
        {/* Brand */}
        <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
          <PenLine className="w-3.5 h-3.5 text-white" />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingTitle(false) }}
              className="bg-transparent border-b border-violet-500 outline-none text-sm font-semibold text-text-primary w-48 pb-0.5"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.select(), 50) }}
              className="text-sm font-semibold text-text-primary hover:text-violet-400 transition-colors truncate max-w-xs block"
              title="Click to rename"
            >
              {title}
            </button>
          )}
        </div>

        {/* Save indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
          {lastSaved ? (
            <span className="flex items-center gap-1 text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Saved
            </span>
          ) : (
            <span className="text-text-tertiary">Unsaved</span>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button onClick={handleUndo} disabled={!history.length}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 transition-all">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleRedo} disabled={!redoStack.length}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 transition-all">
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export actions */}
        <div className="flex items-center gap-1.5">
          <button onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover border border-border rounded-lg transition-all">
            <Copy className="w-3.5 h-3.5" /> Copy
          </button>
          <button onClick={() => exportDoc('txt')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover border border-border rounded-lg transition-all">
            <FileDown className="w-3.5 h-3.5" /> .txt
          </button>
          <button onClick={() => exportDoc('md')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover border border-border rounded-lg transition-all">
            <Download className="w-3.5 h-3.5" /> .md
          </button>
        </div>

        {/* Toggle right panel */}
        <button onClick={() => setRightOpen(o => !o)}
          title={rightOpen ? 'Hide AI Panel' : 'Show AI Panel'}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-all">
          {rightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Three-panel body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ══ LEFT SIDEBAR (240px) ══════════════════════════════════════ */}
        <div className="w-60 flex-shrink-0 border-r border-border flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar scrollable bg-sidebar">

          {/* Document Stats */}
          <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-3">Document Stats</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Words',      value: words.toLocaleString() },
                { label: 'Sentences',  value: sentences.toLocaleString() },
                { label: 'Paragraphs', value: paragraphs.toLocaleString() },
                { label: 'Read Time',  value: `${readTime} min` },
              ].map(s => (
                <div key={s.label} className="bg-surface rounded-lg p-2.5">
                  <p className="text-[10px] text-text-tertiary">{s.label}</p>
                  <p className="text-sm font-bold text-text-primary mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 bg-surface rounded-lg p-2.5">
              <p className="text-[10px] text-text-tertiary">Reading Level</p>
              <p className="text-xs font-semibold text-text-primary mt-0.5 truncate">{readLevel}</p>
            </div>
          </div>

          {/* Word Goal */}
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary flex items-center gap-1.5">
                <Target className="w-3 h-3" /> Word Goal
              </p>
              <select
                value={wordGoal}
                onChange={e => setWordGoal(Number(e.target.value))}
                className="text-[11px] bg-surface border border-border rounded-md px-1.5 py-0.5 text-text-secondary outline-none cursor-pointer">
                {WORD_GOALS.map(g => <option key={g} value={g}>{g.toLocaleString()}</option>)}
              </select>
            </div>
            <div className="relative h-2 bg-surface rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                  wordGoalPct >= 100 ? 'bg-emerald-400' : wordGoalPct >= 60 ? 'bg-violet-500' : 'bg-violet-500/40'
                }`}
                style={{ width: `${wordGoalPct}%` }} />
            </div>
            <p className="text-[11px] text-text-tertiary mt-1.5 text-right">
              {words} / {wordGoal.toLocaleString()} ({wordGoalPct}%)
            </p>
          </div>

          {/* Tone */}
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-2">Tone</p>
            <div className="space-y-0.5">
              {TONES.map(t => (
                <button key={t.id} onClick={() => setTone(t.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left group ${
                    tone === t.id
                      ? 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}>
                  <span className="text-sm">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium leading-tight">{t.label}</div>
                    {tone === t.id && <div className="text-[10px] opacity-60 truncate">{t.desc}</div>}
                  </div>
                  {tone === t.id && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-2 flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Audience
            </p>
            <div className="space-y-0.5">
              {AUDIENCES.map(a => (
                <button key={a.id} onClick={() => setAudience(a.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    audience === a.id
                      ? 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div className="px-4 py-3 flex-shrink-0 relative">
            <button
              onClick={() => setShowTemplates(t => !t)}
              className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-tertiary hover:text-text-primary transition-colors">
              <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> Templates</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
            {showTemplates && (
              <div className="absolute left-4 right-4 top-full -mt-1 z-30 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
                {TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.label}
                    onClick={() => {
                      pushHistory(content)
                      setContent(tmpl.content)
                      setTitle(tmpl.label)
                      setShowTemplates(false)
                      toast.success(`Template loaded: ${tmpl.label}`)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors">
                    <span className="text-base">{tmpl.icon}</span>
                    <span>{tmpl.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
        {/* ══ END LEFT SIDEBAR ═══════════════════════════════════════════ */}

        {/* ══ CENTER EDITOR ═════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Quick Actions Row */}
          <div className="flex-shrink-0 px-6 py-2.5 border-b border-border bg-bg overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-violet-400" /> Quick AI
              </span>
              {QUICK_ACTIONS.map(action => {
                const Icon = action.icon
                const isLoading = loadingAction === action.id
                return (
                  <button
                    key={action.id}
                    onClick={() => runAction(action.id)}
                    disabled={loadingAction !== null}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border rounded-lg transition-all disabled:opacity-50 flex-shrink-0 ${action.bg} ${action.color}`}>
                    {isLoading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Icon className="w-3 h-3" />
                    }
                    {action.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Editor area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 sm:px-12 pt-8 pb-4">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => handleContentChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => { setFocused(false); setFloatingToolbar(null) }}
                onSelect={handleSelectionChange}
                onMouseUp={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                placeholder="Start writing, or select a template to get started..."
                className="w-full bg-transparent outline-none resize-none text-text-primary placeholder:text-text-tertiary/50 leading-[1.85] select-text"
                style={{
                  fontSize: '17px',
                  fontFamily: 'Georgia, "Times New Roman", Charter, "Bitstream Charter", "Sitka Text", Cambria, serif',
                  minHeight: '400px',
                  caretColor: '#8b5cf6',
                }}
                spellCheck
              />
            </div>
          </div>

          {/* AI Preview Panel */}
          {(aiPreview || loadingAction) && (
            <div className="flex-shrink-0 border-t border-violet-500/30 bg-violet-500/5">
              <div className="max-w-3xl mx-auto px-6 sm:px-12 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-semibold text-violet-400">
                      {loadingAction
                        ? `${QUICK_ACTIONS.find(a => a.id === loadingAction)?.label || 'Processing'}...`
                        : `AI Result — ${QUICK_ACTIONS.find(a => a.id === aiPreviewAction)?.label || 'Output'}`
                      }
                    </span>
                    {loadingAction && <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />}
                  </div>
                  {aiPreview && !loadingAction && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(aiPreview).then(() => toast.success('Copied!'))}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary bg-surface border border-border rounded-lg transition-all">
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <button onClick={acceptPreview}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-all">
                        <CheckCircle className="w-3.5 h-3.5" /> Insert
                      </button>
                      <button onClick={replaceContent}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all">
                        <RefreshCw className="w-3.5 h-3.5" /> Replace All
                      </button>
                      <button onClick={() => { setAiPreview(''); setAiPreviewAction('') }}
                        className="p-1.5 text-text-tertiary hover:text-red-400 rounded-lg transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {loadingAction ? (
                  <div className="flex gap-1.5 py-2">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto"
                    style={{ fontFamily: 'Georgia, "Times New Roman", Charter, serif' }}>
                    {aiPreview}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status bar */}
          <div className="flex-shrink-0 h-8 border-t border-border px-4 flex items-center justify-between text-[11px] text-text-tertiary bg-sidebar">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{words.toLocaleString()} words</span>
              <span>{sentences} sentences</span>
              <span>{paragraphs} paragraphs</span>
              <span className="hidden sm:inline">{readTime} min read</span>
            </div>
            <div className="flex items-center gap-3">
              {focused && <span className="text-violet-400/60">Editing</span>}
              <span className="capitalize hidden sm:inline">{TONES.find(t => t.id === tone)?.label} tone</span>
              {lastSaved && (
                <span className="text-emerald-400/70 flex items-center gap-1">
                  <Save className="w-3 h-3" /> Auto-saved
                </span>
              )}
            </div>
          </div>

        </div>
        {/* ══ END CENTER EDITOR ═════════════════════════════════════════ */}

        {/* ══ RIGHT AI PANEL (300px) ════════════════════════════════════ */}
        {rightOpen && (
          <div className="w-72 flex-shrink-0 border-l border-border flex flex-col overflow-hidden bg-sidebar">

            {/* Writing Score */}
            <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-3 flex items-center gap-1.5">
                <BarChart2 className="w-3 h-3" /> Writing Score
              </p>
              {analysis ? (
                <div className="flex items-center gap-4">
                  <div className="text-center flex-shrink-0">
                    <div className={`text-4xl font-black ${scoreColor(analysis.score)}`}>
                      {analysis.score}
                    </div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">/ 100</div>
                    <div className={`mt-1 text-[10px] font-bold ${scoreColor(analysis.score)}`}>
                      {analysis.score >= 80 ? 'Excellent' : analysis.score >= 60 ? 'Good' : 'Needs Work'}
                    </div>
                  </div>
                  <RadarChart
                    correctness={analysis.correctness}
                    clarity={analysis.clarity}
                    engagement={analysis.engagement}
                    delivery={analysis.delivery}
                  />
                </div>
              ) : (
                <div className="text-center py-3">
                  <div className="text-5xl font-black text-text-tertiary/20">—</div>
                  <p className="text-[11px] text-text-tertiary mt-2 leading-relaxed">
                    Click Analyze to get your writing score
                  </p>
                </div>
              )}

              {/* Sub-scores */}
              {analysis && (
                <div className="mt-3 space-y-1.5">
                  {[
                    { label: 'Correctness', val: analysis.correctness },
                    { label: 'Clarity',     val: analysis.clarity },
                    { label: 'Engagement',  val: analysis.engagement },
                    { label: 'Delivery',    val: analysis.delivery },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-[10px] text-text-tertiary w-20 flex-shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBg(val)} transition-all duration-700`}
                          style={{ width: `${val}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold w-6 text-right flex-shrink-0 ${scoreColor(val)}`}>{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Analyze button */}
              <button
                onClick={analyzeWriting}
                disabled={analyzing || words < 10}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20">
                {analyzing
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Analyze Writing</>
                }
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border flex-shrink-0">
              {([
                { id: 'issues', label: 'Issues', count: issueSuggestions.length },
                { id: 'style',  label: 'Style',  count: styleSuggestions.length },
                { id: 'tone',   label: 'Tone',   count: 0 },
              ] as { id: RightTab; label: string; count: number }[]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setRightTab(tab.id)}
                  className={`flex-1 py-2.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all border-b-2 ${
                    rightTab === tab.id
                      ? 'text-violet-400 border-violet-500'
                      : 'text-text-tertiary border-transparent hover:text-text-secondary'
                  }`}>
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                      rightTab === tab.id ? 'bg-violet-500 text-white' : 'bg-surface text-text-tertiary'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {rightTab === 'issues' && (
                <>
                  {!analysis && (
                    <div className="text-center py-8">
                      <Lightbulb className="w-8 h-8 text-text-tertiary/30 mx-auto mb-3" />
                      <p className="text-xs text-text-tertiary leading-relaxed">
                        Analyze your writing to see grammar, clarity, and style issues
                      </p>
                    </div>
                  )}
                  {analysis && issueSuggestions.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-8 h-8 text-emerald-400/50 mx-auto mb-3" />
                      <p className="text-xs text-text-tertiary">No critical issues found!</p>
                    </div>
                  )}
                  {issueSuggestions.map((s, i) => (
                    <SuggestionCard key={i} s={s} onApply={applySuggestionFix} />
                  ))}
                </>
              )}

              {rightTab === 'style' && (
                <>
                  {!analysis && (
                    <div className="text-center py-8">
                      <Search className="w-8 h-8 text-text-tertiary/30 mx-auto mb-3" />
                      <p className="text-xs text-text-tertiary leading-relaxed">
                        Analyze your writing to get style improvement suggestions
                      </p>
                    </div>
                  )}
                  {analysis && styleSuggestions.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-8 h-8 text-emerald-400/50 mx-auto mb-3" />
                      <p className="text-xs text-text-tertiary">Style looks great!</p>
                    </div>
                  )}
                  {styleSuggestions.map((s, i) => (
                    <SuggestionCard key={i} s={s} onApply={applySuggestionFix} />
                  ))}
                </>
              )}

              {rightTab === 'tone' && (
                <div className="space-y-3">
                  {!analysis ? (
                    <div className="text-center py-8">
                      <Type className="w-8 h-8 text-text-tertiary/30 mx-auto mb-3" />
                      <p className="text-xs text-text-tertiary leading-relaxed">
                        Analyze your writing to see tone detection results
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-surface border border-border rounded-xl p-3.5">
                        <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Detected Tone</p>
                        <p className="text-sm font-bold text-text-primary">{analysis.tone}</p>
                      </div>
                      <div className="bg-surface border border-border rounded-xl p-3.5">
                        <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Reading Level</p>
                        <p className="text-sm font-bold text-text-primary">{analysis.readingLevel}</p>
                      </div>
                      <div className="bg-surface border border-border rounded-xl p-3.5">
                        <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Target Tone</p>
                        <p className="text-sm font-bold text-violet-400 capitalize">{tone}</p>
                      </div>
                      {analysis.tone?.toLowerCase() !== tone && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                          <p className="font-semibold mb-1">Tone Mismatch</p>
                          <p className="opacity-80 leading-relaxed">
                            Your writing reads as <strong>{analysis.tone}</strong> but your target tone is <strong className="capitalize">{tone}</strong>.
                            Use the "Change Tone" quick action to align them.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bottom tip */}
            <div className="px-3 pb-3 pt-2 border-t border-border flex-shrink-0">
              <div className="p-2.5 bg-violet-500/5 border border-violet-500/15 rounded-xl">
                <p className="text-[10px] text-text-tertiary leading-relaxed">
                  <span className="text-violet-400 font-semibold">Tip:</span> Select text in the editor before using Quick AI actions to apply changes to just that selection.
                </p>
              </div>
            </div>

          </div>
        )}
        {/* ══ END RIGHT PANEL ═══════════════════════════════════════════ */}

      </div>
    </div>
  )
}
