'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Zap } from 'lucide-react'
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
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-surface-hover transition-colors"
      >
        <span className="text-xl font-semibold text-text-primary">Pyxis</span>
        <ChevronDown
          size={18}
          className={`text-text-tertiary mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-[320px] bg-surface border border-border rounded-2xl shadow-2xl py-2 z-50 max-h-[70vh] overflow-y-auto">
          <div className="px-4 pt-2 pb-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            Free
          </div>
          {models.filter(m => m.free).map(m => (
            <button
              key={m.id}
              onClick={() => { setModel(m.id); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left ${model === m.id ? 'bg-surface-hover/40' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary font-medium">{m.name}</div>
                <div className="text-xs text-text-tertiary mt-0.5 truncate">{m.description}</div>
              </div>
              {model === m.id && <Check size={16} className="text-accent shrink-0" />}
            </button>
          ))}

          <div className="h-px bg-border/50 mx-3 my-2" />

          <div className="px-4 pb-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={11} />
            Premium
          </div>
          {models.filter(m => !m.free).map(m => (
            <button
              key={m.id}
              onClick={() => { setModel(m.id); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left ${model === m.id ? 'bg-surface-hover/40' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary font-medium">{m.name}</div>
                <div className="text-xs text-text-tertiary mt-0.5 truncate">{m.provider} · {m.description}</div>
              </div>
              {model === m.id && <Check size={16} className="text-accent shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
