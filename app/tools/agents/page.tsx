'use client'
import { useState, useRef } from 'react'
import { Bot, Send, Loader2, BookOpen, Code2, PenLine, ChevronDown } from 'lucide-react'

const AGENTS = [
  {
    id: 'research',
    name: 'Research Agent',
    icon: BookOpen,
    color: 'from-blue-500 to-cyan-500',
    desc: 'Deep research on any topic — summarizes, synthesizes, and cites.',
    system: 'You are an expert research assistant. When given a topic or question, provide a thorough, well-structured research summary with key facts, multiple perspectives, and clear insights. Use headers and bullet points for clarity. Always be factual and nuanced.',
  },
  {
    id: 'code',
    name: 'Code Agent',
    icon: Code2,
    color: 'from-green-500 to-emerald-500',
    desc: 'Writes, debugs, and explains code in any language.',
    system: 'You are an expert software engineer and coding assistant. Write clean, well-commented, production-ready code. When debugging, explain the root cause clearly. Always include usage examples. Support any programming language.',
  },
  {
    id: 'writer',
    name: 'Writing Agent',
    icon: PenLine,
    color: 'from-purple-500 to-pink-500',
    desc: 'Writes blog posts, emails, scripts, and creative content.',
    system: 'You are a professional writer and editor. Create compelling, well-structured written content tailored to the user\'s tone and audience. Whether writing blog posts, emails, scripts, or creative fiction — always produce polished, engaging, and error-free output.',
  },
]

interface Message { role: 'user' | 'assistant'; content: string }

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [open, setOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const send = async () => {
    if (!input.trim() || streaming) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    // Placeholder while waiting
    setMessages([...newMessages, { role: 'assistant', content: '' }])

    try {
      abortRef.current = new AbortController()
      // 45s timeout
      const timer = setTimeout(() => abortRef.current?.abort(), 45000)

      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          systemPrompt: selectedAgent.system,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          stream: false,   // ← reliable non-streaming JSON
        }),
      })

      clearTimeout(timer)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const content = data.content || data.error || '⚠️ Empty response from AI.'

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content }
        return updated
      })
    } catch (e: any) {
      const msg = e.name === 'AbortError'
        ? '⚠️ Request timed out. Please try again.'
        : '⚠️ Error connecting to AI. Please try again.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: msg }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-text-primary">Multi-Agent Workspace</h1>
            <p className="text-xs text-text-tertiary">Research · Code · Writing</p>
          </div>
        </div>

        {/* Agent selector */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-2 bg-surface-hover hover:bg-surface-hover rounded-xl text-sm transition-all"
          >
            <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${selectedAgent.color} flex items-center justify-center`}>
              <selectedAgent.icon className="w-3 h-3 text-white" />
            </div>
            <span className="text-text-primary">{selectedAgent.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              {AGENTS.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => {
                    abortRef.current?.abort()   // cancel any in-flight request
                    setStreaming(false)
                    setSelectedAgent(agent); setOpen(false); setMessages([])
                  }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <agent.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{agent.name}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{agent.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedAgent.color} flex items-center justify-center mx-auto mb-4`}>
                <selectedAgent.icon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-text-primary font-semibold text-lg mb-2">{selectedAgent.name}</h2>
              <p className="text-text-tertiary text-sm max-w-sm mx-auto">{selectedAgent.desc}</p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {selectedAgent.id === 'research' && [
                  'Research quantum computing basics',
                  'Explain the latest AI breakthroughs',
                  'Compare React vs Vue in 2026',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-blue-500/40 transition-all">
                    {s}
                  </button>
                ))}
                {selectedAgent.id === 'code' && [
                  'Build a REST API in Python',
                  'Create a React todo app',
                  'Write a web scraper in JS',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-green-500/40 transition-all">
                    {s}
                  </button>
                ))}
                {selectedAgent.id === 'writer' && [
                  'Write a blog post about AI in 2026',
                  'Draft a cold email template',
                  'Write a YouTube script intro',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-purple-500/40 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${selectedAgent.color} flex items-center justify-center flex-shrink-0 mr-3 mt-0.5`}>
                  <selectedAgent.icon className="w-3.5 h-3.5 text-text-primary" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-text-primary'
                  : 'bg-surface border border-border text-text-primary'
              }`}>
                <pre className="whitespace-pre-wrap font-sans">{msg.content}
                  {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-1 animate-pulse rounded-sm" />
                  )}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-border flex-shrink-0">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Ask the ${selectedAgent.name}…`}
            rows={1}
            className="flex-1 bg-surface border border-border focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none transition-all"
          />
          <button onClick={send} disabled={streaming || !input.trim()}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-all flex items-center gap-2">
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
