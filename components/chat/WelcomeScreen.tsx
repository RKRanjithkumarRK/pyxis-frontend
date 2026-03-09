'use client'

const SUGGESTIONS = [
  { label: '🐍 Python web scraper', prompt: 'Write a Python web scraper using BeautifulSoup that extracts article titles and links from a news website.' },
  { label: '⚛️ Explain quantum computing', prompt: 'Explain quantum computing simply — what it is, how it works, and why it matters.' },
  { label: '📧 Write a cold email', prompt: 'Help me write a cold email to a potential client for my freelance web development services.' },
  { label: '📰 Summarize AI news', prompt: 'Summarize the latest developments and news in artificial intelligence from 2025 and 2026.' },
  { label: '⚡ React todo app', prompt: 'Build a React todo app with hooks — useState, useEffect, and useCallback — with add, complete, and delete functionality.' },
  { label: '🚀 Become a developer', prompt: 'What should I learn to become a developer in 2026? Give me a clear, practical roadmap.' },
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
