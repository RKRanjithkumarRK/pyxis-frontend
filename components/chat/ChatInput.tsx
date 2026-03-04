'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Mic, AudioLines, ArrowUp, Square, FileText, X, MicOff } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import toast from 'react-hot-toast'

interface Props {
  onSend: (content: string) => void
  onVoiceMode: () => void
  disabled?: boolean
}

type MicState = 'idle' | 'requesting' | 'listening' | 'denied' | 'unsupported'

export default function ChatInput({ onSend, onVoiceMode, disabled }: Props) {
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null)
  const [micState, setMicState] = useState<MicState>('idle')
  const [showMicPrompt, setShowMicPrompt] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const { isStreaming } = useChat()

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  // Stop recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop() }
  }, [])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if ((!trimmed && !attachment) || disabled || isStreaming) return
    const content = attachment
      ? `${trimmed}\n\n[File: ${attachment.name}]\n\`\`\`\n${attachment.content}\n\`\`\``
      : trimmed
    onSend(content)
    setInput('')
    setAttachment(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('File too large. Max 2MB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setAttachment({ name: file.name, content: ev.target?.result as string })
      toast.success(`Attached: ${file.name}`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const startListening = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMicState('unsupported')
      setShowMicPrompt(true)
      return
    }

    // Check existing permission
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      if (perm.state === 'denied') {
        setMicState('denied')
        setShowMicPrompt(true)
        return
      }
    } catch {}

    // Show our in-app permission prompt first
    setShowMicPrompt(true)
    setMicState('requesting')
  }

  const confirmMicAccess = async () => {
    setShowMicPrompt(false)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    try {
      // Request mic access first
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setMicState('denied')
      toast.error('Microphone access denied. Please allow it in browser settings.')
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => setMicState('listening')

    recognition.onresult = (e: any) => {
      let final = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
      }
      if (final) setInput(prev => prev ? prev + ' ' + final : final)
    }

    recognition.onend = () => setMicState('idle')

    recognition.onerror = (e: any) => {
      setMicState('idle')
      if (e.error === 'not-allowed') {
        setMicState('denied')
        toast.error('Microphone blocked. Allow access in browser settings.')
      }
    }

    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setMicState('idle')
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto">

        {/* Mic permission / status dialog */}
        {showMicPrompt && (
          <div className="mb-3 p-4 bg-surface border border-border rounded-2xl shadow-lg">
            {micState === 'unsupported' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MicOff size={18} className="text-danger" />
                  <p className="text-sm font-medium text-text-primary">Voice not available</p>
                </div>
                <p className="text-xs text-text-secondary">
                  Voice input requires <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.
                  Brave and Firefox block this API.
                </p>
                <button onClick={() => setShowMicPrompt(false)} className="text-xs text-accent hover:underline">Dismiss</button>
              </div>
            ) : micState === 'denied' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MicOff size={18} className="text-danger" />
                  <p className="text-sm font-medium text-text-primary">Microphone blocked</p>
                </div>
                <p className="text-xs text-text-secondary">
                  Click the lock icon in your browser's address bar and allow microphone access, then try again.
                </p>
                <button onClick={() => setShowMicPrompt(false)} className="text-xs text-accent hover:underline">Dismiss</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mic size={18} className="text-accent" />
                  <p className="text-sm font-medium text-text-primary">Allow microphone access?</p>
                </div>
                <p className="text-xs text-text-secondary">
                  Pyxis needs access to your microphone to transcribe your voice into text.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmMicAccess}
                    className="flex-1 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
                  >
                    Allow
                  </button>
                  <button
                    onClick={() => { setShowMicPrompt(false); setMicState('idle') }}
                    className="flex-1 py-2 rounded-xl bg-surface-hover hover:bg-surface-active text-text-primary text-sm font-medium transition-colors"
                  >
                    Don't allow
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* File attachment preview */}
        {attachment && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-surface rounded-xl border border-border/50 text-sm text-text-secondary">
            <FileText size={14} className="text-accent shrink-0" />
            <span className="truncate flex-1">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="text-text-tertiary hover:text-text-primary">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 bg-surface rounded-3xl border border-border/50 px-4 py-3 input-glow">
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-full text-text-tertiary hover:text-text-secondary transition-colors shrink-0 mb-0.5"
            title="Attach file (txt, md, json, csv — max 2MB)"
          >
            <Plus size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json,.csv,.js,.ts,.py,.html,.css,.xml,.yaml,.yml"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            rows={1}
            className="flex-1 bg-transparent text-text-primary text-[15px] placeholder:text-text-tertiary outline-none resize-none max-h-[200px] leading-relaxed"
            disabled={disabled}
          />

          {/* Right buttons */}
          <div className="flex items-center gap-1 shrink-0 mb-0.5">
            {(input.trim() || attachment || isStreaming) ? (
              <button
                onClick={isStreaming ? undefined : handleSubmit}
                disabled={(!input.trim() && !attachment && !isStreaming) || disabled}
                className="p-2 rounded-full bg-text-primary text-bg hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                {isStreaming ? <Square size={16} /> : <ArrowUp size={16} />}
              </button>
            ) : (
              <>
                {/* Mic button — shows active state when listening */}
                <button
                  onClick={micState === 'listening' ? stopListening : startListening}
                  className={`p-2 rounded-full transition-colors ${
                    micState === 'listening'
                      ? 'text-danger bg-danger/10 animate-pulse'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                  title={micState === 'listening' ? 'Stop listening' : 'Voice input'}
                >
                  <Mic size={20} />
                </button>
                {/* Voice mode button */}
                <button
                  onClick={onVoiceMode}
                  className="p-2 rounded-full text-text-tertiary hover:text-text-secondary transition-colors"
                  title="Full voice mode"
                >
                  <AudioLines size={20} />
                </button>
              </>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-text-tertiary mt-2">
          Pyxis can make mistakes. Check important info.
        </p>
      </div>
    </div>
  )
}
