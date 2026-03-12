'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, Download, Loader2, RefreshCw, Play, Square, Music, Video, Mic2, Volume2, CheckCircle2, Film, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

type Tab = 'audio' | 'video'

// Route through our API proxy to avoid CORS/ORB blocking in Chrome
// idx staggers server-side requests to prevent rate-limit (429) from Pollinations
const POLLINATIONS_URL = (prompt: string, seed: number, idx: number) =>
  `/api/frame?prompt=${encodeURIComponent(prompt)}&seed=${seed}&idx=${idx}`

const FRAME_SUFFIXES = [
  'cinematic wide shot, golden hour lighting',
  'medium shot, dramatic composition',
  'close up detail, vivid colors',
  'overhead aerial view, epic scale',
  'low angle shot, atmospheric fog',
]

const VIDEO_EXAMPLES = [
  'ocean waves crashing at sunset',
  'a golden retriever running on a beach',
  'timelapse of clouds over mountains',
  'cherry blossoms falling in the wind',
  'campfire burning at night in forest',
  'city skyline at dusk with lights',
]

const TOTAL_FRAMES = 5
const FRAME_DISPLAY_MS = 1200  // how long each frame shows

export default function GeneratePage() {
  const [activeTab, setActiveTab]     = useState<Tab>('video')

  /* ── Audio ── */
  const [audioText,    setAudioText]    = useState('')
  const [audioVoice,   setAudioVoice]   = useState(0)
  const [audioRate,    setAudioRate]    = useState(1)
  const [audioPitch,   setAudioPitch]   = useState(1)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioVoices,  setAudioVoices]  = useState<SpeechSynthesisVoice[]>([])

  /* ── Video ── */
  const [vidPrompt,    setVidPrompt]    = useState('')
  const [vidLoading,   setVidLoading]   = useState(false)
  const [vidFrames,    setVidFrames]    = useState<string[]>([])
  const [vidError,     setVidError]     = useState('')
  const [frameLoaded,  setFrameLoaded]  = useState(0)    // how many frames loaded so far
  const [activeFrame,  setActiveFrame]  = useState(0)    // which frame is shown
  const [recording,    setRecording]    = useState(false)
  const [videoBlob,    setVideoBlob]    = useState<string>('')

  const animTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const imgRefs       = useRef<HTMLImageElement[]>([])

  /* ── Load TTS voices ── */
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'))
      if (v.length) setAudioVoices(v)
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  /* ── Animate frames when ready ── */
  useEffect(() => {
    if (vidFrames.length === 0) return
    clearInterval(animTimerRef.current!)
    setActiveFrame(0)
    animTimerRef.current = setInterval(() => {
      setActiveFrame(prev => (prev + 1) % vidFrames.length)
    }, FRAME_DISPLAY_MS)
    return () => clearInterval(animTimerRef.current!)
  }, [vidFrames])

  /* ── Cleanup ── */
  useEffect(() => () => {
    clearInterval(animTimerRef.current!)
    if (videoBlob) URL.revokeObjectURL(videoBlob)
  }, [videoBlob])

  /* ───────────── AUDIO ───────────── */
  const playAudio = () => {
    if (!audioText.trim()) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(audioText)
    if (audioVoices[audioVoice]) utter.voice = audioVoices[audioVoice]
    utter.rate = audioRate; utter.pitch = audioPitch; utter.volume = 1
    utter.onstart = () => setAudioPlaying(true)
    utter.onend   = () => setAudioPlaying(false)
    utter.onerror = () => setAudioPlaying(false)
    window.speechSynthesis.speak(utter)
  }
  const stopAudio = () => { window.speechSynthesis.cancel(); setAudioPlaying(false) }

  /* ───────────── VIDEO ───────────── */
  const generateVideo = useCallback(() => {
    if (!vidPrompt.trim() || vidLoading) return
    setVidLoading(true)
    setVidError('')
    setVidFrames([])
    setFrameLoaded(0)
    setActiveFrame(0)
    setVideoBlob('')
    clearInterval(animTimerRef.current!)
    imgRefs.current = []

    const seed = Date.now()
    // Build all 5 frame URLs — proxy handles staggering to avoid Pollinations rate limits
    const urls = FRAME_SUFFIXES.map((suffix, i) =>
      POLLINATIONS_URL(`${vidPrompt.trim()}, ${suffix}`, seed + i * 1337, i)
    )
    setVidFrames(urls)
    // Loading state resolves once first frame img fires onLoad (handled inline in JSX)
  }, [vidPrompt, vidLoading])

  /* ── Record canvas as WebM ── */
  const recordVideo = useCallback(async () => {
    if (vidFrames.length === 0 || recording) return
    const canvas = canvasRef.current
    if (!canvas || typeof MediaRecorder === 'undefined') {
      toast.error('Recording not supported in this browser. Try Chrome.')
      return
    }
    if (!MediaRecorder.isTypeSupported('video/webm')) {
      toast.error('WebM not supported. Try Chrome or Firefox.')
      return
    }

    setRecording(true)
    toast('Recording video…', { icon: '🔴' })
    canvas.width = 512; canvas.height = 288
    const ctx = canvas.getContext('2d')!

    const stream   = canvas.captureStream(24)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 4_000_000 })
    const chunks: Blob[] = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

    await new Promise<void>(resolve => {
      recorder.onstop = () => resolve()
      recorder.start(100)

      let idx = 0
      // Play through each frame twice for a longer video
      const totalPasses = 2
      const totalSteps  = TOTAL_FRAMES * totalPasses

      const drawNext = () => {
        const frameIdx = idx % TOTAL_FRAMES
        const img = imgRefs.current[frameIdx]
        if (img) ctx.drawImage(img, 0, 0, 512, 288)
        idx++
        if (idx >= totalSteps) {
          recorder.stop()
        } else {
          setTimeout(drawNext, FRAME_DISPLAY_MS)
        }
      }
      drawNext()
    })

    const blob = new Blob(chunks, { type: 'video/webm' })
    const url  = URL.createObjectURL(blob)
    setVideoBlob(url)
    setRecording(false)

    // Trigger download
    const a = document.createElement('a')
    a.href = url; a.download = 'pyxis-video.webm'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    toast.success('Video downloaded!')
  }, [vidFrames, recording])

  /* ── Download a single frame ── */
  const downloadFrame = (url: string, idx: number) => {
    const a = document.createElement('a')
    a.href = url; a.download = `pyxis-frame-${idx + 1}.jpg`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    toast.success(`Frame ${idx + 1} downloaded`)
  }

  const progressPct = vidLoading ? Math.round((frameLoaded / TOTAL_FRAMES) * 100) : 100

  const tabs: { id: Tab; icon: React.ElementType; label: string; badge?: string }[] = [
    { id: 'audio', icon: Music, label: 'Audio TTS' },
    { id: 'video', icon: Video, label: 'AI Video', badge: 'Free' },
  ]

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">AI Video & Audio</h1>
            <p className="text-sm text-text-secondary">Generate videos with AI · Convert text to speech</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-8 w-fit">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.id ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                <Icon size={16} />
                {t.label}
                {t.badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-green-500/20 text-green-400">{t.badge}</span>}
              </button>
            )
          })}
        </div>

        {/* ── AUDIO ── */}
        {activeTab === 'audio' && (
          <div className="max-w-2xl space-y-5">
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <Mic2 size={15} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-text-secondary leading-relaxed">
                Uses your browser&apos;s built-in Text-to-Speech — <strong className="text-text-primary">100% free, works offline.</strong> Chrome Desktop has the best voices.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Text to Speak</label>
              <textarea
                value={audioText}
                onChange={e => setAudioText(e.target.value)}
                placeholder="Enter any text you want to convert to speech…"
                rows={7}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none focus:border-accent transition-colors"
              />
              <p className="text-[11px] text-text-tertiary mt-1">{audioText.length} characters</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Voice</label>
                <select value={audioVoice} onChange={e => setAudioVoice(Number(e.target.value))}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent">
                  {audioVoices.length > 0 ? audioVoices.map((v, i) => (
                    <option key={i} value={i}>{v.name}</option>
                  )) : <option>Loading voices…</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Speed: {audioRate}x</label>
                <input type="range" min="0.5" max="2" step="0.1" value={audioRate} onChange={e => setAudioRate(Number(e.target.value))} className="w-full accent-accent mt-3" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Pitch: {audioPitch.toFixed(1)}</label>
              <input type="range" min="0.5" max="2" step="0.1" value={audioPitch} onChange={e => setAudioPitch(Number(e.target.value))} className="w-full accent-accent" />
            </div>
            <div className="flex gap-3">
              {audioPlaying ? (
                <button onClick={stopAudio} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors">
                  <Square size={16} />Stop
                </button>
              ) : (
                <button onClick={playAudio} disabled={!audioText.trim()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-lg">
                  <Volume2 size={16} />Play Audio
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── VIDEO ── */}
        {activeTab === 'video' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Controls */}
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-green-500/5 border border-green-500/20">
                <CheckCircle2 size={14} className="text-green-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  <strong className="text-green-400">Free forever via Pollinations AI</strong> — generates 5 cinematic frames that animate into a video. No credits, no API key, no sign-up.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Prompt</label>
                  <span className={`text-xs ${vidPrompt.length > 130 ? 'text-amber-400' : 'text-text-tertiary'}`}>{vidPrompt.length}/150</span>
                </div>
                <textarea
                  value={vidPrompt}
                  onChange={e => setVidPrompt(e.target.value.slice(0, 150))}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generateVideo() }}
                  placeholder="Describe the scene… e.g. 'ocean waves crashing at sunset'"
                  rows={4}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none focus:border-accent transition-colors"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {VIDEO_EXAMPLES.map(ex => (
                    <button key={ex} onClick={() => setVidPrompt(ex)}
                      className="text-[10px] px-2 py-1 rounded-full bg-surface border border-border text-text-tertiary hover:text-text-primary hover:border-accent/40 transition-all">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateVideo}
                disabled={!vidPrompt.trim() || vidLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {vidLoading ? <><Loader2 size={16} className="animate-spin" /> Generating frames…</> : <><Film size={16} /> Generate Video (Free)</>}
              </button>

              {/* Frame strip */}
              {vidFrames.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold mb-2">Frames — click to download</p>
                  <div className="grid grid-cols-5 gap-1">
                    {vidFrames.map((url, i) => (
                      <button key={i} onClick={() => downloadFrame(url, i)}
                        className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${activeFrame === i ? 'border-accent' : 'border-border hover:border-accent/50'}`}>
                        <img
                          src={url}
                          alt={`Frame ${i + 1}`}
                          className="w-full h-full object-cover"
                          onLoad={() => {
                            setFrameLoaded(prev => {
                              const next = prev + 1
                              if (i === 0) {
                                setVidLoading(false)
                                toast.success('Video generated! 🎬')
                              }
                              return next
                            })
                          }}
                          onError={() => {
                            if (i === 0) {
                              setVidError('Failed to load frames. Please try again.')
                              setVidLoading(false)
                              setVidFrames([])
                            }
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Preview */}
            <div className="flex flex-col gap-3">
              <div className="relative w-full aspect-video rounded-2xl border border-border overflow-hidden bg-surface flex items-center justify-center">
                {vidLoading ? (
                  <div className="flex flex-col items-center gap-3 px-6 text-center w-full">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center animate-pulse">
                      <ImageIcon size={20} className="text-white" />
                    </div>
                    <p className="text-text-secondary text-sm font-medium">Generating AI frames…</p>
                    <p className="text-text-tertiary text-xs">Fetching 5 cinematic shots via Pollinations AI</p>
                    <div className="w-full max-w-xs bg-surface-hover rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-violet-500 to-pink-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                    <p className="text-text-tertiary text-[10px]">Free · No API key · No credits needed</p>
                  </div>
                ) : vidError ? (
                  <div className="flex flex-col items-center gap-3 px-6 text-center">
                    <p className="text-red-400 text-sm">{vidError}</p>
                    <button onClick={generateVideo} className="px-4 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors">
                      Try Again
                    </button>
                  </div>
                ) : vidFrames.length > 0 ? (
                  <>
                    {vidFrames.map((url, i) => (
                      <img
                        key={url}
                        src={url}
                        alt={`Frame ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                        style={{ opacity: activeFrame === i ? 1 : 0 }}
                      />
                    ))}
                    {/* Frame counter overlay */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white font-medium">
                      {activeFrame + 1}/{vidFrames.length}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center px-6">
                    <Video size={32} className="text-text-tertiary opacity-30" />
                    <p className="text-text-tertiary text-sm">Your video will appear here</p>
                    <p className="text-text-tertiary text-xs">Powered by Pollinations AI · Free forever</p>
                  </div>
                )}
              </div>

              {/* Hidden canvas for recording */}
              <canvas ref={canvasRef} className="hidden" />

              {vidFrames.length > 0 && !vidLoading && (
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={generateVideo}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface border border-border text-text-secondary hover:bg-surface-hover text-xs transition-colors">
                    <RefreshCw size={13} />Regenerate
                  </button>
                  <button onClick={recordVideo} disabled={recording}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:bg-violet-500/20 text-xs transition-colors disabled:opacity-50">
                    {recording ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
                    {recording ? 'Recording…' : 'Save as Video'}
                  </button>
                  <button onClick={() => downloadFrame(vidFrames[activeFrame], activeFrame)}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs transition-colors">
                    <Download size={13} />Save Frame
                  </button>
                </div>
              )}

              {vidFrames.length > 0 && (
                <p className="text-[10px] text-text-tertiary text-center leading-relaxed">
                  "Save as Video" records the animation as a WebM file (Chrome/Firefox). "Save Frame" downloads the current image.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
