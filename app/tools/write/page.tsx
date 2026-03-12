'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  PenLine, Sparkles, Download, Copy, Trash2, FileText,
  Loader2, ChevronDown, RotateCcw, Save, Eye, EyeOff,
  AlignLeft, Wand2, Scissors, Maximize2, Minimize2, Type,
  BookOpen, Zap, CheckCircle, X, Hash
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

/* ─── Types ────────────────────────────────────── */
type Tone = 'professional' | 'casual' | 'creative' | 'academic' | 'persuasive'

interface AICommand {
  id: string
  label: string
  icon: React.ElementType
  color: string
  prompt: (text: string, tone: Tone) => string
}

/* ─── AI Commands ────────────────────────────── */
const AI_COMMANDS: AICommand[] = [
  {
    id: 'write',
    label: 'Write / Continue',
    icon: PenLine,
    color: 'text-indigo-400',
    prompt: (text, tone) => `You are a ${tone} writer. ${text ? `Continue this text naturally:\n\n${text}\n\nWrite the next 2-3 paragraphs.` : `Write a compelling opening paragraph on the topic: "${text || 'general content'}". Then continue with 2 more paragraphs.`}`,
  },
  {
    id: 'improve',
    label: 'Improve Writing',
    icon: Wand2,
    color: 'text-violet-400',
    prompt: (text, tone) => `Improve this text significantly. Make it more engaging, clearer, and ${tone}. Fix grammar, enhance vocabulary, and improve flow. Return only the improved text:\n\n${text}`,
  },
  {
    id: 'summarize',
    label: 'Summarize',
    icon: Scissors,
    color: 'text-blue-400',
    prompt: (text, tone) => `Write a concise, ${tone} summary of this text in 2-3 sentences:\n\n${text}`,
  },
  {
    id: 'expand',
    label: 'Make Longer',
    icon: Maximize2,
    color: 'text-green-400',
    prompt: (text, tone) => `Expand this text with more details, examples, and context. Keep the ${tone} tone and double the length. Return only the expanded text:\n\n${text}`,
  },
  {
    id: 'shorten',
    label: 'Make Shorter',
    icon: Minimize2,
    color: 'text-amber-400',
    prompt: (text, tone) => `Make this text more concise. Cut it to 50% of the original length while keeping all key points. Keep the ${tone} tone:\n\n${text}`,
  },
  {
    id: 'fix',
    label: 'Fix Grammar',
    icon: CheckCircle,
    color: 'text-emerald-400',
    prompt: (text) => `Fix all grammar, spelling, punctuation, and style issues in this text. Return only the corrected text:\n\n${text}`,
  },
  {
    id: 'tone',
    label: 'Change Tone',
    icon: Type,
    color: 'text-pink-400',
    prompt: (text, tone) => `Rewrite this text with a ${tone} tone. Keep the same meaning but adapt the language, formality, and style. Return only the rewritten text:\n\n${text}`,
  },
  {
    id: 'bullets',
    label: 'Convert to Bullets',
    icon: AlignLeft,
    color: 'text-cyan-400',
    prompt: (text) => `Convert this text into a well-organized bullet point list. Use markdown format with - for bullets and ## for section headers if needed:\n\n${text}`,
  },
  {
    id: 'outline',
    label: 'Create Outline',
    icon: Hash,
    color: 'text-orange-400',
    prompt: (text, tone) => `Create a detailed ${tone} outline for this content. Use markdown headers (##, ###) and bullet points. Include introduction, main sections, and conclusion:\n\n${text || 'Create a blank outline structure for a professional document'}`,
  },
  {
    id: 'paraphrase',
    label: 'Paraphrase',
    icon: RotateCcw,
    color: 'text-red-400',
    prompt: (text, tone) => `Paraphrase this text completely in a fresh ${tone} way. Same meaning, totally different wording:\n\n${text}`,
  },
]

const TONES: { id: Tone; label: string; emoji: string }[] = [
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'casual', label: 'Casual', emoji: '😊' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'academic', label: 'Academic', emoji: '🎓' },
  { id: 'persuasive', label: 'Persuasive', emoji: '🎯' },
]

const TEMPLATES = [
  { label: 'Blog Post', emoji: '📝', content: '# Blog Post Title\n\n## Introduction\n\nWrite your hook here...\n\n## Main Point 1\n\nContent here...\n\n## Main Point 2\n\nContent here...\n\n## Conclusion\n\nWrap it up here...' },
  { label: 'Email', emoji: '📧', content: 'Subject: \n\nDear [Name],\n\nI hope this email finds you well.\n\n[Main content here]\n\nBest regards,\n[Your name]' },
  { label: 'Report', emoji: '📊', content: '# Executive Report\n\n## Executive Summary\n\n## Background\n\n## Findings\n\n## Recommendations\n\n## Conclusion' },
  { label: 'Cover Letter', emoji: '📋', content: 'Dear Hiring Manager,\n\nI am writing to express my interest in the [Position] role at [Company].\n\n[Your experience and value proposition]\n\n[Why you want to work there]\n\nThank you for your consideration.\n\nSincerely,\n[Your Name]' },
]

const AUTOSAVE_KEY = 'pyxis-write-draft'

/* ─── Component ─────────────────────────────── */
export default function WritePage() {
  const [content, setContent] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(AUTOSAVE_KEY) || ''
  })
  const [aiOutput, setAiOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeCommand, setActiveCommand] = useState<string | null>(null)
  const [tone, setTone] = useState<Tone>('professional')
  const [preview, setPreview] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showTones, setShowTones] = useState(false)
  const [focused, setFocused] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const textRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* auto-save */
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(AUTOSAVE_KEY, content)
      setLastSaved(new Date())
    }, 1500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [content])

  /* word + char stats */
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const charCount = content.length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  const handleChange = useCallback((val: string) => {
    setUndoStack(prev => [...prev.slice(-20), content])
    setContent(val)
  }, [content])

  const handleUndo = () => {
    if (!undoStack.length) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack(s => s.slice(0, -1))
    setContent(prev)
  }

  const getSelectedText = (): string => {
    const ta = textRef.current
    if (!ta) return ''
    const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd)
    return sel || content
  }

  const runCommand = async (cmd: AICommand) => {
    const text = getSelectedText()
    if (!text && cmd.id !== 'write' && cmd.id !== 'outline') {
      toast.error('Add some text first, or select text to apply this command')
      return
    }
    setLoading(true); setActiveCommand(cmd.id); setAiOutput('')

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 50000)
      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemPrompt: 'You are an expert writing assistant. Return ONLY the requested output — no meta-commentary, no "Here is..." preamble, no explanations. Just the pure written content.',
          messages: [{ role: 'user', content: cmd.prompt(text, tone) }],
          stream: false,
        }),
      })
      clearTimeout(timer)
      const data = await res.json()
      setAiOutput(data.content || data.error || '⚠️ No output.')
    } catch (e: any) {
      setAiOutput(e.name === 'AbortError' ? '⚠️ Request timed out.' : '⚠️ Error connecting to AI.')
    } finally {
      setLoading(false); setActiveCommand(null)
    }
  }

  const acceptOutput = () => {
    const ta = textRef.current
    if (!ta) { setContent(prev => prev + '\n\n' + aiOutput); setAiOutput(''); return }
    const start = ta.selectionStart; const end = ta.selectionEnd
    if (start !== end) {
      const newContent = content.slice(0, start) + aiOutput + content.slice(end)
      setContent(newContent)
    } else {
      setContent(prev => prev ? prev + '\n\n' + aiOutput : aiOutput)
    }
    setAiOutput('')
    toast.success('Output added to document!')
  }

  const exportDoc = (format: 'md' | 'txt') => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `pyxis-document.${format}`
    a.click(); URL.revokeObjectURL(url)
    toast.success(`Exported as .${format}`)
  }

  const clearDoc = () => {
    setUndoStack(prev => [...prev, content])
    setContent(''); setAiOutput(''); localStorage.removeItem(AUTOSAVE_KEY)
    toast.success('Document cleared')
  }

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
        <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <PenLine className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold">AI Writing Studio</h1>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-3 text-xs text-text-tertiary">
          <span>{wordCount.toLocaleString()} words</span>
          <span>·</span>
          <span>{charCount.toLocaleString()} chars</span>
          <span>·</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{readTime} min read</span>
          {lastSaved && <span className="flex items-center gap-1 text-emerald-500/70"><Save className="w-3 h-3" />Saved</span>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button onClick={handleUndo} disabled={!undoStack.length}
            className="p-1.5 text-text-tertiary hover:text-text-primary disabled:opacity-30 rounded-lg hover:bg-surface-hover transition-all" title="Undo">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setPreview(p => !p)}
            className={`p-1.5 rounded-lg transition-all ${preview ? 'text-violet-400 bg-violet-500/10' : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover'}`} title="Preview">
            {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <div className="relative">
            <button onClick={() => setShowTemplates(t => !t)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover border border-border rounded-lg transition-all">
              <FileText className="w-3.5 h-3.5" /> Templates <ChevronDown className="w-3 h-3" />
            </button>
            {showTemplates && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-surface border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                {TEMPLATES.map(t => (
                  <button key={t.label} onClick={() => { setContent(t.content); setShowTemplates(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors">
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => exportDoc('md')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover border border-border rounded-lg transition-all">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
          {content && <button onClick={clearDoc}
            className="p-1.5 text-text-tertiary hover:text-red-400 rounded-lg hover:bg-surface-hover transition-all" title="Clear">
            <Trash2 className="w-3.5 h-3.5" />
          </button>}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* AI Commands sidebar */}
        <div className="w-52 flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
          {/* Tone selector */}
          <div className="px-3 py-3 border-b border-border flex-shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">Writing Tone</p>
            <div className="space-y-1">
              {TONES.map(t => (
                <button key={t.id} onClick={() => setTone(t.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    tone === t.id ? 'bg-violet-500/10 text-violet-400' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Commands */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">AI Commands</p>
            <div className="space-y-1">
              {AI_COMMANDS.map(cmd => (
                <button key={cmd.id} onClick={() => runCommand(cmd)} disabled={loading}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all disabled:opacity-60 ${
                    activeCommand === cmd.id ? 'bg-violet-500/10 text-violet-400' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}>
                  <cmd.icon className={`w-3.5 h-3.5 flex-shrink-0 ${activeCommand === cmd.id ? 'text-violet-400' : cmd.color}`} />
                  <span className="flex-1 text-left">{cmd.label}</span>
                  {activeCommand === cmd.id && <Loader2 className="w-3 h-3 animate-spin" />}
                </button>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="px-3 pb-3 flex-shrink-0">
            <div className="p-2.5 bg-violet-500/5 border border-violet-500/20 rounded-xl">
              <p className="text-[10px] text-text-tertiary leading-relaxed">
                💡 <strong className="text-violet-400">Tip:</strong> Select text before running a command to apply it to that selection only
              </p>
            </div>
          </div>
        </div>

        {/* Editor / Preview */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {preview ? (
            <div className="flex-1 overflow-y-auto px-8 py-8">
              <div className="max-w-3xl mx-auto">
                {content ? (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-16 text-text-tertiary">
                    <Eye className="w-10 h-10 mx-auto mb-3" />
                    <p>Nothing to preview yet — write something!</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`flex-1 flex flex-col border transition-all ${focused ? 'border-violet-500/30' : 'border-transparent'}`}>
              <textarea
                ref={textRef}
                value={content}
                onChange={e => handleChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Start writing here… or choose a template, or let AI write for you using the commands on the left."
                className="flex-1 w-full bg-transparent text-text-primary text-[15px] leading-8 outline-none resize-none px-8 py-8 placeholder:text-text-tertiary font-mono"
                style={{ caretColor: '#a855f7' }}
              />
            </div>
          )}

          {/* AI Output panel */}
          {(aiOutput || loading) && (
            <div className="border-t border-border flex-shrink-0">
              <div className="px-6 py-4 max-h-72 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-medium text-violet-400">AI Output</span>
                    {loading && <span className="text-xs text-text-tertiary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Generating…</span>}
                  </div>
                  {aiOutput && !loading && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigator.clipboard.writeText(aiOutput).then(() => toast.success('Copied!'))}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary bg-surface border border-border rounded-lg transition-all">
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                      <button onClick={acceptOutput}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-all">
                        <CheckCircle className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button onClick={() => setAiOutput('')}
                        className="p-1.5 text-text-tertiary hover:text-red-400 rounded-lg transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="flex gap-1.5 py-4">
                    {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />)}
                  </div>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none text-text-primary">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiOutput}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status bar */}
          <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[11px] text-text-tertiary flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{wordCount} words</span>
              <span>{charCount} chars</span>
              <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{readTime} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="capitalize">{tone} tone</span>
              {preview && <span className="text-violet-400 flex items-center gap-1"><Eye className="w-3 h-3" /> Preview</span>}
              {lastSaved && <span className="text-emerald-400/70 flex items-center gap-1"><Save className="w-3 h-3" /> Auto-saved</span>}
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => exportDoc('md')} className="hover:text-text-primary transition-colors">Export MD</button>
                <span>·</span>
                <button onClick={() => exportDoc('txt')} className="hover:text-text-primary transition-colors">TXT</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
