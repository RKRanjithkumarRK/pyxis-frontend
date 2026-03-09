'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { VoiceState } from '@/types'

interface UseVoiceReturn {
  state: VoiceState
  transcript: string
  isSupported: boolean
  start: () => void
  stop: () => void
  speak: (text: string) => void
  stopSpeaking: () => void
  analyserNode: AnalyserNode | null
}

export function useVoice(): UseVoiceReturn {
  const [state, setState_] = useState<VoiceState>('idle')
  const setState = (s: VoiceState) => { stateRef.current = s; setState_(s) }
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stateRef = useRef<VoiceState>('idle')

  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const setupAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
    } catch {}
  }, [])

  const start = useCallback(async () => {
    if (!isSupported) return

    setState('connecting')

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setState('listening')
        // Set up audio analyser after mic is confirmed granted — non-blocking
        setupAnalyser()
      }

      recognition.onresult = (event: any) => {
        let text = ''
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript
        }
        setTranscript(text)
      }

      recognition.onerror = () => {
        setState('idle')
        cleanup()
      }

      recognition.onend = () => {
        // Don't reset state if we're speaking (use ref to avoid stale closure)
        if (stateRef.current !== 'speaking') {
          setState('idle')
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch {
      setState('idle')
    }
  }, [isSupported, setupAnalyser])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    cleanup()
    setState('idle')
  }, [])

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    analyserRef.current = null
  }, [])

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setState('speaking')

    // Chrome Bug Fix: delay 120ms after cancel() before speak() or onend never fires
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1
      utterance.pitch = 1

      const voices = window.speechSynthesis.getVoices()
      const preferred =
        voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.name.includes('Google') && v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices[0]
      if (preferred) utterance.voice = preferred

      let called = false
      let ttsStarted = false

      const done = () => {
        if (called) return
        called = true
        clearInterval(pollId)
        clearInterval(keepAliveId)
        clearTimeout(fallbackId)
        setState('idle')
      }

      utterance.onstart = () => { ttsStarted = true }
      utterance.onend = done
      utterance.onerror = done

      window.speechSynthesis.speak(utterance)
      synthRef.current = utterance

      // Polling fallback: only after TTS actually started (prevents premature firing)
      const pollId = setInterval(() => {
        if (ttsStarted && !window.speechSynthesis.speaking) done()
      }, 300)

      // Keep-alive: Chrome pauses synthesis after ~15s
      const keepAliveId = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        }
      }, 12000)

      // Absolute fallback timer
      const fallbackId = setTimeout(done, Math.max(text.length * 100, 5000))
    }, 120)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setState('idle')
  }, [])

  useEffect(() => {
    return () => {
      stop()
      stopSpeaking()
    }
  }, [])

  return {
    state,
    transcript,
    isSupported,
    start,
    stop,
    speak,
    stopSpeaking,
    analyserNode: analyserRef.current,
  }
}
