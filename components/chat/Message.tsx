'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import MessageActions from './MessageActions'
import { Message as MessageType } from '@/types'

interface Props {
  message: MessageType
}

export default function Message({ message }: Props) {
  const [hovered, setHovered] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div
      className="msg-in group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`flex gap-4 py-4 ${isUser ? 'justify-end' : ''}`}>
        {/* Assistant avatar */}
        {!isUser && (
          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        <div className={`max-w-[70%] min-w-0 ${isUser ? '' : 'flex-1'}`}>
          {/* User message bubble */}
          {isUser ? (
            <div className="px-4 py-3 rounded-3xl bg-surface text-text-primary text-[15px] leading-relaxed">
              {message.content}
              {message.imageUrl && (
                <img src={message.imageUrl} alt="Generated" className="mt-2 rounded-xl max-w-full" />
              )}
            </div>
          ) : (
            /* Assistant message */
            <div className="text-[15px] leading-relaxed text-text-primary">
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
              {message.imageUrl && (
                <img src={message.imageUrl} alt="Generated" className="mt-3 rounded-xl max-w-md" />
              )}
              <MessageActions content={message.content} visible={hovered} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
