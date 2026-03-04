'use client'

const SUGGESTIONS = [
  { label: '✨ Surprise me', prompt: "Tell me a fascinating fact I probably don't know." },
  { label: '🖼️ Create image', prompt: 'Create a beautiful image of a serene mountain lake at sunrise.' },
  { label: '✍️ Help me write', prompt: 'Help me write a compelling introduction for a blog post about AI and creativity.' },
  { label: '💡 Brainstorm', prompt: 'Brainstorm 10 creative side project ideas I can build in a weekend.' },
  { label: '📖 Explain a concept', prompt: 'Explain how large language models work in simple terms.' },
  { label: '🐛 Debug code', prompt: "Help me debug this error: TypeError: Cannot read properties of undefined." },
]

interface Props {
  onSend?: (text: string) => void
}

export default function WelcomeScreen({ onSend }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
      <h1 className="text-4xl font-semibold text-text-primary mb-8 text-center">
        What can I help with?
      </h1>
      <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
        {SUGGESTIONS.map(s => (
          <button
            key={s.label}
            onClick={() => onSend?.(s.prompt)}
            className="px-4 py-2.5 rounded-2xl bg-surface hover:bg-surface-hover border border-border/60 text-sm text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
