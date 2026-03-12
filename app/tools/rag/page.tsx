'use client'
import { useState, useRef, useCallback, useMemo } from 'react'
import {
  FileText, Send, Loader2, Trash2, Upload, X, ChevronDown, ChevronUp,
  Download, Copy, BookOpen, Layers, Search, Sparkles, CheckCircle2,
  File, FileCode, FileSpreadsheet, AlertCircle, BarChart2, Quote,
  MessageSquare, Zap, FileQuestion, ScanText, GitCompare, Hash
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

/* ─── Types ─────────────────────────────────────────────── */
interface DocRecord {
  id: string
  name: string
  text: string
  chunks: string[]
  vocab: string[]
  embeddings: number[][]
  wordCount: number
  readTime: number
  size: string
  type: string
  pageEstimate: number
  status: 'processing' | 'ready'
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  chunks?: { chunk: string; docName: string; score: number }[]
  docIds?: string[]
  showSources?: boolean
  confidence?: number
}

/* ─── TF-IDF helpers ─────────────────────────────────────── */
const STOP = new Set(['the','a','an','is','are','was','were','to','of','in','on','at','it','its','and','or','but','for','with','this','that','these','those','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','not','no','from','by','as','we','you','he','she','they','i','me','my','our','your','their','him','her','us','all','any','each','every','more','most','other','such','than','then','there','also','into','up','out','if','so'])

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2 }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

function embed(text: string, vocab: string[]): number[] {
  const words = text.toLowerCase().split(/\W+/)
  return vocab.map(w => words.filter(x => x === w).length / (words.length || 1))
}

function buildVocab(texts: string[]): string[] {
  const freq: Record<string, number> = {}
  for (const t of texts) {
    for (const w of t.toLowerCase().split(/\W+/)) {
      if (w.length > 2 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1
    }
  }
  return Object.entries(freq)
    .filter(([, f]) => f >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 500)
    .map(([w]) => w)
}

function processDocument(name: string, text: string, fileSize: number): DocRecord {
  const sentences = text.split(/(?<=[.!?])\s+|\n{2,}/).filter(s => s.trim().length > 20)
  const chunkSize = 4
  const chunks: string[] = []
  for (let i = 0; i < sentences.length; i += chunkSize) {
    chunks.push(sentences.slice(i, i + chunkSize).join(' '))
  }
  const vocab = buildVocab([text])
  const embeddings = chunks.map(c => embed(c, vocab))
  const words = text.split(/\s+/).filter(Boolean)
  const ext = name.split('.').pop()?.toLowerCase() || 'txt'
  const typeMap: Record<string, string> = { pdf: 'PDF', docx: 'Word', doc: 'Word', xlsx: 'Excel', xls: 'Excel', csv: 'CSV', txt: 'Text', md: 'Markdown', json: 'JSON', py: 'Python', js: 'JavaScript', ts: 'TypeScript', html: 'HTML' }
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name, text, chunks, vocab, embeddings,
    wordCount: words.length,
    readTime: Math.max(1, Math.ceil(words.length / 200)),
    size: fileSize < 1024 ? `${fileSize}B` : fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)}KB` : `${(fileSize / 1024 / 1024).toFixed(1)}MB`,
    type: typeMap[ext] || ext.toUpperCase(),
    pageEstimate: Math.max(1, Math.ceil(words.length / 250)),
    status: 'ready',
  }
}

function retrieveAcrossDocs(query: string, docs: DocRecord[], topK = 6): { chunk: string; docName: string; score: number }[] {
  if (!docs.length) return []
  const results: { chunk: string; docName: string; score: number }[] = []
  for (const doc of docs) {
    if (!doc.chunks.length) continue
    const qEmb = embed(query, doc.vocab)
    for (let i = 0; i < doc.chunks.length; i++) {
      results.push({ chunk: doc.chunks[i], docName: doc.name, score: cosineSim(qEmb, doc.embeddings[i]) })
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, topK)
}

function getFileIcon(type: string) {
  if (['PDF', 'Word'].includes(type)) return FileText
  if (['Excel', 'CSV'].includes(type)) return FileSpreadsheet
  if (['Python', 'JavaScript', 'TypeScript', 'HTML', 'JSON'].includes(type)) return FileCode
  return File
}

function getFileColor(type: string): string {
  if (type === 'PDF') return '#ef4444'
  if (type === 'Word') return '#3b82f6'
  if (['Excel', 'CSV'].includes(type)) return '#22c55e'
  if (['Python', 'JavaScript', 'TypeScript'].includes(type)) return '#f59e0b'
  if (type === 'HTML') return '#f97316'
  if (type === 'JSON') return '#a855f7'
  return '#6b7280'
}

const SMART_STARTERS = [
  { icon: ScanText, label: 'Summarize all documents', query: 'Provide a comprehensive summary of all the documents' },
  { icon: Hash, label: 'What are the key themes?', query: 'What are the main themes and topics covered across these documents?' },
  { icon: FileQuestion, label: 'List key facts & figures', query: 'List the most important facts, statistics, and figures mentioned' },
  { icon: GitCompare, label: 'Compare documents', query: 'Compare and contrast the main points across all the documents' },
  { icon: Zap, label: 'Recommendations & actions', query: 'What actions or recommendations are suggested in these documents?' },
  { icon: MessageSquare, label: 'Explain in simple terms', query: 'Explain the content of these documents in simple, plain language' },
]

/* ─── Component ──────────────────────────────────────────── */
export default function RAGPage() {
  const [docs, setDocs] = useState<DocRecord[]>([])
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteMode, setPasteMode] = useState(false)
  const [docSearch, setDocSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)
  const fileRef2 = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const activeDocs = useMemo(() => {
    if (activeDocId === null) return docs
    return docs.filter(d => d.id === activeDocId)
  }, [docs, activeDocId])

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    if (docs.length + fileArr.length > 5) { toast.error('Max 5 documents at once'); return }

    for (const file of fileArr) {
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name}: too large (max 20MB)`); continue }
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const binaryExts = ['pdf', 'doc', 'docx', 'xlsx', 'xls', 'pptx', 'ppt']
      const toastId = toast.loading(`Analyzing ${file.name}…`)
      setProcessingFiles(prev => new Set([...prev, file.name]))

      try {
        let text = ''
        if (binaryExts.includes(ext)) {
          const form = new FormData(); form.append('file', file)
          const res = await fetch('/api/parse-file', { method: 'POST', body: form })
          const data = await res.json()
          if (!res.ok) { toast.error(data.error || 'Failed to parse', { id: toastId }); continue }
          text = data.text
        } else {
          text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = e => resolve(e.target?.result as string)
            reader.onerror = reject
            reader.readAsText(file)
          })
        }
        const doc = processDocument(file.name, text, file.size)
        setDocs(prev => [...prev, doc])
        toast.success(`${file.name} indexed — ${doc.chunks.length} chunks`, { id: toastId })
      } catch {
        toast.error(`Failed to load ${file.name}`, { id: toastId })
      } finally {
        setProcessingFiles(prev => { const n = new Set(prev); n.delete(file.name); return n })
      }
    }
  }, [docs.length])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const addPastedDoc = () => {
    if (!pasteText.trim()) return
    const doc = processDocument(`Pasted Document ${docs.length + 1}.txt`, pasteText, pasteText.length)
    setDocs(prev => [...prev, doc])
    setPasteText(''); setPasteMode(false)
    toast.success(`Pasted text indexed — ${doc.chunks.length} chunks`)
  }

  const removeDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id))
    if (activeDocId === id) setActiveDocId(null)
  }

  const send = async (overrideInput?: string) => {
    const q = (overrideInput ?? input).trim()
    if (!q || loading || !docs.length) return
    setInput('')
    setLoading(true)

    const topChunks = retrieveAcrossDocs(q, activeDocs)
    const context = topChunks.map((r, i) => `[${i + 1}] (from "${r.docName}")\n${r.chunk}`).join('\n\n')
    const docNames = [...new Set(topChunks.map(r => r.docName))]
    const avgScore = topChunks.length ? topChunks.reduce((a, r) => a + r.score, 0) / topChunks.length : 0
    const confidence = Math.min(100, Math.round(avgScore * 400 + topChunks.length * 8))

    const userMsg: Message = { role: 'user', content: q }
    const assistantMsg: Message = {
      role: 'assistant', content: '', chunks: topChunks, docIds: docNames,
      showSources: false, confidence
    }
    setMessages(prev => [...prev, userMsg, assistantMsg])
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 45000)
      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemPrompt: `You are an expert document intelligence assistant. Answer questions ONLY based on the provided document context. Always cite which document you used (e.g., "According to [Document Name]..."). If the answer isn't in the context, say so clearly. Provide well-structured, comprehensive answers using markdown formatting.`,
          messages: [
            ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: `Document Context:\n${context || 'No relevant context found.'}\n\nQuestion: ${q}` }
          ],
          stream: false,
        }),
      })
      clearTimeout(timer)
      const data = await res.json()
      const content = data.content || data.error || 'Empty response.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], content }
        return updated
      })
    } catch (e: any) {
      const msg = e.name === 'AbortError' ? 'Request timed out.' : 'Error connecting to AI.'
      setMessages(prev => {
        const updated = [...prev]; updated[updated.length - 1] = { ...updated[updated.length - 1], content: msg }; return updated
      })
    } finally {
      setLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  const toggleSources = (idx: number) => {
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, showSources: !m.showSources } : m))
  }

  const copyMsg = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!'))
  }

  const exportConvo = () => {
    const md = messages.map(m => `**${m.role === 'user' ? 'You' : 'Document Intelligence'}:**\n${m.content}`).join('\n\n---\n\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'document-qa.md'
    a.click(); URL.revokeObjectURL(url)
    toast.success('Conversation exported!')
  }

  const clearChat = () => { setMessages([]); toast.success('Chat cleared') }

  const filteredDocs = useMemo(() =>
    docs.filter(d => d.name.toLowerCase().includes(docSearch.toLowerCase())),
    [docs, docSearch]
  )

  /* ── Empty state ── */
  if (!docs.length) {
    return (
      <div className="h-full flex flex-col bg-bg text-text-primary">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex-shrink-0 bg-bg">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BookOpen className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="font-bold text-base text-text-primary tracking-tight">Document Intelligence</h1>
              <p className="text-xs text-text-tertiary">Upload documents and ask questions — AI finds answers with exact source citations</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">TF-IDF RAG</span>
              <span className="text-xs bg-surface text-text-tertiary border border-border px-2.5 py-1 rounded-full">Up to 5 docs · 20MB each</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-10">
          <div className="max-w-2xl mx-auto">
            {/* Upload zone */}
            <div
              onDragEnter={e => { e.preventDefault(); setDragging(true) }}
              onDragOver={e => e.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-5 p-14 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 mb-6 ${
                dragging
                  ? 'border-emerald-400 bg-emerald-500/8 scale-[1.01] shadow-lg shadow-emerald-500/10'
                  : 'border-border hover:border-emerald-500/50 hover:bg-emerald-500/3'
              }`}
              style={{ background: dragging ? 'rgba(16,185,129,0.04)' : undefined }}
            >
              {/* Gradient shimmer on hover */}
              <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none ${dragging ? 'opacity-100' : 'opacity-0'}`}
                style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />

              <div className={`w-18 h-18 rounded-2xl flex items-center justify-center transition-all duration-200 ${dragging ? 'bg-emerald-500/20 scale-110' : 'bg-surface border border-border'}`}
                style={{ width: 72, height: 72 }}>
                <Upload className={`w-8 h-8 transition-colors duration-200 ${dragging ? 'text-emerald-400' : 'text-text-tertiary'}`} style={{ width: 28, height: 28 }} />
              </div>

              <div className="text-center">
                <p className={`font-semibold text-base mb-1.5 transition-colors ${dragging ? 'text-emerald-400' : 'text-text-primary'}`}>
                  {dragging ? 'Drop your documents here' : 'Drop documents here or click to upload'}
                </p>
                <p className="text-sm text-text-tertiary">Supports PDF, Word, Excel, CSV, Markdown, JSON, and code files</p>
              </div>

              {/* File type chips */}
              <div className="flex gap-2 flex-wrap justify-center">
                {[
                  { label: 'PDF', color: '#ef4444' },
                  { label: 'DOCX', color: '#3b82f6' },
                  { label: 'XLSX', color: '#22c55e' },
                  { label: 'CSV', color: '#22c55e' },
                  { label: 'TXT', color: '#6b7280' },
                  { label: 'MD', color: '#8b5cf6' },
                  { label: 'JSON', color: '#a855f7' },
                  { label: 'PY / JS / TS', color: '#f59e0b' },
                ].map(f => (
                  <span key={f.label} className="text-xs px-2.5 py-1 bg-surface border border-border rounded-full text-text-tertiary font-medium"
                    style={{ borderColor: `${f.color}30`, color: f.color, background: `${f.color}08` }}>
                    {f.label}
                  </span>
                ))}
              </div>

              <input ref={fileRef} type="file" multiple
                accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt,.py,.js,.ts,.html,.xml,.yaml,.yml"
                className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
            </div>

            {/* Paste divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-tertiary">or paste text directly</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {pasteMode ? (
              <div>
                <textarea
                  value={pasteText} onChange={e => setPasteText(e.target.value)}
                  placeholder="Paste your document text here…"
                  rows={10}
                  className="w-full bg-surface border border-border focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none transition-all mb-3"
                />
                <div className="flex gap-2">
                  <button onClick={addPastedDoc} disabled={!pasteText.trim()}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-all">
                    Index Document
                  </button>
                  <button onClick={() => { setPasteMode(false); setPasteText('') }}
                    className="px-4 py-2.5 bg-surface hover:bg-surface-hover border border-border rounded-xl text-sm transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setPasteMode(true)}
                className="w-full py-3 bg-surface hover:bg-surface-hover border border-border rounded-xl text-sm text-text-secondary hover:text-text-primary transition-all">
                Paste text manually
              </button>
            )}

            {/* Feature grid */}
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { icon: Layers, label: 'Multi-Document', desc: 'Query up to 5 docs simultaneously', color: 'text-emerald-400' },
                { icon: Search, label: 'Semantic Search', desc: 'TF-IDF powered chunk retrieval', color: 'text-blue-400' },
                { icon: Quote, label: 'Source Citations', desc: 'Every answer is fully traceable', color: 'text-violet-400' },
              ].map(f => (
                <div key={f.label} className="p-4 bg-surface border border-border rounded-xl text-center hover:border-emerald-500/20 transition-all">
                  <f.icon className={`w-5 h-5 ${f.color} mx-auto mb-2`} />
                  <p className="text-xs font-semibold text-text-primary mb-1">{f.label}</p>
                  <p className="text-xs text-text-tertiary leading-snug">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Main UI ── */
  return (
    <div className="h-full flex bg-bg text-text-primary overflow-hidden">
      {/* ── Left Sidebar — Document Library ── */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-bg" style={{ minWidth: 280 }}>
        {/* Sidebar header */}
        <div className="px-3 pt-3 pb-2 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-text-primary uppercase tracking-widest">Library</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              {docs.length}/5 docs
            </span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-surface border border-border rounded-lg">
            <Search className="w-3 h-3 text-text-tertiary flex-shrink-0" />
            <input value={docSearch} onChange={e => setDocSearch(e.target.value)}
              placeholder="Filter documents…"
              className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-tertiary" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {/* All Documents chip */}
          <button onClick={() => setActiveDocId(null)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all ${
              activeDocId === null
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-transparent'
            }`}>
            <Layers className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-left font-semibold">All Documents</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-border font-medium">{docs.length}</span>
          </button>

          {/* Separator */}
          <div className="h-px bg-border mx-2 my-1" />

          {filteredDocs.map(doc => {
            const Icon = getFileIcon(doc.type)
            const color = getFileColor(doc.type)
            const isActive = activeDocId === doc.id
            return (
              <div key={doc.id}
                className={`group flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-emerald-500/8 border border-emerald-500/25'
                    : 'hover:bg-surface-hover border border-transparent hover:border-border'
                }`}
                onClick={() => setActiveDocId(doc.id === activeDocId ? null : doc.id)}>

                {/* File type icon */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-primary truncate leading-snug">{doc.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {/* Status dot */}
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="text-[10px] text-emerald-500 font-medium">Ready</span>
                  </div>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {doc.wordCount.toLocaleString()} words · ~{doc.pageEstimate}p · {doc.size}
                  </p>
                </div>

                <button onClick={e => { e.stopPropagation(); removeDoc(doc.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all text-text-tertiary flex-shrink-0 rounded hover:bg-red-500/10 mt-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Add more docs button */}
        {docs.length < 5 && (
          <div className="px-2 pb-3 pt-2 border-t border-border flex-shrink-0">
            <button onClick={() => fileRef2.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-xs text-text-tertiary hover:text-emerald-400 hover:border-emerald-500/40 transition-all hover:bg-emerald-500/3">
              <Upload className="w-3 h-3" />
              Add document ({docs.length}/5)
            </button>
            <input ref={fileRef2} type="file" multiple
              accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.xlsx,.xls,.py,.js,.ts,.html"
              className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
          </div>
        )}
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-bg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow shadow-emerald-500/20">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Document Intelligence</p>
              <p className="text-xs text-text-tertiary">
                {activeDocId
                  ? `Querying: ${docs.find(d => d.id === activeDocId)?.name}`
                  : `Querying all ${docs.length} document${docs.length > 1 ? 's' : ''} · ${activeDocs.reduce((a, d) => a + d.chunks.length, 0)} chunks`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <>
                <button onClick={exportConvo}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover rounded-lg border border-border transition-all">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
                <button onClick={clearChat}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-red-400 bg-surface hover:bg-surface-hover rounded-lg border border-border transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Welcome / Smart starters */}
            {messages.length === 0 && (
              <div className="text-center py-6">
                {/* Doc icons row */}
                <div className="flex justify-center gap-2 mb-5">
                  {docs.slice(0, 4).map(doc => {
                    const Icon = getFileIcon(doc.type)
                    const color = getFileColor(doc.type)
                    return (
                      <div key={doc.id} className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                    )
                  })}
                  {docs.length > 4 && (
                    <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-xs text-text-tertiary font-semibold">
                      +{docs.length - 4}
                    </div>
                  )}
                </div>

                <p className="font-bold text-text-primary text-base mb-1">
                  Ask me anything about your document{docs.length > 1 ? 's' : ''}
                </p>
                <p className="text-text-tertiary text-sm mb-7">
                  {docs.length > 1
                    ? `${docs.length} documents · ${activeDocs.reduce((a, d) => a + d.chunks.length, 0)} semantic chunks indexed`
                    : `${docs[0].wordCount.toLocaleString()} words · ${docs[0].chunks.length} chunks · ~${docs[0].pageEstimate} pages`}
                </p>

                {/* Smart starter chips */}
                <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto">
                  {SMART_STARTERS.map(s => (
                    <button key={s.label} onClick={() => send(s.query)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-border rounded-xl text-xs text-text-secondary hover:text-text-primary hover:border-emerald-500/40 hover:bg-emerald-500/3 transition-all text-left">
                      <s.icon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mt-1 shadow shadow-emerald-500/20">
                    <BookOpen className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                <div className={`max-w-[80%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                  {/* Bubble */}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-surface border border-border text-text-primary rounded-bl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || ''}</ReactMarkdown>
                        {loading && i === messages.length - 1 && !msg.content && (
                          <span className="inline-flex gap-1 ml-1">
                            {[0,1,2].map(j => (
                              <span key={j} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${j * 0.12}s` }} />
                            ))}
                          </span>
                        )}
                      </div>
                    ) : msg.content}
                  </div>

                  {/* Citation chips + metadata row */}
                  {msg.role === 'assistant' && msg.content && msg.chunks && msg.chunks.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 px-1">
                      {/* Doc citation chips */}
                      {[...new Set(msg.chunks.map(c => c.docName))].map((name, ci) => (
                        <span key={ci} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium cursor-default">
                          {name.length > 20 ? name.slice(0, 18) + '…' : name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Confidence + actions row */}
                  {msg.role === 'assistant' && msg.content && (
                    <div className="flex items-center gap-3 px-1 flex-wrap">
                      {/* Confidence bar */}
                      {msg.confidence !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <BarChart2 className="w-3 h-3 text-text-tertiary" />
                          <div className="w-16 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{
                                width: `${msg.confidence}%`,
                                background: msg.confidence > 60 ? '#10b981' : msg.confidence > 30 ? '#f59e0b' : '#6b7280'
                              }} />
                          </div>
                          <span className="text-[10px] text-text-tertiary">{msg.confidence}% match</span>
                        </div>
                      )}

                      {/* Found in X docs */}
                      {msg.docIds && msg.docIds.length > 0 && (
                        <span className="text-[10px] text-text-tertiary">
                          Found in {msg.docIds.length} doc{msg.docIds.length > 1 ? 's' : ''}
                        </span>
                      )}

                      <button onClick={() => copyMsg(msg.content)}
                        className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors ml-auto">
                        <Copy className="w-3 h-3" /> Copy
                      </button>

                      {msg.chunks && msg.chunks.length > 0 && (
                        <button onClick={() => toggleSources(i)}
                          className="flex items-center gap-1 text-[11px] text-emerald-500 hover:text-emerald-400 transition-colors">
                          {msg.showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {msg.showSources ? 'Hide' : 'Show'} {msg.chunks.length} source{msg.chunks.length > 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Source cards — expanded inline */}
                  {msg.showSources && msg.chunks && (
                    <div className="space-y-2 w-full mt-1">
                      {msg.chunks.map((src, ci) => {
                        const Icon = getFileIcon(
                          docs.find(d => d.name === src.docName)?.type || 'txt'
                        )
                        const color = getFileColor(docs.find(d => d.name === src.docName)?.type || 'txt')
                        const scorePercent = Math.round(src.score * 100)
                        return (
                          <div key={ci} className="px-3.5 py-3 bg-surface border border-border rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                                style={{ background: `${color}15` }}>
                                <Icon className="w-3 h-3" style={{ color }} />
                              </div>
                              <span className="text-[11px] font-semibold text-text-primary flex-1 truncate">{src.docName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium flex-shrink-0">
                                {scorePercent}% match
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Quote className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-text-secondary leading-relaxed line-clamp-4 italic">{src.chunk}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0 bg-bg">
          <div className="max-w-3xl mx-auto">
            <div className={`flex gap-3 bg-surface border rounded-2xl px-4 py-3 transition-all ${focused ? 'border-emerald-500/50 shadow-sm shadow-emerald-500/10' : 'border-border'}`}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={docs.length ? 'Ask anything about your documents…' : 'Load a document first…'}
                rows={1}
                disabled={!docs.length}
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none"
              />
              <button onClick={() => send()} disabled={loading || !input.trim() || !docs.length}
                className="self-end px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl transition-all flex-shrink-0 shadow shadow-emerald-500/20">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-center text-xs text-text-tertiary mt-2">
              {activeDocId ? `Querying 1 document` : `Querying ${docs.length} document${docs.length > 1 ? 's' : ''}`}
              {' · '}{activeDocs.reduce((a, d) => a + d.chunks.length, 0)} chunks indexed
              {' · '}Enter to send, Shift+Enter for newline
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
