'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PersonalizationSettings() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [baseStyle, setBaseStyle] = useState('Normal')
  const [warm, setWarm] = useState('Default')
  const [enthusiastic, setEnthusiastic] = useState('Default')
  const [headersLists, setHeadersLists] = useState('Default')
  const [emoji, setEmoji] = useState('Default')
  const [instructions, setInstructions] = useState('')
  const [nickname, setNickname] = useState('')

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/profile?section=personalization', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        if (data.baseStyle) setBaseStyle(data.baseStyle)
        if (data.warm) setWarm(data.warm)
        if (data.enthusiastic) setEnthusiastic(data.enthusiastic)
        if (data.headersLists) setHeadersLists(data.headersLists)
        if (data.emoji) setEmoji(data.emoji)
        if (data.customInstructions !== undefined) setInstructions(data.customInstructions)
        if (data.nickname) setNickname(data.nickname)
      }
    } catch {}
    setLoading(false)
  }

  const saveField = async (field: string, value: string) => {
    const token = await getToken()
    if (!token) return
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'personalization', [field]: value }),
      })
    } catch {
      // Non-critical: silently ignore individual field save failures
    }
  }

  const saveInstructions = async () => {
    setSaving(true)
    const token = await getToken()
    if (!token) { setSaving(false); return }
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'personalization', customInstructions: instructions, nickname }),
      })
      toast.success('Custom instructions saved — applied to all future chats')
    } catch { toast.error('Failed to save') }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-text-tertiary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between py-3">
        <div>
          <span className="text-sm text-text-primary">Base style and tone</span>
          <p className="text-xs text-text-tertiary mt-0.5">Set how Pyxis responds to you.</p>
        </div>
        <select value={baseStyle} onChange={e => { setBaseStyle(e.target.value); saveField('baseStyle', e.target.value); toast.success('Saved') }}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none cursor-pointer">
          <option>Normal</option><option>Quirky</option><option>Formal</option><option>Concise</option>
        </select>
      </div>
      <div className="h-px bg-border" />
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-1">Characteristics</h3>
        <p className="text-xs text-text-tertiary mb-4">Additional customizations on top of your base style.</p>
        {[
          { label: 'Warm', value: warm, set: setWarm, field: 'warm' },
          { label: 'Enthusiastic', value: enthusiastic, set: setEnthusiastic, field: 'enthusiastic' },
          { label: 'Headers & Lists', value: headersLists, set: setHeadersLists, field: 'headersLists' },
          { label: 'Emoji', value: emoji, set: setEmoji, field: 'emoji' },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-text-primary">{item.label}</span>
            <select value={item.value} onChange={e => { item.set(e.target.value); saveField(item.field, e.target.value) }}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none cursor-pointer">
              <option>Default</option><option>More</option><option>Less</option>
            </select>
          </div>
        ))}
      </div>
      <div className="h-px bg-border" />
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-text-primary">Custom instructions</h3>
          <span className="text-xs text-accent">Applied to every chat</span>
        </div>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="e.g. Always respond in bullet points. You are an expert programmer. Keep answers brief."
          className="w-full h-28 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none focus:border-accent transition-colors"
        />
        <button onClick={saveInstructions} disabled={saving}
          className="mt-2 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save instructions
        </button>
      </div>
      <div className="h-px bg-border" />
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">About you</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Nickname</span>
          <input value={nickname} onChange={e => setNickname(e.target.value)}
            onBlur={() => { saveField('nickname', nickname); toast.success('Saved') }}
            placeholder="Enter nickname"
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none w-48 focus:border-accent transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
