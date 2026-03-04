'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Sparkles } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { models, getModel } from '@/lib/models'

export default function ModelSelector() {
  const { model, setModel } = useChat()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = getModel(model)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
      >
        <span className="text-lg font-semibold text-text-primary">Pyxis</span>
        <span className="text-lg text-text-tertiary font-light ml-1">{current?.name.split(' ').pop() || ''}</span>
        <ChevronDown size={16} className={`text-text-tertiary ml-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-[300px] bg-surface border border-border rounded-xl shadow-2xl py-2 z-50 max-h-[60vh] overflow-y-auto">
          {/* Free models */}
          <div className="px-3 py-1.5 text-xs font-medium text-text-tertiary">Free models</div>
          {models.filter(m => m.free).map(m => (
            <button
              key={m.id}
              onClick={() => { setModel(m.id); setOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors"
            >
              <div className="flex-1 text-left">
                <div className="text-sm text-text-primary font-medium">{m.name}</div>
                <div className="text-xs text-text-tertiary">{m.description}</div>
              </div>
              {model === m.id && <Check size={16} className="text-accent shrink-0" />}
            </button>
          ))}

          <div className="h-px bg-border mx-3 my-1" />

          {/* Paid models */}
          <div className="px-3 py-1.5 text-xs font-medium text-text-tertiary flex items-center gap-1">
            <Sparkles size={12} />
            Premium models
          </div>
          {models.filter(m => !m.free).map(m => (
            <button
              key={m.id}
              onClick={() => { setModel(m.id); setOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors"
            >
              <div className="flex-1 text-left">
                <div className="text-sm text-text-primary font-medium">{m.name}</div>
                <div className="text-xs text-text-tertiary">{m.provider} &middot; {m.description}</div>
              </div>
              {model === m.id && <Check size={16} className="text-accent shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
