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
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

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

    setState('permission')

    try {
      await setupAnalyser()
      setState('connecting')

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => setState('listening')

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
        // Don't reset state if we're speaking
        if (state !== 'speaking') {
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
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1

    // Try to use a natural voice
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0]
    if (preferred) utterance.voice = preferred

    utterance.onend = () => setState('idle')
    utterance.onerror = () => setState('idle')

    synthRef.current = utterance
    window.speechSynthesis.speak(utterance)
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
