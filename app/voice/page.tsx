'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Phase = 'idle' | 'listening' | 'thinking' | 'speaking'

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SILENCE_MS = 2000

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

  const [phase,    setPhase]    = useState<Phase>('idle')
  const [active,   setActive]   = useState(false)
  const [muted,    setMuted]    = useState(false)
  const [nickname, setNickname] = useState('')

  /* ── stable refs ── */
  const phaseRef       = useRef<Phase>('idle')
  const activeRef      = useRef(false)
  const recRef         = useRef<any>(null)
  const silenceRef     = useRef<any>(null)
  const accRef         = useRef('')
  const lastFullRef    = useRef('')
  const historyRef     = useRef<{ role: string; content: string }[]>([])
  const startListenRef = useRef<() => void>(() => {})

  const setP = (p: Phase) => { phaseRef.current = p; setPhase(p) }

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

      const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices()
        utter.voice =
          voices.find(v => v.name === 'Google US English') ||
          voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
          voices.find(v => !v.localService && v.lang.startsWith('en')) ||
          voices.find(v => v.lang.startsWith('en')) ||
          null
        utter.rate = 1.05; utter.pitch = 1; utter.volume = 1

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

        const pollId   = setInterval(() => { if (ttsStarted && !window.speechSynthesis.speaking) done() }, 300)
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
  }, [])

  /* ─── Call AI ─────────────────────────────────────────────────────────── */
  const callAI = useCallback(async (text: string) => {
    if (!text.trim() || !activeRef.current) return
    setP('thinking')
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
    setP('listening')

    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SR) { alert('Voice mode requires Chrome or Edge.'); return }

    const r = new SR()
    recRef.current = r
    r.continuous = true; r.interimResults = true; r.lang = 'en-US'; r.maxAlternatives = 3

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
        silenceRef.current = setTimeout(() => {
          const toSend = (accRef.current || lastFullRef.current).trim()
          if (toSend && activeRef.current) { stopRec(); callAI(toSend) }
        }, SILENCE_MS)
      }
    }

    r.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        alert('Microphone access denied. Click the 🔒 in the address bar → allow microphone.')
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
  }, [callAI])

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
    historyRef.current = []; setMuted(false); setP('idle')
    setTimeout(() => startListenRef.current(), 80)
  }

  const endVoice = useCallback(() => {
    activeRef.current = false; setActive(false)
    window.speechSynthesis.cancel(); stopRec(); setP('idle')
    router.push('/hub')
  }, [router])

  const toggleMute = () => {
    if (!active) return
    if (!muted) {
      stopRec(); setMuted(true); setP('idle')
    } else {
      setMuted(false)
      setTimeout(() => startListenRef.current(), 80)
    }
  }

  /* ─── Orb tap (tap to interrupt speaking) ──────────────────────────────── */
  const tapOrb = () => {
    if (!active) { startVoice(); return }
    if (phase === 'speaking') {
      window.speechSynthesis.cancel(); setP('idle')
      setTimeout(() => startListenRef.current(), 150)
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

  /* orb animation speed: faster when speaking/listening, slow breathe when idle */
  const flowSpeed   = isThinking ? '3s' : isSpeaking ? '4s' : isListening ? '5s' : '8s'
  const orbScale    = active ? (isSpeaking ? 'scale(1.06)' : isListening ? 'scale(1.03)' : 'scale(1)') : 'scale(0.92)'
  const orbOpacity  = active ? 1 : 0.55
  const orbGlow     = active
    ? (isSpeaking
        ? '0 0 80px rgba(56,189,248,0.45), 0 0 160px rgba(29,78,216,0.2)'
        : isListening
        ? '0 0 60px rgba(56,189,248,0.3), 0 0 120px rgba(29,78,216,0.15)'
        : '0 0 40px rgba(56,189,248,0.15)')
    : '0 8px 40px rgba(0,0,0,0.12)'

  /* ─── JSX ─────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes orbFlow {
          from { transform: rotate(0deg) scale(1.8); }
          to   { transform: rotate(360deg) scale(1.8); }
        }
        @keyframes orbBreath {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.05); }
        }
      `}</style>

      <div className="h-full bg-bg flex flex-col items-center justify-center select-none relative overflow-hidden">

        {/* ── Orb ── */}
        <div
          onClick={tapOrb}
          style={{
            width: 180, height: 180,
            borderRadius: '50%',
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            transform: orbScale,
            opacity: orbOpacity,
            boxShadow: orbGlow,
            transition: 'transform 0.6s ease, opacity 0.6s ease, box-shadow 0.6s ease',
            animation: active ? 'orbBreath 3s ease-in-out infinite' : 'none',
          }}
        >
          {/* Base blue */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, #7dd3fc 0%, #3b82f6 45%, #1d4ed8 100%)',
          }} />

          {/* Rotating fluid conic layer */}
          <div style={{
            position: 'absolute',
            inset: '-40%',
            background: `conic-gradient(
              from 0deg at 38% 38%,
              #bfdbfe 0deg,
              #38bdf8 55deg,
              #1d4ed8 110deg,
              #60a5fa 165deg,
              #e0f2fe 220deg,
              #38bdf8 275deg,
              #1e40af 330deg,
              #bfdbfe 360deg
            )`,
            animation: `orbFlow ${flowSpeed} linear infinite`,
            filter: 'blur(6px)',
            transition: 'animation-duration 1s ease',
          }} />

          {/* White highlight */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 33% 22%, rgba(255,255,255,0.72) 0%, transparent 52%)',
          }} />

          {/* Subtle rim */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            boxShadow: 'inset 0 -8px 24px rgba(29,78,216,0.35)',
          }} />
        </div>

        {/* ── Bottom controls ── */}
        <div style={{
          position: 'absolute', bottom: 52,
          display: 'flex', gap: 16, alignItems: 'center',
          transition: 'opacity 0.3s ease',
          opacity: active ? 1 : 0,
          pointerEvents: active ? 'auto' : 'none',
        }}>
          {/* Mute / Unmute */}
          <button
            onClick={toggleMute}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: muted ? '#ef4444' : 'var(--surface-active)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s ease',
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
            }}
          >
            {muted
              ? <MicOff size={22} color="white" />
              : <Mic size={22} color="white" />
            }
          </button>

          {/* End */}
          <button
            onClick={endVoice}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--surface-hover)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <X size={22} className="text-text-primary" />
          </button>
        </div>

        {/* ── Tap hint (before started) ── */}
        {!active && (
          <p className="text-text-tertiary" style={{
            position: 'absolute', bottom: 60,
            fontSize: 13, letterSpacing: '0.01em',
          }}>
            Tap to start
          </p>
        )}

      </div>
    </>
  )
}
