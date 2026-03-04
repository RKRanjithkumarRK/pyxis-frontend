'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GeneralSettings() {
  const { getToken } = useAuth()
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [appearance, setAppearance] = useState('System')
  const [language, setLanguage] = useState('Auto-detect')
  const [spokenLang, setSpokenLang] = useState('Auto-detect')
  const [voice, setVoice] = useState('Cove')

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/profile?section=general', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        if (data.appearance) setAppearance(data.appearance)
        if (data.language) setLanguage(data.language)
        if (data.spokenLang) setSpokenLang(data.spokenLang)
        if (data.voice) setVoice(data.voice)
      }
    } catch {}
    setLoading(false)
  }

  const save = async (field: string, value: string) => {
    setSaving(true)
    const token = await getToken()
    if (!token) return
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'general', [field]: value }),
      })
      toast.success('Saved')
    } catch { toast.error('Failed to save') }
    setSaving(false)
  }

  const playVoice = () => {
    if (!('speechSynthesis' in window)) { toast.error('Voice not supported in this browser'); return }
    window.speechSynthesis.cancel()
    const voices = window.speechSynthesis.getVoices()
    const utterance = new SpeechSynthesisUtterance(`Hi! I'm ${voice}, your Pyxis voice assistant.`)
    const match = voices.find(v => v.name.toLowerCase().includes(voice.toLowerCase()))
    if (match) utterance.voice = match
    window.speechSynthesis.speak(utterance)
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-text-tertiary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between py-3">
        <span className="text-sm text-text-primary">Appearance</span>
        <select
          value={theme}
          onChange={e => {
            const val = e.target.value as 'system' | 'dark' | 'light'
            setTheme(val)
            setAppearance(val)
            save('appearance', val)
            toast.success(`${val.charAt(0).toUpperCase() + val.slice(1)} theme applied`)
          }}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none cursor-pointer"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-center justify-between py-3">
        <span className="text-sm text-text-primary">Language</span>
        <select value={language} onChange={e => { setLanguage(e.target.value); save('language', e.target.value) }}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none cursor-pointer">
          <option>Auto-detect</option><option>English</option><option>Spanish</option>
          <option>French</option><option>German</option><option>Hindi</option>
          <option>Japanese</option><option>Chinese</option>
        </select>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-center justify-between py-3">
        <div>
          <span className="text-sm text-text-primary">Spoken language</span>
          <p className="text-xs text-text-tertiary mt-0.5">For best results, select the language you mainly speak.</p>
        </div>
        <select value={spokenLang} onChange={e => { setSpokenLang(e.target.value); save('spokenLang', e.target.value) }}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none cursor-pointer">
          <option>Auto-detect</option><option>English</option><option>Spanish</option><option>Hindi</option>
        </select>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-center justify-between py-3">
        <span className="text-sm text-text-primary">Voice</span>
        <div className="flex items-center gap-2">
          <button onClick={playVoice} className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-sm text-text-secondary transition-colors">
            Play
          </button>
          <select value={voice} onChange={e => { setVoice(e.target.value); save('voice', e.target.value) }}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none cursor-pointer">
            <option>Cove</option><option>Ember</option><option>Breeze</option><option>Juniper</option><option>Sol</option>
          </select>
        </div>
      </div>
      {saving && <p className="text-xs text-text-tertiary text-center">Saving...</p>}
    </div>
  )
}
