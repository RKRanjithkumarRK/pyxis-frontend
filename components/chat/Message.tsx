'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import MessageActions from './MessageActions'
import { Message as MessageType } from '@/types'

interface Props {
  message: MessageType
}

function PyxisIcon() {
  return (
    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
        <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

export default function Message({ message }: Props) {
  const [hovered, setHovered] = useState(false)
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div
        className="msg-in flex justify-end w-full max-w-3xl mx-auto px-4 py-2"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="max-w-[80%] px-5 py-3.5 rounded-3xl bg-surface text-text-primary text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
          {message.imageUrl && (
            <img src={message.imageUrl} alt="Generated" className="mt-2 rounded-xl max-w-full" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="msg-in w-full max-w-3xl mx-auto px-4 py-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex gap-4">
        <div className="shrink-0 mt-0.5">
          <PyxisIcon />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="text-[15px] leading-relaxed text-text-primary">
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
            {message.imageUrl && (
              <img src={message.imageUrl} alt="Generated" className="mt-3 rounded-2xl max-w-sm" />
            )}
          </div>
          <MessageActions content={message.content} visible={hovered} />
        </div>
      </div>
    </div>
  )
}
