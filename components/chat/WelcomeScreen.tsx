'use client'

import { useChat } from '@/contexts/ChatContext'

const SUGGESTIONS = [
  { label: 'Write Python code', prompt: 'Write a Python function that sorts a list of dictionaries by a given key.' },
  { label: 'Explain a concept', prompt: 'Explain how neural networks work in simple terms.' },
  { label: 'Draft an email', prompt: 'Write a professional email asking for a project status update.' },
  { label: 'Debug my code', prompt: 'Help me debug this error: TypeError: cannot read property of undefined.' },
]

interface Props {
  onSend?: (text: string) => void
}

export default function WelcomeScreen({ onSend }: Props) {
  const { model } = useChat()

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
      <h1 className="text-3xl font-semibold text-text-primary mb-2">
        How can I help you?
      </h1>
      <p className="text-text-tertiary text-sm mb-10">
        Start a conversation or try one of these
      </p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
        {SUGGESTIONS.map(s => (
          <button
            key={s.label}
            onClick={() => onSend?.(s.prompt)}
            className="text-left px-4 py-3 rounded-xl bg-surface hover:bg-surface-hover border border-border/50 transition-colors"
          >
            <p className="text-sm font-medium text-text-primary">{s.label}</p>
            <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">{s.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
