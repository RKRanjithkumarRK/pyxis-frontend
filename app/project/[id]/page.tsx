'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { ArrowUp, MessageSquare, FileText, Plus, Link, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react'
import { Conversation } from '@/types'
import toast from 'react-hot-toast'

interface Source {
  id: string
  type: 'text' | 'url'
  content: string
  label: string
  createdAt: string
}

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()
  const { user, getToken } = useAuth()
  const { setProjects } = useSidebar()

  const [projectName, setProjectName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [chats, setChats] = useState<Conversation[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [activeTab, setActiveTab] = useState<'chats' | 'sources'>('chats')
  const [chatInput, setChatInput] = useState('')
  const [sourceInput, setSourceInput] = useState('')
  const [sourceType, setSourceType] = useState<'text' | 'url'>('text')
  const [loadingProject, setLoadingProject] = useState(true)
  const nameRef = useRef<HTMLInputElement>(null)

  // Wait for auth user before loading
  useEffect(() => {
    if (!user) return
    loadProject()
    loadChats()
    loadSources()
  }, [projectId, user])

  useEffect(() => {
    if (editingName && nameRef.current) nameRef.current.focus()
  }, [editingName])

  const loadProject = async () => {
    setLoadingProject(true)
    const token = await getToken()
    if (!token) { setLoadingProject(false); return }
    try {
      const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        const proj = (data.projects || []).find((p: any) => p.id === projectId)
        if (proj) {
          setProjectName(proj.name)
          setNameInput(proj.name)
        } else {
          setProjectName('New Project')
          setNameInput('New Project')
        }
      }
    } catch {}
    setLoadingProject(false)
  }

  const loadChats = async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/conversations', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setChats((data.conversations || []).filter((c: any) => c.projectId === projectId))
      }
    } catch {}
  }

  const loadSources = async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/projects/sources?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSources(data.sources || [])
      }
    } catch {}
  }

  const handleRename = async () => {
    const name = nameInput.trim()
    if (!name || name === projectName) { setEditingName(false); return }
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, name }),
      })
      if (res.ok) {
        setProjectName(name)
        setEditingName(false)
        const listRes = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } })
        if (listRes.ok) { const d = await listRes.json(); setProjects(d.projects || []) }
        toast.success('Project renamed')
      }
    } catch { toast.error('Failed to rename') }
  }

  const handleNewChat = async () => {
    if (!chatInput.trim()) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: chatInput.trim(), projectId }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/chat/${data.id}`)
      }
    } catch {}
  }

  const handleAddSource = async () => {
    const val = sourceInput.trim()
    if (!val) return
    const token = await getToken()
    if (!token) return
    let label = val.slice(0, 50) + (val.length > 50 ? '...' : '')
    if (sourceType === 'url') {
      try { label = new URL(val).hostname } catch { toast.error('Invalid URL'); return }
    }
    try {
      const res = await fetch('/api/projects/sources', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, type: sourceType, content: val, label }),
      })
      if (res.ok) {
        setSourceInput('')
        loadSources()
        toast.success('Source added')
      }
    } catch { toast.error('Failed to add source') }
  }

  const handleDeleteSource = async (sourceId: string) => {
    const token = await getToken()
    if (!token) return
    try {
      await fetch(`/api/projects/sources?projectId=${projectId}&sourceId=${sourceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setSources(prev => prev.filter(s => s.id !== sourceId))
      toast.success('Source removed')
    } catch {}
  }

  const displayName = loadingProject ? 'Loading...' : (projectName || 'New Project')

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-border/30">
        {loadingProject ? (
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin text-text-tertiary" />
            <span className="text-xl font-semibold text-text-tertiary">Loading...</span>
          </div>
        ) : editingName ? (
          <div className="flex items-center gap-2">
            <input
              ref={nameRef}
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
              className="text-xl font-semibold text-text-primary bg-surface border border-accent rounded-lg px-3 py-1 outline-none"
            />
            <button onClick={handleRename} className="p-1.5 rounded-lg text-accent hover:bg-surface-hover"><Check size={16} /></button>
            <button onClick={() => setEditingName(false)} className="p-1.5 rounded-lg text-text-tertiary hover:bg-surface-hover"><X size={16} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <h1 className="text-xl font-semibold text-text-primary">{displayName}</h1>
            <button
              onClick={() => { setNameInput(projectName); setEditingName(true) }}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover opacity-0 group-hover:opacity-100 transition-opacity"
              title="Rename project"
            >
              <Pencil size={14} />
            </button>
          </div>
        )}
      </div>

      {/* New chat input */}
      <div className="px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 bg-surface rounded-3xl border border-border/50 px-4 py-3 input-glow">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNewChat() }}
              placeholder={`New chat in ${displayName}`}
              className="flex-1 bg-transparent text-text-primary text-[15px] placeholder:text-text-tertiary outline-none"
            />
            <button onClick={handleNewChat} disabled={!chatInput.trim()}
              className="p-2 rounded-full bg-text-primary text-bg hover:opacity-90 transition-opacity disabled:opacity-30">
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-border/30">
        <div className="flex gap-6">
          {(['chats', 'sources'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-text-primary text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }`}>
              {tab === 'chats' ? `Chats${chats.length > 0 ? ` (${chats.length})` : ''}` : `Sources${sources.length > 0 ? ` (${sources.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto">
          {activeTab === 'chats' ? (
            <div className="space-y-1">
              {chats.length === 0 ? (
                <p className="text-center text-sm text-text-tertiary py-12">No chats yet. Type above and press Enter to start one.</p>
              ) : chats.map(chat => (
                <button key={chat.id} onClick={() => router.push(`/chat/${chat.id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-hover transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={16} className="text-text-tertiary shrink-0" />
                    <span className="text-sm text-text-primary font-medium truncate">{chat.title}</span>
                  </div>
                  <span className="text-xs text-text-tertiary shrink-0 ml-2">
                    {new Date(chat.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add source */}
              <div className="bg-surface rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-medium text-text-primary">Add source</h3>
                <div className="flex gap-2">
                  <button onClick={() => setSourceType('text')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sourceType === 'text' ? 'bg-accent text-white' : 'bg-surface-hover text-text-secondary hover:text-text-primary'}`}>
                    <FileText size={12} />Text
                  </button>
                  <button onClick={() => setSourceType('url')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sourceType === 'url' ? 'bg-accent text-white' : 'bg-surface-hover text-text-secondary hover:text-text-primary'}`}>
                    <Link size={12} />URL
                  </button>
                </div>
                <div className="flex gap-2 items-end">
                  {sourceType === 'text' ? (
                    <textarea
                      value={sourceInput}
                      onChange={e => setSourceInput(e.target.value)}
                      placeholder="Paste text, notes, or context..."
                      className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none h-20 focus:border-accent transition-colors"
                    />
                  ) : (
                    <input
                      value={sourceInput}
                      onChange={e => setSourceInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddSource() }}
                      placeholder="https://example.com/article"
                      className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
                    />
                  )}
                  <button onClick={handleAddSource} disabled={!sourceInput.trim()}
                    className="p-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white disabled:opacity-50 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Sources list */}
              {sources.length === 0 ? (
                <p className="text-center text-sm text-text-tertiary py-8">No sources yet. Add text or URLs above.</p>
              ) : sources.map(src => (
                <div key={src.id} className="flex items-start gap-3 px-4 py-3 rounded-lg bg-surface hover:bg-surface-hover transition-colors group">
                  {src.type === 'url'
                    ? <Link size={16} className="text-text-tertiary shrink-0 mt-0.5" />
                    : <FileText size={16} className="text-text-tertiary shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium truncate">{src.label}</p>
                    <p className="text-xs text-text-tertiary mt-0.5 truncate">{src.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteSource(src.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-all shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
