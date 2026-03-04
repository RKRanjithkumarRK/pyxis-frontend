'use client'

import { Copy, ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
  content: string
  visible: boolean
}

export default function MessageActions({ content, visible }: Props) {
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState<boolean | null>(null)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!visible) return null

  return (
    <div className="flex items-center gap-0.5 mt-1">
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors"
        title="Copy"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <button
        onClick={() => setLiked(liked === true ? null : true)}
        className={`p-1.5 rounded-md transition-colors ${
          liked === true ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
        }`}
        title="Good response"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={() => setLiked(liked === false ? null : false)}
        className={`p-1.5 rounded-md transition-colors ${
          liked === false ? 'text-danger' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
        }`}
        title="Bad response"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  )
}
