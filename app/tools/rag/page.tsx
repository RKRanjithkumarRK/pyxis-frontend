'use client'
import { useState, useRef, useCallback, useMemo } from 'react'
import {
  FileText, Send, Loader2, Trash2, Upload, X, ChevronDown, ChevronUp,
  Download, Copy, BookOpen, Layers, Search, Sparkles, CheckCircle2,
  File, FileCode, FileSpreadsheet, AlertCircle
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
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  chunks?: string[]
  docIds?: string[]
  showSources?: boolean
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
  }
}

function retrieveAcrossDocs(query: string, docs: DocRecord[], topK = 5): { chunk: string; docName: string; score: number }[] {
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

const SMART_STARTERS = [
  'Summarize the key points of this document',
  'What are the main conclusions or findings?',
  'What problems or challenges are identified?',
  'List the most important facts and figures',
  'What actions or recommendations are suggested?',
  'Explain the document in simple terms',
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
  const fileRef = useRef<HTMLInputElement>(null)
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
      const toastId = toast.loading(`Processing ${file.name}…`)

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
        toast.success(`✓ ${file.name} indexed — ${doc.chunks.length} chunks`, { id: toastId })
      } catch {
        toast.error(`Failed to load ${file.name}`, { id: toastId })
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
    toast.success(`✓ Pasted text indexed — ${doc.chunks.length} chunks`)
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
    const chunkTexts = topChunks.map(r => `📄 ${r.docName}\n${r.chunk}`)
    const docNames = [...new Set(topChunks.map(r => r.docName))]

    const userMsg: Message = { role: 'user', content: q }
    const assistantMsg: Message = { role: 'assistant', content: '', chunks: chunkTexts, docIds: docNames, showSources: false }
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
          systemPrompt: `You are an expert document intelligence assistant. Answer questions ONLY based on the provided document context. Always cite which document and section you used (e.g., "According to [Document Name]..."). If the answer isn't in the context, say so clearly. Provide well-structured, comprehensive answers using markdown formatting.`,
          messages: [
            ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: `Document Context:\n${context || 'No relevant context found.'}\n\nQuestion: ${q}` }
          ],
          stream: false,
        }),
      })
      clearTimeout(timer)
      const data = await res.json()
      const content = data.content || data.error || '⚠️ Empty response.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], content }
        return updated
      })
    } catch (e: any) {
      const msg = e.name === 'AbortError' ? '⚠️ Request timed out.' : '⚠️ Error connecting to AI.'
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
    const md = messages.map(m => `**${m.role === 'user' ? 'You' : 'Pyxis'}:**\n${m.content}`).join('\n\n---\n\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'pyxis-doc-qa.md'
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
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-semibold">Document Intelligence</h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">RAG · Free · Up to 5 docs</span>
          </div>
          <p className="text-xs text-text-tertiary ml-11">Upload documents, then ask anything — AI will find the answers using semantic search</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Drop zone */}
            <div
              onDragEnter={e => { e.preventDefault(); setDragging(true) }}
              onDragOver={e => e.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all mb-6 ${
                dragging ? 'border-emerald-400 bg-emerald-500/5 scale-[1.01]' : 'border-border hover:border-emerald-500/40 hover:bg-emerald-500/2'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${dragging ? 'bg-emerald-500/20' : 'bg-surface'}`}>
                <Upload className={`w-7 h-7 transition-colors ${dragging ? 'text-emerald-400' : 'text-text-tertiary'}`} />
              </div>
              <div className="text-center">
                <p className="font-medium text-text-primary mb-1">
                  {dragging ? 'Drop files here' : 'Drag & drop files or click to upload'}
                </p>
                <p className="text-sm text-text-tertiary">PDF, Word, Excel, CSV, TXT, MD, JSON, Code files — up to 20MB each</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {['PDF', 'DOCX', 'XLSX', 'CSV', 'TXT', 'MD', 'JSON', 'PY', 'JS'].map(f => (
                  <span key={f} className="text-xs px-2 py-0.5 bg-surface border border-border rounded-full text-text-tertiary">{f}</span>
                ))}
              </div>
              <input ref={fileRef} type="file" multiple
                accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt,.py,.js,.ts,.html,.xml,.yaml,.yml"
                className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
            </div>

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
                📋 Paste text manually
              </button>
            )}

            {/* Feature highlights */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { icon: Layers, label: 'Multi-Document', desc: 'Query up to 5 docs at once' },
                { icon: Search, label: 'Semantic Search', desc: 'TF-IDF powered retrieval' },
                { icon: Sparkles, label: 'Source Citations', desc: 'Every answer is traceable' },
              ].map(f => (
                <div key={f.label} className="p-4 bg-surface border border-border rounded-xl text-center">
                  <f.icon className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-text-primary">{f.label}</p>
                  <p className="text-xs text-text-tertiary mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Main chat UI ── */
  return (
    <div className="h-full flex bg-bg text-text-primary overflow-hidden">
      {/* Left Sidebar — Document Library */}
      <div className="w-64 flex-shrink-0 border-r border-border flex flex-col bg-bg">
        <div className="px-3 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">Document Library</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 bg-surface rounded-lg">
            <Search className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
            <input value={docSearch} onChange={e => setDocSearch(e.target.value)}
              placeholder="Filter docs…" className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-tertiary" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {/* All Docs option */}
          <button onClick={() => setActiveDocId(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
              activeDocId === null ? 'bg-emerald-500/10 text-emerald-400' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}>
            <Layers className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-left font-medium">All Documents</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-border">{docs.length}</span>
          </button>

          {filteredDocs.map(doc => {
            const Icon = getFileIcon(doc.type)
            return (
              <div key={doc.id}
                className={`group flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeDocId === doc.id ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-surface-hover border border-transparent'
                }`}
                onClick={() => setActiveDocId(doc.id === activeDocId ? null : doc.id)}>
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${activeDocId === doc.id ? 'text-emerald-400' : 'text-text-tertiary'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate leading-tight">{doc.name}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{doc.wordCount.toLocaleString()} words · {doc.chunks.length} chunks · {doc.readTime}min</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-border text-text-tertiary">{doc.type}</span>
                    <span className="text-[10px] text-text-tertiary">{doc.size}</span>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); removeDoc(doc.id) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-all text-text-tertiary flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Add more docs */}
        {docs.length < 5 && (
          <div className="px-2 pb-3 pt-2 border-t border-border flex-shrink-0">
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border rounded-lg text-xs text-text-tertiary hover:text-emerald-400 hover:border-emerald-500/40 transition-all">
              <Upload className="w-3 h-3" />
              Add document ({docs.length}/5)
            </button>
            <input ref={fileRef} type="file" multiple
              accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.xlsx,.xls,.py,.js,.ts,.html"
              className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-text-primary">Document Intelligence</span>
              <span className="text-xs text-text-tertiary ml-2">
                {activeDocId ? `Querying: ${docs.find(d => d.id === activeDocId)?.name}` : `Querying all ${docs.length} document${docs.length > 1 ? 's' : ''}`}
              </span>
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
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-text-primary font-medium mb-1">
                  {docs.length > 1 ? `${docs.length} documents indexed and ready` : 'Document ready — ask anything'}
                </p>
                <p className="text-text-tertiary text-sm mb-6">
                  {docs.length > 1
                    ? `Querying: ${docs.map(d => d.name).join(', ')}`
                    : `${docs[0].wordCount.toLocaleString()} words · ${docs[0].chunks.length} semantic chunks indexed`}
                </p>
                {/* Smart starters */}
                <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto">
                  {SMART_STARTERS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="px-3 py-2.5 bg-surface border border-border rounded-xl text-xs text-text-secondary hover:text-text-primary hover:border-emerald-500/40 transition-all text-left leading-snug">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                style={{ animation: 'msgSlideIn .25s ease' }}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[78%] ${msg.role === 'user' ? '' : 'flex flex-col gap-2'}`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-surface border border-border text-text-primary'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || ''}
                        </ReactMarkdown>
                        {loading && i === messages.length - 1 && !msg.content && (
                          <span className="inline-flex gap-1 ml-1">
                            {[0,1,2].map(j => (
                              <span key={j} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${j * 0.1}s` }} />
                            ))}
                          </span>
                        )}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>

                  {/* Action row for assistant */}
                  {msg.role === 'assistant' && msg.content && (
                    <div className="flex items-center gap-2 px-1">
                      <button onClick={() => copyMsg(msg.content)}
                        className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors">
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

                  {/* Source passages panel */}
                  {msg.showSources && msg.chunks && (
                    <div className="space-y-2 mt-1">
                      {msg.chunks.map((chunk, ci) => (
                        <div key={ci} className="px-3 py-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            <span className="text-[11px] font-medium text-emerald-400">Source {ci + 1}</span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed line-clamp-4">{chunk}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="px-4 py-4 border-t border-border flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className={`flex gap-3 bg-surface border rounded-2xl px-4 py-3 transition-all ${focused ? 'border-emerald-500/50' : 'border-border'}`}>
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
                className="self-end px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl transition-all flex-shrink-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-center text-xs text-text-tertiary mt-2">
              {activeDocId ? `Querying 1 document` : `Querying ${docs.length} document${docs.length > 1 ? 's' : ''}`} · {activeDocs.reduce((a, d) => a + d.chunks.length, 0)} chunks · Enter to send, Shift+Enter for newline
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
