'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, X, ChevronDown, ChevronUp, Settings2, Volume2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Phase = 'idle' | 'listening' | 'thinking' | 'speaking'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

interface VoiceOption {
  id: string
  label: string
  pitch: number
  rate: number
  preferredName?: string
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SILENCE_MS = 2000

const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'professional', label: 'Professional', pitch: 1.0,  rate: 1.05 },
  { id: 'warm',         label: 'Warm',         pitch: 0.95, rate: 0.95 },
  { id: 'british',      label: 'British',      pitch: 1.05, rate: 1.0,  preferredName: 'Google UK English Female' },
  { id: 'casual',       label: 'Casual',       pitch: 1.1,  rate: 1.1  },
  { id: 'deep',         label: 'Deep',         pitch: 0.85, rate: 0.9  },
  { id: 'energetic',    label: 'Energetic',    pitch: 1.15, rate: 1.2  },
]

function buildSystem(nickname: string) {
  const nameStr = nickname ? `, and you are talking with ${nickname}` : ''
  return (
    `You are Pyxis, a friendly, knowledgeable, and capable voice AI assistant${nameStr}. ` +
    `Reply in 1-3 short conversational sentences. ` +
    `No markdown, bullets, headers, or lists - plain spoken language only. ` +
    `You have access to up-to-date information via web search. ` +
    `Never say you cannot access the internet - use web search instead. ` +
    `Never reveal your underlying model name, provider, or that you are built on any other AI. ` +
    `You are Pyxis. Always.`
  )
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function VoicePage() {
  const router       = useRouter()
  const { getToken } = useAuth()

  const [phase,         setPhase]         = useState<Phase>('idle')
  const [active,        setActive]        = useState(false)
  const [muted,         setMuted]         = useState(false)
  const [nickname,      setNickname]      = useState('')
  const [transcript,    setTranscript]    = useState('')
  const [messages,      setMessages]      = useState<Message[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('professional')
  const [showSettings,  setShowSettings]  = useState(false)
  const [speechRate,    setSpeechRate]    = useState(1.0)
  const [speechPitch,   setSpeechPitch]   = useState(1.0)
  const [language,      setLanguage]      = useState('en-US')
  const [waveHeights,   setWaveHeights]   = useState<number[]>(Array.from({ length: 30 }, () => 4))

  /* ── stable refs ── */
  const phaseRef       = useRef<Phase>('idle')
  const activeRef      = useRef(false)
  const recRef         = useRef<any>(null)
  const silenceRef     = useRef<any>(null)
  const accRef         = useRef('')
  const lastFullRef    = useRef('')
  const historyRef     = useRef<{ role: string; content: string }[]>([])
  const startListenRef = useRef<() => void>(() => {})
  const waveAnimRef    = useRef<any>(null)
  const convEndRef     = useRef<HTMLDivElement>(null)

  const setP = (p: Phase) => { phaseRef.current = p; setPhase(p) }

  /* ─── Waveform animation ─────────────────────────────────────────────── */
  useEffect(() => {
    if (phase === 'listening') {
      waveAnimRef.current = setInterval(() => {
        setWaveHeights(Array.from({ length: 30 }, () => Math.floor(Math.random() * 36) + 4))
      }, 80)
    } else {
      clearInterval(waveAnimRef.current)
      setWaveHeights(Array.from({ length: 30 }, () => 4))
    }
    return () => clearInterval(waveAnimRef.current)
  }, [phase])

  /* ─── Auto-scroll conversation ───────────────────────────────────────── */
  useEffect(() => {
    convEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ─── Spacebar shortcut ──────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      e.preventDefault()
      if (!activeRef.current) { startVoice(); return }
      if (phaseRef.current === 'idle') startListenRef.current()
      else if (phaseRef.current === 'speaking') {
        window.speechSynthesis.cancel(); setP('idle')
        setTimeout(() => startListenRef.current(), 150)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ─── kill recognition ────────────────────────────────────────────────── */
  const stopRec = () => {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null }
    if (recRef.current)     { try { recRef.current.abort() } catch {} recRef.current = null }
  }

  /* ─── TTS → then auto-restart listening ─────────────────────────────── */
  const speakThenListen = useCallback((text: string) => {
    if (!activeRef.current) return
    setP('speaking')
    window.speechSynthesis.cancel()

    setTimeout(() => {
      if (!activeRef.current) return
      const utter = new SpeechSynthesisUtterance(text)
      const voiceOpt = VOICE_OPTIONS.find(v => v.id === selectedVoice) || VOICE_OPTIONS[0]

      const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices()
        utter.voice =
          (voiceOpt.preferredName ? voices.find(v => v.name === voiceOpt.preferredName) : null) ||
          voices.find(v => v.name === 'Google US English') ||
          voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
          voices.find(v => !v.localService && v.lang.startsWith('en')) ||
          voices.find(v => v.lang.startsWith('en')) ||
          null

        utter.rate   = speechRate * voiceOpt.rate
        utter.pitch  = speechPitch * voiceOpt.pitch
        utter.volume = 1

        let fired = false
        let ttsStarted = false
        const done = () => {
          if (fired) return; fired = true
          clearInterval(pollId); clearInterval(keepAlive); clearTimeout(fallback)
          if (!activeRef.current) return
          setP('idle')
          setTimeout(() => startListenRef.current(), 150)
        }
        utter.onstart = () => { ttsStarted = true }
        utter.onend   = done
        utter.onerror = done
        window.speechSynthesis.speak(utter)

        const pollId    = setInterval(() => { if (ttsStarted && !window.speechSynthesis.speaking) done() }, 300)
        const keepAlive = setInterval(() => { if (window.speechSynthesis.speaking) { window.speechSynthesis.pause(); window.speechSynthesis.resume() } }, 10000)
        const fallback  = setTimeout(done, Math.max(text.length * 75, 5000))
      }

      if (window.speechSynthesis.getVoices().length > 0) {
        trySpeak()
      } else {
        window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; trySpeak() }
        setTimeout(trySpeak, 500)
      }
    }, 120)
  }, [selectedVoice, speechRate, speechPitch])

  /* ─── Call AI ─────────────────────────────────────────────────────────── */
  const callAI = useCallback(async (text: string) => {
    if (!text.trim() || !activeRef.current) return
    setTranscript('')
    setP('thinking')
    const userMsg: Message = { role: 'user', content: text.trim(), ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    historyRef.current = [...historyRef.current, { role: 'user', content: text.trim() }]

    try {
      const token = await getToken()
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messages: historyRef.current, systemPrompt: buildSystem(nickname) }),
      })
      if (!activeRef.current) return

      let data: any
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) { data = await res.json() }
      else { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`) }
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)

      const reply = (data.reply || "Sorry, I didn't get a response.").trim()
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }]
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }])
      speakThenListen(reply)
    } catch {
      if (activeRef.current) { setP('idle'); setTimeout(() => startListenRef.current(), 300) }
    }
  }, [speakThenListen, getToken, nickname])

  /* ─── Start listening ─────────────────────────────────────────────────── */
  const startListening = useCallback(() => {
    if (!activeRef.current || phaseRef.current !== 'idle') return
    stopRec()
    accRef.current = ''; lastFullRef.current = ''
    setTranscript('')
    setP('listening')

    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SR) { alert('Voice mode requires Chrome or Edge.'); return }

    const r = new SR()
    recRef.current = r
    r.continuous = true; r.interimResults = true; r.lang = language; r.maxAlternatives = 3

    r.onresult = (e: any) => {
      if (!activeRef.current) return
      if (silenceRef.current) clearTimeout(silenceRef.current)
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          let best = e.results[i][0]
          for (let j = 1; j < e.results[i].length; j++) {
            if ((e.results[i][j].confidence || 0) > (best.confidence || 0)) best = e.results[i][j]
          }
          accRef.current += best.transcript + ' '
        } else { interim += e.results[i][0].transcript }
      }
      const full = (accRef.current + interim).trim()
      if (full) {
        lastFullRef.current = full
        setTranscript(full)
        silenceRef.current = setTimeout(() => {
          const toSend = (accRef.current || lastFullRef.current).trim()
          if (toSend && activeRef.current) { stopRec(); callAI(toSend) }
        }, SILENCE_MS)
      }
    }

    r.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        alert('Microphone access denied. Click the lock icon in the address bar and allow microphone.')
        activeRef.current = false; setActive(false); setP('idle'); return
      }
      if (activeRef.current && phaseRef.current === 'listening') setTimeout(() => startListenRef.current(), 400)
    }

    r.onend = () => {
      if (silenceRef.current) clearTimeout(silenceRef.current)
      if (!activeRef.current || phaseRef.current !== 'listening') return
      const text = (accRef.current || lastFullRef.current).trim()
      if (text) { callAI(text) } else { setTimeout(() => startListenRef.current(), 200) }
    }

    try { r.start() } catch { setP('idle') }
  }, [callAI, language])

  useEffect(() => { startListenRef.current = startListening }, [startListening])

  useEffect(() => {
    const load = async () => {
      const token = await getToken()
      if (!token) return
      try {
        const res = await fetch('/api/profile?section=personalization', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) { const data = await res.json(); if (data.nickname) setNickname(data.nickname) }
      } catch {}
    }
    load()
  }, [getToken])

  /* ─── Start / End / Mute ─────────────────────────────────────────────── */
  const startVoice = () => {
    activeRef.current = true; setActive(true)
    historyRef.current = []; setMessages([]); setMuted(false); setP('idle')
    setTimeout(() => startListenRef.current(), 80)
  }

  const endVoice = useCallback(() => {
    activeRef.current = false; setActive(false)
    window.speechSynthesis.cancel(); stopRec(); setP('idle')
    router.push('/hub')
  }, [router])

  const toggleMute = () => {
    if (!active) return
    if (!muted) { stopRec(); setMuted(true); setP('idle') }
    else { setMuted(false); setTimeout(() => startListenRef.current(), 80) }
  }

  /* ─── Orb tap ──────────────────────────────────────────────────────────── */
  const tapOrb = () => {
    if (!active) { startVoice(); return }
    if (phase === 'speaking') {
      window.speechSynthesis.cancel(); setP('idle')
      setTimeout(() => startListenRef.current(), 150)
    } else if (phase === 'idle') {
      startListenRef.current()
    }
  }

  useEffect(() => () => {
    activeRef.current = false; window.speechSynthesis.cancel()
    if (silenceRef.current) clearTimeout(silenceRef.current)
    if (recRef.current) { try { recRef.current.abort() } catch {} }
  }, [])

  /* ─── Derived ─────────────────────────────────────────────────────────── */
  const isListening = phase === 'listening'
  const isThinking  = phase === 'thinking'
  const isSpeaking  = phase === 'speaking'

  const stateLabel = !active
    ? 'Tap to speak'
    : isListening ? 'Listening...'
    : isThinking  ? 'Thinking...'
    : isSpeaking  ? 'Speaking...'
    : 'Tap to speak'

  /* ─── Orb style computations ───────────────────────────────────────────── */
  const orbGradient = isListening
    ? 'linear-gradient(135deg, #10b981 0%, #34d399 40%, #6366f1 100%)'
    : isThinking
    ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)'
    : isSpeaking
    ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #6366f1 100%)'
    : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #3b82f6 100%)'

  const orbGlow = isListening
    ? '0 0 60px rgba(16,185,129,0.5), 0 0 120px rgba(16,185,129,0.25), 0 0 200px rgba(99,102,241,0.15)'
    : isThinking
    ? '0 0 60px rgba(59,130,246,0.5), 0 0 120px rgba(99,102,241,0.25)'
    : isSpeaking
    ? '0 0 70px rgba(168,85,247,0.6), 0 0 140px rgba(124,58,237,0.3), 0 0 220px rgba(99,102,241,0.15)'
    : active
    ? '0 0 40px rgba(99,102,241,0.3), 0 0 80px rgba(124,58,237,0.15)'
    : '0 8px 40px rgba(0,0,0,0.2)'

  /* ─── JSX ─────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes orbPulseFast {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.07); }
        }
        @keyframes orbSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbWave {
          0%   { transform: scale(1);    opacity: 0.7; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes ringExpand {
          0%   { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes ringExpand2 {
          0%   { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes ringExpand3 {
          0%   { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(2.1); opacity: 0; }
        }
        @keyframes spinBorder {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barWave {
          0%, 100% { transform: scaleY(0.15); }
          50%       { transform: scaleY(1); }
        }
        .orb-idle    { animation: orbPulse 4s ease-in-out infinite; }
        .orb-listen  { animation: orbPulseFast 1.2s ease-in-out infinite; }
        .orb-think   { animation: orbPulseFast 2s ease-in-out infinite; }
        .orb-speak   { animation: orbPulseFast 1.8s ease-in-out infinite; }
        .ring-1 { animation: ringExpand  2s ease-out infinite; }
        .ring-2 { animation: ringExpand2 2s ease-out infinite 0.5s; }
        .ring-3 { animation: ringExpand3 2s ease-out infinite 1s; }
        .ring-speak-1 { animation: ringExpand  1.5s ease-out infinite; }
        .ring-speak-2 { animation: ringExpand2 1.5s ease-out infinite 0.4s; }
        .ring-speak-3 { animation: ringExpand3 1.5s ease-out infinite 0.8s; }
        .spin-border {
          animation: spinBorder 1.5s linear infinite;
        }
        .msg-in { animation: fadeSlideIn 0.3s ease forwards; }
      `}</style>

      <div className="h-full bg-bg flex flex-col items-center select-none relative overflow-hidden">

        {/* ── Background ambient glow ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: isListening
            ? 'radial-gradient(ellipse at 50% 40%, rgba(16,185,129,0.06) 0%, transparent 70%)'
            : isSpeaking
            ? 'radial-gradient(ellipse at 50% 40%, rgba(168,85,247,0.07) 0%, transparent 70%)'
            : isThinking
            ? 'radial-gradient(ellipse at 50% 40%, rgba(59,130,246,0.06) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.04) 0%, transparent 70%)',
          transition: 'background 1s ease',
        }} />

        {/* ── Conversation history ── */}
        {messages.length > 0 && (
          <div style={{
            width: '100%', maxWidth: 600,
            flex: 1, overflowY: 'auto', padding: '16px 20px 0',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((msg, i) => (
              <div key={i} className="msg-in" style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: 8, marginTop: 2,
                  }}>
                    <Volume2 size={13} color="white" />
                  </div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #6366f1, #7c3aed)'
                    : 'var(--surface)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize: 13.5, lineHeight: '1.55',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={convEndRef} />
          </div>
        )}

        {/* ── Orb section ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 0, padding: messages.length > 0 ? '20px 0 0' : '0',
          flex: messages.length > 0 ? '0 0 auto' : '1',
          justifyContent: messages.length > 0 ? 'flex-end' : 'center',
          width: '100%',
        }}>

          {/* Orb container */}
          <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Listening rings */}
            {isListening && (
              <>
                <div className="ring-1" style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '2px solid rgba(16,185,129,0.5)',
                }} />
                <div className="ring-2" style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '2px solid rgba(16,185,129,0.35)',
                }} />
                <div className="ring-3" style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '1px solid rgba(16,185,129,0.2)',
                }} />
              </>
            )}

            {/* Speaking rings */}
            {isSpeaking && (
              <>
                <div className="ring-speak-1" style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '2px solid rgba(168,85,247,0.5)',
                }} />
                <div className="ring-speak-2" style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '2px solid rgba(168,85,247,0.35)',
                }} />
                <div className="ring-speak-3" style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '1px solid rgba(168,85,247,0.2)',
                }} />
              </>
            )}

            {/* Thinking spinning border */}
            {isThinking && (
              <div className="spin-border" style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                border: '3px solid transparent',
                borderTopColor: '#3b82f6',
                borderRightColor: '#6366f1',
              }} />
            )}

            {/* The orb itself */}
            <div
              onClick={tapOrb}
              className={
                !active ? 'orb-idle' :
                isListening ? 'orb-listen' :
                isThinking ? 'orb-think' :
                isSpeaking ? 'orb-speak' : 'orb-idle'
              }
              style={{
                width: 200, height: 200, borderRadius: '50%',
                background: orbGradient,
                boxShadow: orbGlow,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background 0.8s ease, box-shadow 0.8s ease',
              }}
            >
              {/* Highlight */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.35) 0%, transparent 55%)',
              }} />
              {/* Inner glow rim */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                boxShadow: 'inset 0 -16px 32px rgba(0,0,0,0.2), inset 0 4px 12px rgba(255,255,255,0.1)',
              }} />
              {/* Center icon */}
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isThinking ? (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.6)',
                    borderTopColor: 'white',
                    animation: 'spinBorder 0.8s linear infinite',
                  }} />
                ) : (
                  <Mic size={40} color="rgba(255,255,255,0.9)" />
                )}
              </div>
            </div>
          </div>

          {/* State label */}
          <p style={{
            marginTop: 20, fontSize: 15, fontWeight: 500,
            color: isListening ? '#10b981' : isSpeaking ? '#a855f7' : isThinking ? '#3b82f6' : 'var(--text-secondary)',
            letterSpacing: '0.02em', transition: 'color 0.4s ease',
          }}>
            {stateLabel}
          </p>

          {/* Keyboard hint */}
          <p style={{ marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.01em' }}>
            {active ? 'Press Space to speak · Tap orb to interrupt' : 'Press Space or tap orb to start'}
          </p>

          {/* ── Live transcript card ── */}
          <div style={{
            marginTop: 16, width: '100%', maxWidth: 560, minHeight: 52,
            padding: '12px 18px', borderRadius: 14,
            background: isListening ? 'rgba(16,185,129,0.06)' : 'var(--surface)',
            border: `1px solid ${isListening ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
            transition: 'all 0.3s ease',
            display: 'flex', alignItems: 'center',
          }}>
            {isListening && (
              <span style={{ marginRight: 10, width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0, animation: 'orbPulseFast 1s ease infinite' }} />
            )}
            <p style={{
              fontSize: 13.5, color: transcript ? 'var(--text-primary)' : 'var(--text-tertiary)',
              lineHeight: '1.5', fontStyle: transcript ? 'normal' : 'italic',
            }}>
              {transcript || (isListening ? 'Listening for speech...' : isThinking ? 'Processing your request...' : 'Your speech will appear here')}
            </p>
          </div>

          {/* ── Waveform ── */}
          <div style={{
            marginTop: 14,
            display: 'flex', alignItems: 'center', gap: 3,
            height: 48, opacity: isListening ? 1 : 0.15,
            transition: 'opacity 0.4s ease',
          }}>
            {waveHeights.map((h, i) => (
              <div key={i} style={{
                width: 3, height: `${h}px`, borderRadius: 2,
                background: `rgba(16,185,129,${0.5 + (h / 40) * 0.5})`,
                transition: isListening ? 'height 0.08s ease' : 'none',
              }} />
            ))}
          </div>

          {/* ── Voice selector ── */}
          <div style={{
            marginTop: 16, width: '100%', maxWidth: 560,
            overflowX: 'auto', display: 'flex', gap: 8, padding: '0 4px',
            scrollbarWidth: 'none',
          }}>
            {VOICE_OPTIONS.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVoice(v.id)}
                style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 20,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  background: selectedVoice === v.id ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : 'var(--surface)',
                  border: selectedVoice === v.id ? 'none' : '1px solid var(--border)',
                  color: selectedVoice === v.id ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* ── Settings panel ── */}
          <div style={{ marginTop: 14, width: '100%', maxWidth: 560 }}>
            <button
              onClick={() => setShowSettings(s => !s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: 'var(--text-tertiary)', background: 'none',
                border: 'none', cursor: 'pointer', padding: '4px 0',
              }}
            >
              <Settings2 size={13} />
              Settings
              {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showSettings && (
              <div style={{
                marginTop: 10, padding: '16px', borderRadius: 14,
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px',
              }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
                    Speech Rate: {speechRate.toFixed(1)}x
                  </label>
                  <input type="range" min="0.5" max="2" step="0.1" value={speechRate}
                    onChange={e => setSpeechRate(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#6366f1' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
                    Pitch: {speechPitch.toFixed(1)}
                  </label>
                  <input type="range" min="0.5" max="1.5" step="0.1" value={speechPitch}
                    onChange={e => setSpeechPitch(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#6366f1' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    style={{
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '6px 10px', fontSize: 12,
                      color: 'var(--text-primary)', width: '100%',
                    }}>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Spanish</option>
                    <option value="fr-FR">French</option>
                    <option value="de-DE">German</option>
                    <option value="ja-JP">Japanese</option>
                    <option value="zh-CN">Chinese (Mandarin)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ── Controls ── */}
          <div style={{
            marginTop: 20, marginBottom: 32,
            display: 'flex', gap: 14, alignItems: 'center',
          }}>
            {active && (
              <button
                onClick={toggleMute}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: muted ? '#ef4444' : 'var(--surface)',
                  border: muted ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: muted ? '0 0 20px rgba(239,68,68,0.3)' : '0 2px 12px rgba(0,0,0,0.1)',
                }}
              >
                {muted ? <MicOff size={20} color="white" /> : <Mic size={20} color="var(--text-secondary)" />}
              </button>
            )}

            <button
              onClick={endVoice}
              style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease',
              }}
            >
              <X size={20} color="var(--text-secondary)" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
