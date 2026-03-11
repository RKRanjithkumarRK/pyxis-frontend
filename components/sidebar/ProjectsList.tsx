'use client'

import { FolderOpen, Plus, ChevronDown, ChevronRight, Loader2, X, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

const CATEGORY_TAGS = [
  'Research', 'Coding', 'Writing', 'Homework',
  'Work', 'Travel', 'Finance', 'Personal',
]

export default function ProjectsList() {
  const { projects, setProjects } = useSidebar()
  const { getToken } = useAuth()
  const [expanded, setExpanded] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalName, setModalName] = useState('')
  const [modalTags, setModalTags] = useState<string[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuId) return
    const close = (e: MouseEvent) => {
      const t = e.target as Element
      if (!t.closest('[data-proj-menu]')) setMenuId(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuId])

  useEffect(() => {
    if (renamingId) setTimeout(() => renameRef.current?.focus(), 50)
  }, [renamingId])

  useEffect(() => { loadProjects() }, [])

  useEffect(() => {
    if (showModal) setTimeout(() => inputRef.current?.focus(), 50)
  }, [showModal])

  const loadProjects = async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setProjects(data.projects || []) }
    } catch {}
  }

  const handleRename = async (id: string) => {
    const newName = renameValue.trim()
    setRenamingId(null)
    if (!newName) return
    const token = await getToken()
    if (!token) return
    try {
      await fetch('/api/projects', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName }),
      })
      setProjects(projects.map(p => p.id === id ? { ...p, name: newName } : p))
      toast.success('Renamed')
    } catch { toast.error('Failed to rename') }
  }

  const handleDelete = async (id: string) => {
    setMenuId(null)
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/projects?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) { setProjects(projects.filter(p => p.id !== id)); toast.success('Deleted') }
    } catch { toast.error('Failed to delete') }
  }

  const openModal = () => { setModalName(''); setModalTags([]); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setModalName(''); setModalTags([]) }
  const toggleTag = (tag: string) =>
    setModalTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  const handleCreate = async () => {
    if (creating) return
    const name = modalName.trim() || 'New Project'
    setCreating(true)
    const token = await getToken()
    if (!token) { setCreating(false); return }
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tags: modalTags }),
      })
      if (res.ok) {
        const data = await res.json()
        closeModal()
        await loadProjects()
        router.push(`/project/${data.id}`)
      }
    } catch { toast.error('Failed to create project') }
    setCreating(false)
  }

  return (
    <>
      <div className="px-2 py-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-tertiary hover:text-text-secondary"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span>Projects</span>
        </button>

        {expanded && (
          <div className="space-y-0.5">
            <button
              onClick={openModal}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-hover transition-colors"
            >
              <Plus size={16} /><span>New project</span>
            </button>

            {projects.map(p => (
              <div
                key={p.id}
                className="relative"
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {renamingId === p.id ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-hover">
                    <FolderOpen size={16} className="text-text-tertiary shrink-0" />
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(p.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onBlur={() => handleRename(p.id)}
                      className="flex-1 bg-transparent text-sm text-text-primary outline-none"
                    />
                  </div>
                ) : (
                  <div className="flex items-center rounded-lg hover:bg-surface-hover transition-colors">
                    <button
                      onClick={() => router.push(`/project/${p.id}`)}
                      className="flex-1 flex items-center gap-3 px-3 py-2 text-sm text-text-secondary min-w-0"
                    >
                      <FolderOpen size={16} className="shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </button>
                    {(hoveredId === p.id || menuId === p.id) && (
                      <button
                        data-proj-menu=""
                        onClick={e => { e.stopPropagation(); setMenuId(menuId === p.id ? null : p.id) }}
                        className="p-1.5 mr-1 rounded text-text-tertiary hover:text-text-primary transition-colors shrink-0"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    )}
                  </div>
                )}

                {menuId === p.id && (
                  <div
                    data-proj-menu=""
                    className="absolute right-0 top-full z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[140px]"
                  >
                    <button
                      onClick={() => { setMenuId(null); setRenamingId(p.id); setRenameValue(p.name) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                    >
                      <Pencil size={13} />Rename
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={13} />Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-lg font-semibold text-text-primary">Create a project</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 pb-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Project name</label>
                <input
                  ref={inputRef}
                  value={modalName}
                  onChange={e => setModalName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                  placeholder="e.g. My Research Project"
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">
                  {"'What's this project for?'"} <span className="text-text-tertiary font-normal">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        modalTags.includes(tag)
                          ? 'bg-accent text-white border-accent'
                          : 'bg-bg border-border text-text-secondary hover:border-accent/60 hover:text-text-primary'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-text-tertiary leading-relaxed">
                Projects keep your chats, files, and notes organized. Rename or delete them anytime.
              </p>
              <div className="flex gap-3 pt-1">
                <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-surface-hover text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 size={15} className="animate-spin" />}
                  {creating ? 'Creating...' : 'Create project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
