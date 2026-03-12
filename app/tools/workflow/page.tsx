'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Square, Plus, Trash2, Zap, Brain, GitBranch, Database, Send, Code2, ChevronRight, CheckCircle2, Clock, AlertCircle, Loader2, Download, Upload, RotateCcw, Layers, Terminal, Workflow, Save, X, Settings, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────
type NodeType = 'trigger' | 'ai' | 'logic' | 'data' | 'action' | 'code'
type NodeStatus = 'idle' | 'running' | 'success' | 'error'

interface WorkflowNode {
  id: string
  type: NodeType
  label: string
  x: number
  y: number
  config: Record<string, string>
  status: NodeStatus
  outputPreview?: string
}

interface Connection {
  id: string
  from: string
  to: string
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  nodes: Omit<WorkflowNode, 'status'>[]
  connections: Omit<Connection, 'id'>[]
}

interface LogEntry {
  id: string
  nodeId: string
  nodeLabel: string
  message: string
  type: 'info' | 'success' | 'error' | 'running'
  ts: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const NODE_PALETTE: { type: NodeType; label: string; icon: React.ElementType; color: string; bg: string; desc: string }[] = [
  { type: 'trigger', label: 'Trigger',    icon: Zap,        color: 'text-yellow-400', bg: 'bg-yellow-400/10',  desc: 'Start the workflow' },
  { type: 'ai',      label: 'AI Model',   icon: Brain,      color: 'text-purple-400', bg: 'bg-purple-400/10',  desc: 'LLM processing' },
  { type: 'logic',   label: 'Logic Gate', icon: GitBranch,  color: 'text-blue-400',   bg: 'bg-blue-400/10',    desc: 'Conditional branch' },
  { type: 'data',    label: 'Data Store', icon: Database,   color: 'text-green-400',  bg: 'bg-green-400/10',   desc: 'Read/write data' },
  { type: 'action',  label: 'Action',     icon: Send,       color: 'text-orange-400', bg: 'bg-orange-400/10',  desc: 'Send output' },
  { type: 'code',    label: 'Code Block', icon: Code2,      color: 'text-cyan-400',   bg: 'bg-cyan-400/10',    desc: 'Custom JS/Python' },
]

const NODE_COLOR: Record<NodeType, { border: string; text: string; bg: string; dot: string }> = {
  trigger: { border: 'border-yellow-400/40', text: 'text-yellow-400', bg: 'bg-yellow-400/10', dot: 'bg-yellow-400' },
  ai:      { border: 'border-purple-400/40', text: 'text-purple-400', bg: 'bg-purple-400/10', dot: 'bg-purple-400' },
  logic:   { border: 'border-blue-400/40',   text: 'text-blue-400',   bg: 'bg-blue-400/10',   dot: 'bg-blue-400' },
  data:    { border: 'border-green-400/40',  text: 'text-green-400',  bg: 'bg-green-400/10',  dot: 'bg-green-400' },
  action:  { border: 'border-orange-400/40', text: 'text-orange-400', bg: 'bg-orange-400/10', dot: 'bg-orange-400' },
  code:    { border: 'border-cyan-400/40',   text: 'text-cyan-400',   bg: 'bg-cyan-400/10',   dot: 'bg-cyan-400' },
}

const STATUS_ICON: Record<NodeStatus, React.ElementType> = {
  idle:    Clock,
  running: Loader2,
  success: CheckCircle2,
  error:   AlertCircle,
}

const STATUS_COLOR: Record<NodeStatus, string> = {
  idle:    'text-text-tertiary',
  running: 'text-accent animate-spin',
  success: 'text-green-400',
  error:   'text-red-400',
}

const TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'lead-enrichment',
    name: 'Lead Enrichment Pipeline',
    description: 'Enrich CRM leads with AI-generated insights and auto-classify them',
    category: 'Sales',
    nodes: [
      { id: 'n1', type: 'trigger', label: 'New CRM Lead',     x: 60,  y: 160, config: { source: 'Salesforce Webhook' }, outputPreview: undefined },
      { id: 'n2', type: 'data',    label: 'Fetch Company',    x: 260, y: 160, config: { action: 'GET /company/{domain}' }, outputPreview: undefined },
      { id: 'n3', type: 'ai',      label: 'Score & Classify', x: 460, y: 160, config: { model: 'gemini-2.0-flash', prompt: 'Score this lead 1-10 and classify as hot/warm/cold' }, outputPreview: undefined },
      { id: 'n4', type: 'logic',   label: 'Hot Lead?',        x: 660, y: 160, config: { condition: 'score >= 7' }, outputPreview: undefined },
      { id: 'n5', type: 'action',  label: 'Notify Sales',     x: 860, y: 80,  config: { channel: 'Slack #hot-leads' }, outputPreview: undefined },
      { id: 'n6', type: 'action',  label: 'Add to Nurture',   x: 860, y: 260, config: { list: 'Email Nurture Sequence' }, outputPreview: undefined },
    ],
    connections: [
      { from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' }, { from: 'n4', to: 'n6' },
    ],
  },
  {
    id: 'content-pipeline',
    name: 'AI Content Pipeline',
    description: 'Generate, review and publish SEO-optimized blog content automatically',
    category: 'Marketing',
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Keyword Input',    x: 60,  y: 200, config: { source: 'Manual / Schedule' }, outputPreview: undefined },
      { id: 'n2', type: 'ai',      label: 'Research Phase',   x: 260, y: 200, config: { model: 'gemini-2.0-flash', prompt: 'Research top 10 insights for this keyword' }, outputPreview: undefined },
      { id: 'n3', type: 'ai',      label: 'Draft Article',    x: 460, y: 200, config: { model: 'gemini-2.0-flash', prompt: 'Write a 1500-word SEO article based on research' }, outputPreview: undefined },
      { id: 'n4', type: 'code',    label: 'SEO Audit',        x: 660, y: 200, config: { code: 'checkReadability(draft); checkKeywordDensity(draft);' }, outputPreview: undefined },
      { id: 'n5', type: 'action',  label: 'Publish to CMS',   x: 860, y: 200, config: { cms: 'WordPress REST API' }, outputPreview: undefined },
    ],
    connections: [
      { from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' }, { from: 'n4', to: 'n5' },
    ],
  },
  {
    id: 'research-pipeline',
    name: 'Deep Research Pipeline',
    description: 'Autonomous research agent that synthesizes multi-source intelligence reports',
    category: 'Research',
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Research Query',    x: 60,  y: 200, config: { source: 'API / Dashboard' }, outputPreview: undefined },
      { id: 'n2', type: 'data',    label: 'Web Search',        x: 260, y: 120, config: { sources: 'Google, Bing, Scholar' }, outputPreview: undefined },
      { id: 'n3', type: 'data',    label: 'Internal Docs',     x: 260, y: 280, config: { store: 'Vector DB (Pinecone)' }, outputPreview: undefined },
      { id: 'n4', type: 'ai',      label: 'Synthesize',        x: 480, y: 200, config: { model: 'gemini-2.0-flash', prompt: 'Synthesize all sources into a comprehensive report' }, outputPreview: undefined },
      { id: 'n5', type: 'ai',      label: 'Fact-Check',        x: 680, y: 200, config: { model: 'gemini-2.0-flash', prompt: 'Identify claims that need verification' }, outputPreview: undefined },
      { id: 'n6', type: 'action',  label: 'Export Report',     x: 880, y: 200, config: { format: 'PDF + Notion Page' }, outputPreview: undefined },
    ],
    connections: [
      { from: 'n1', to: 'n2' }, { from: 'n1', to: 'n3' },
      { from: 'n2', to: 'n4' }, { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' }, { from: 'n5', to: 'n6' },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkflowBuilderPage() {
  const [nodes, setNodes]                 = useState<WorkflowNode[]>([])
  const [connections, setConnections]     = useState<Connection[]>([])
  const [selected, setSelected]           = useState<string | null>(null)
  const [dragging, setDragging]           = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [connecting, setConnecting]       = useState<string | null>(null)
  const [running, setRunning]             = useState(false)
  const [logs, setLogs]                   = useState<LogEntry[]>([])
  const [showLog, setShowLog]             = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [panOffset, setPanOffset]         = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning]         = useState(false)
  const panStart                          = useRef({ x: 0, y: 0 })
  const canvasRef                         = useRef<HTMLDivElement>(null)
  const logEndRef                         = useRef<HTMLDivElement>(null)
  const runTimers                         = useRef<ReturnType<typeof setTimeout>[]>([])

  // Scroll log to bottom on new entries
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Cleanup timers on unmount
  useEffect(() => () => { runTimers.current.forEach(clearTimeout) }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const addLog = useCallback((nodeId: string, nodeLabel: string, message: string, type: LogEntry['type']) => {
    const entry: LogEntry = { id: crypto.randomUUID(), nodeId, nodeLabel, message, type, ts: Date.now() }
    setLogs(prev => [...prev, entry])
  }, [])

  const newNode = useCallback((type: NodeType, x: number, y: number): WorkflowNode => {
    const palette = NODE_PALETTE.find(p => p.type === type)!
    return {
      id: crypto.randomUUID(),
      type,
      label: palette.label,
      x,
      y,
      config: {},
      status: 'idle',
    }
  }, [])

  // ── Drag from Palette ──────────────────────────────────────────────────────
  const handlePaletteDrop = useCallback((e: React.DragEvent, type: NodeType) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left - panOffset.x - 70
    const y = e.clientY - rect.top  - panOffset.y - 24
    const node = newNode(type, Math.max(0, x), Math.max(0, y))
    setNodes(prev => [...prev, node])
    setSelected(node.id)
    toast.success(`${node.label} node added`)
  }, [newNode, panOffset])

  const handlePaletteDragStart = useCallback((e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('nodeType', type)
  }, [])

  // ── Canvas Drag Events ─────────────────────────────────────────────────────
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('nodeType') as NodeType
    if (!type) return
    handlePaletteDrop(e, type)
  }, [handlePaletteDrop])

  // ── Node Dragging ──────────────────────────────────────────────────────────
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (connecting) {
      // Complete connection
      if (connecting !== id) {
        const conn: Connection = { id: crypto.randomUUID(), from: connecting, to: id }
        setConnections(prev => {
          if (prev.some(c => c.from === connecting && c.to === id)) return prev
          return [...prev, conn]
        })
        toast.success('Nodes connected')
      }
      setConnecting(null)
      return
    }
    setSelected(id)
    const node = nodes.find(n => n.id === id)!
    setDragging({ id, ox: e.clientX - node.x, oy: e.clientY - node.y })
  }, [connecting, nodes])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      setNodes(prev => prev.map(n =>
        n.id === dragging.id
          ? { ...n, x: e.clientX - dragging.ox, y: e.clientY - dragging.oy }
          : n
      ))
    }
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      })
    }
  }, [dragging, isPanning])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
    setIsPanning(false)
  }, [])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvas) {
      setSelected(null)
      setConnecting(null)
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true)
        panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }
      }
    }
  }, [panOffset])

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id))
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id))
    if (selected === id) setSelected(null)
    toast.success('Node removed')
  }, [selected])

  const deleteConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id))
  }, [])

  // ── Update Node Config / Label ─────────────────────────────────────────────
  const updateNodeLabel = useCallback((id: string, label: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, label } : n))
  }, [])

  // ── Load Template ──────────────────────────────────────────────────────────
  const loadTemplate = useCallback((tpl: WorkflowTemplate) => {
    setNodes(tpl.nodes.map(n => ({ ...n, status: 'idle' as NodeStatus })))
    setConnections(tpl.connections.map(c => ({ ...c, id: crypto.randomUUID() })))
    setSelected(null)
    setLogs([])
    setActiveTemplate(tpl.id)
    setShowTemplates(false)
    toast.success(`Template "${tpl.name}" loaded`)
  }, [])

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    runTimers.current.forEach(clearTimeout)
    runTimers.current = []
    setNodes(prev => prev.map(n => ({ ...n, status: 'idle', outputPreview: undefined })))
    setLogs([])
    setRunning(false)
    toast('Workflow reset', { icon: '🔄' })
  }, [])

  const clearCanvas = useCallback(() => {
    runTimers.current.forEach(clearTimeout)
    setNodes([])
    setConnections([])
    setSelected(null)
    setLogs([])
    setRunning(false)
    setActiveTemplate(null)
    toast('Canvas cleared')
  }, [])

  // ── Execute Workflow ───────────────────────────────────────────────────────
  const executeWorkflow = useCallback(() => {
    if (nodes.length === 0) { toast.error('Add nodes first'); return }
    if (running) return
    setRunning(true)
    setShowLog(true)
    setLogs([])
    // Reset statuses
    setNodes(prev => prev.map(n => ({ ...n, status: 'idle', outputPreview: undefined })))

    // Build topological order via BFS from trigger nodes
    const triggers = nodes.filter(n => n.type === 'trigger')
    if (triggers.length === 0) { toast.error('Add a Trigger node to start'); setRunning(false); return }

    const order: string[] = []
    const visited = new Set<string>()
    const queue = triggers.map(t => t.id)
    while (queue.length > 0) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      order.push(id)
      connections.filter(c => c.from === id).forEach(c => queue.push(c.to))
    }
    // Add any unvisited nodes
    nodes.forEach(n => { if (!visited.has(n.id)) order.push(n.id) })

    addLog('system', 'System', `▶ Executing workflow with ${nodes.length} nodes…`, 'info')

    const OUTPUTS: Record<NodeType, string[]> = {
      trigger: ['Received new event: lead_created', 'Payload: { id: "lead_8821", email: "ceo@acme.com" }'],
      data:    ['Fetched 3 records from database', 'Query resolved in 142ms'],
      ai:      ['Model inference complete', 'Confidence: 0.94 | Tokens: 312 | Latency: 680ms'],
      logic:   ['Condition evaluated: TRUE (score=8.2 ≥ 7)', 'Routing to success branch'],
      action:  ['Action dispatched successfully', 'Response: 200 OK'],
      code:    ['Script executed in 12ms', 'Output: { readability: 72, keywordDensity: 1.8% }'],
    }

    order.forEach((nodeId, i) => {
      const node = nodes.find(n => n.id === nodeId)
      if (!node) return
      const delay = 600 * (i + 1)

      const t1 = setTimeout(() => {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: 'running' } : n))
        addLog(nodeId, node.label, `Processing node: ${node.label}…`, 'running')
      }, delay)

      const t2 = setTimeout(() => {
        const outputs = OUTPUTS[node.type]
        const preview = outputs[0]
        const success = Math.random() > 0.05
        setNodes(prev => prev.map(n =>
          n.id === nodeId ? { ...n, status: success ? 'success' : 'error', outputPreview: preview } : n
        ))
        if (success) {
          outputs.forEach(line => addLog(nodeId, node.label, line, 'success'))
        } else {
          addLog(nodeId, node.label, 'Execution failed — timeout after 30s', 'error')
        }
        if (i === order.length - 1) {
          const t3 = setTimeout(() => {
            setRunning(false)
            addLog('system', 'System', '✅ Workflow execution complete', 'success')
            toast.success('Workflow executed successfully!')
          }, 400)
          runTimers.current.push(t3)
        }
      }, delay + 500)

      runTimers.current.push(t1, t2)
    })
  }, [nodes, connections, running, addLog])

  // ── SVG Connections ────────────────────────────────────────────────────────
  const NODE_W = 160
  const NODE_H = 56

  const getCenter = useCallback((id: string) => {
    const n = nodes.find(nd => nd.id === id)
    if (!n) return { x: 0, y: 0 }
    return { x: n.x + NODE_W, y: n.y + NODE_H / 2 }
  }, [nodes])

  const getInCenter = useCallback((id: string) => {
    const n = nodes.find(nd => nd.id === id)
    if (!n) return { x: 0, y: 0 }
    return { x: n.x, y: n.y + NODE_H / 2 }
  }, [nodes])

  const makePath = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const cx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
  }, [])

  // ── Selected node panel ────────────────────────────────────────────────────
  const selectedNode = nodes.find(n => n.id === selected)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-bg text-text-primary overflow-hidden">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Workflow size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary leading-tight">Visual Workflow Builder</h1>
            <p className="text-[10px] text-text-tertiary leading-tight">Drag · Connect · Execute</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Templates */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Layers size={13} />
              Templates
              <ChevronDown size={11} className={`transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
            {showTemplates && (
              <div className="absolute top-full mt-1 right-0 w-72 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Pre-built Workflows</p>
                </div>
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => loadTemplate(tpl)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-surface-hover transition-colors border-b border-border/50 last:border-0 ${activeTemplate === tpl.id ? 'bg-accent/5' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-text-primary">{tpl.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,163,127,0.1)', color: '#10a37f' }}>{tpl.category}</span>
                    </div>
                    <p className="text-[11px] text-text-tertiary leading-snug">{tpl.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={reset}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-40"
          >
            <RotateCcw size={13} />
            Reset
          </button>

          <button
            onClick={clearCanvas}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-text-secondary hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-40"
          >
            <Trash2 size={13} />
            Clear
          </button>

          <button
            onClick={() => { setShowLog(p => !p) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${showLog ? 'border-accent/40 text-accent bg-accent/5' : 'border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover'}`}
          >
            <Terminal size={13} />
            Execution Log
            {logs.length > 0 && <span className="ml-0.5 px-1 rounded-full text-[9px] bg-accent text-white">{logs.length}</span>}
          </button>

          <button
            onClick={running ? () => { runTimers.current.forEach(clearTimeout); setRunning(false) } : executeWorkflow}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg font-medium transition-all ${
              running
                ? 'bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25'
                : 'bg-accent hover:bg-accent/90 text-white'
            }`}
          >
            {running ? <><Square size={13} fill="currentColor" /> Stop</> : <><Play size={13} fill="currentColor" /> Run Workflow</>}
          </button>
        </div>
      </div>

      {/* ── Main Area ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Node Palette */}
        <div className="w-44 shrink-0 border-r border-border bg-surface flex flex-col overflow-y-auto">
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary opacity-60">Node Types</p>
          </div>
          <div className="px-2 space-y-1 pb-4">
            {NODE_PALETTE.map(p => {
              const Icon = p.icon
              return (
                <div
                  key={p.type}
                  draggable
                  onDragStart={e => handlePaletteDragStart(e, p.type)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-border bg-bg/50 cursor-grab active:cursor-grabbing hover:bg-surface-hover hover:border-border transition-colors select-none"
                >
                  <div className={`w-6 h-6 rounded-md ${p.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={13} className={p.color} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-text-primary leading-tight">{p.label}</p>
                    <p className="text-[9px] text-text-tertiary leading-tight">{p.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-auto px-3 pb-3 pt-2 border-t border-border">
            <p className="text-[10px] text-text-tertiary leading-relaxed">
              Drag nodes onto the canvas · Click output port to connect
            </p>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-bg">
          {/* Grid background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              backgroundPosition: `${panOffset.x % 24}px ${panOffset.y % 24}px`,
            }}
          />

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mb-4">
                <Workflow size={28} className="text-violet-400 opacity-60" />
              </div>
              <p className="text-text-secondary text-sm font-medium mb-1">Canvas is empty</p>
              <p className="text-text-tertiary text-xs">Drag nodes from the left panel, or load a template</p>
            </div>
          )}

          {/* Canvas layer */}
          <div
            ref={canvasRef}
            data-canvas="true"
            className="absolute inset-0"
            style={{ cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : connecting ? 'crosshair' : 'default' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseDown={handleCanvasMouseDown}
            onDragOver={e => e.preventDefault()}
            onDrop={handleCanvasDrop}
          >
            {/* SVG connections */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
            >
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.2)" />
                </marker>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {connections.map(conn => {
                const from = getCenter(conn.from)
                const to   = getInCenter(conn.to)
                const fromNode = nodes.find(n => n.id === conn.from)
                const isActive = fromNode?.status === 'running' || fromNode?.status === 'success'
                return (
                  <g key={conn.id}>
                    <path
                      d={makePath(from.x, from.y, to.x, to.y)}
                      fill="none"
                      stroke={isActive ? '#10a37f' : 'rgba(255,255,255,0.1)'}
                      strokeWidth={isActive ? 2 : 1.5}
                      strokeDasharray={isActive ? undefined : '5,4'}
                      markerEnd="url(#arrowhead)"
                      filter={isActive ? 'url(#glow)' : undefined}
                      style={{ transition: 'stroke 0.3s' }}
                    />
                    {/* Invisible wide hit area for deletion */}
                    <path
                      d={makePath(from.x, from.y, to.x, to.y)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={12}
                      style={{ cursor: 'pointer', pointerEvents: 'all' }}
                      onClick={() => deleteConnection(conn.id)}
                    />
                  </g>
                )
              })}
            </svg>

            {/* Nodes */}
            <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
              {nodes.map(node => {
                const colors  = NODE_COLOR[node.type]
                const palette = NODE_PALETTE.find(p => p.type === node.type)!
                const Icon    = palette.icon
                const StatusI = STATUS_ICON[node.status]
                const isSelected = selected === node.id
                const isConnFrom = connecting === node.id

                return (
                  <div
                    key={node.id}
                    style={{ position: 'absolute', left: node.x, top: node.y, width: NODE_W, userSelect: 'none' }}
                    onMouseDown={e => handleNodeMouseDown(e, node.id)}
                  >
                    <div className={`
                      relative rounded-xl border bg-surface shadow-lg transition-all duration-200
                      ${colors.border}
                      ${isSelected ? 'ring-2 ring-accent/60 shadow-accent/10 shadow-xl' : ''}
                      ${isConnFrom ? 'ring-2 ring-yellow-400/60' : ''}
                      ${node.status === 'running' ? 'border-accent/60' : ''}
                      ${node.status === 'error' ? 'border-red-500/60' : ''}
                    `}>
                      {/* Input port */}
                      {node.type !== 'trigger' && (
                        <div
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-border bg-surface hover:border-accent hover:bg-accent/20 transition-colors cursor-crosshair z-10"
                          style={{ pointerEvents: 'all' }}
                          onMouseDown={e => { e.stopPropagation(); setConnecting(node.id) }}
                        />
                      )}

                      <div className="flex items-center gap-2 px-3 py-3">
                        <div className={`w-7 h-7 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                          <Icon size={14} className={colors.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-text-primary truncate leading-tight">{node.label}</p>
                          <p className={`text-[9px] leading-tight ${STATUS_COLOR[node.status]}`}>
                            {node.status === 'idle' ? palette.desc : node.status.toUpperCase()}
                          </p>
                        </div>
                        <StatusI size={13} className={STATUS_COLOR[node.status]} />
                      </div>

                      {/* Output preview */}
                      {node.outputPreview && (
                        <div className="px-3 pb-2">
                          <p className="text-[9px] text-text-tertiary bg-bg/60 rounded px-1.5 py-0.5 truncate">{node.outputPreview}</p>
                        </div>
                      )}

                      {/* Output port */}
                      <div
                        className={`absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 transition-colors cursor-crosshair z-10 ${
                          isConnFrom ? 'border-yellow-400 bg-yellow-400/40' : 'border-border bg-surface hover:border-accent hover:bg-accent/20'
                        }`}
                        style={{ pointerEvents: 'all' }}
                        onMouseDown={e => { e.stopPropagation(); setConnecting(node.id) }}
                      />

                      {/* Selection toolbar */}
                      {isSelected && (
                        <div className="absolute -top-7 left-0 flex items-center gap-1">
                          <button
                            onMouseDown={e => { e.stopPropagation(); setConnecting(node.id); toast('Click another node to connect', { icon: '🔗' }) }}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-surface border border-border text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
                          >
                            <ChevronRight size={10} /> Connect
                          </button>
                          <button
                            onMouseDown={e => { e.stopPropagation(); deleteNode(node.id) }}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-surface border border-border text-text-secondary hover:text-red-400 hover:border-red-400/40 transition-colors"
                          >
                            <Trash2 size={10} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right panels */}
        <div className="w-56 shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden">

          {/* Inspector */}
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary opacity-60">
              {selectedNode ? 'Node Inspector' : 'Canvas Stats'}
            </p>
          </div>

          {selectedNode ? (
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
              {/* Label editor */}
              <div>
                <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Label</label>
                <input
                  value={selectedNode.label}
                  onChange={e => updateNodeLabel(selectedNode.id, e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Type</label>
                <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${NODE_COLOR[selectedNode.type].bg}`}>
                  {(() => { const p = NODE_PALETTE.find(pl => pl.type === selectedNode.type)!; const I = p.icon; return <I size={12} className={NODE_COLOR[selectedNode.type].text} /> })()}
                  <span className={`text-[11px] font-medium capitalize ${NODE_COLOR[selectedNode.type].text}`}>{selectedNode.type}</span>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Status</label>
                <div className="flex items-center gap-1.5">
                  {(() => { const SI = STATUS_ICON[selectedNode.status]; return <SI size={12} className={STATUS_COLOR[selectedNode.status]} /> })()}
                  <span className={`text-[11px] font-medium capitalize ${STATUS_COLOR[selectedNode.status]}`}>{selectedNode.status}</span>
                </div>
              </div>

              {/* Config hint */}
              {Object.keys(selectedNode.config).length > 0 && (
                <div>
                  <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Configuration</label>
                  <div className="space-y-1">
                    {Object.entries(selectedNode.config).map(([k, v]) => (
                      <div key={k} className="bg-bg/60 rounded px-2 py-1.5">
                        <p className="text-[9px] text-text-tertiary">{k}</p>
                        <p className="text-[10px] text-text-secondary truncate">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.outputPreview && (
                <div>
                  <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Last Output</label>
                  <p className="text-[10px] text-text-secondary bg-bg/60 rounded px-2 py-1.5">{selectedNode.outputPreview}</p>
                </div>
              )}

              {/* Connections */}
              <div>
                <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Connections</label>
                <p className="text-[11px] text-text-secondary">
                  In: {connections.filter(c => c.to === selectedNode.id).length} · Out: {connections.filter(c => c.from === selectedNode.id).length}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 px-3 py-3 space-y-3">
              {[
                { label: 'Nodes', value: nodes.length },
                { label: 'Connections', value: connections.length },
                { label: 'Completed', value: nodes.filter(n => n.status === 'success').length },
                { label: 'Errors', value: nodes.filter(n => n.status === 'error').length },
              ].map(stat => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-xs text-text-tertiary">{stat.label}</span>
                  <span className="text-xs font-semibold text-text-primary tabular-nums">{stat.value}</span>
                </div>
              ))}

              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-text-tertiary leading-relaxed">
                  Click a node to inspect it. Use the port dots to draw connections.
                </p>
              </div>
            </div>
          )}

          {/* Execution Log Panel */}
          {showLog && (
            <div className="border-t border-border flex flex-col" style={{ height: '40%' }}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary opacity-60">Execution Log</p>
                <button onClick={() => setShowLog(false)} className="text-text-tertiary hover:text-text-primary transition-colors">
                  <X size={12} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 font-mono">
                {logs.length === 0 ? (
                  <p className="text-[10px] text-text-tertiary px-1 py-2">No execution events yet.</p>
                ) : logs.map(log => (
                  <div key={log.id} className="flex items-start gap-1.5 py-0.5">
                    <span className={`shrink-0 text-[9px] mt-0.5 ${
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'error'   ? 'text-red-400'   :
                      log.type === 'running' ? 'text-accent'    : 'text-text-tertiary'
                    }`}>
                      {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : log.type === 'running' ? '▶' : '·'}
                    </span>
                    <p className="text-[9px] text-text-secondary leading-relaxed break-words">{log.message}</p>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Status Bar ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-1.5 border-t border-border bg-surface text-[10px] text-text-tertiary">
        <div className="flex items-center gap-4">
          <span>{nodes.length} nodes · {connections.length} connections</span>
          {running && <span className="flex items-center gap-1 text-accent"><Loader2 size={10} className="animate-spin" /> Executing…</span>}
          {connecting && <span className="text-yellow-400">Connecting… click target node</span>}
        </div>
        <div className="flex items-center gap-3">
          <span>Drag nodes · Click ports to connect · Click edge to delete</span>
          <span className="opacity-40">Alt+drag to pan</span>
        </div>
      </div>
    </div>
  )
}
