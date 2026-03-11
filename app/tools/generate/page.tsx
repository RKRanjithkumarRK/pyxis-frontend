'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Download, Loader2, RefreshCw, Play, Square, Image as ImageIcon, Music, Video, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type Tab = 'image' | 'audio' | 'video'

const IMAGE_MODELS = [
  { id: 'flux',         label: 'Flux (Best)' },
  { id: 'flux-realism', label: 'Flux Realism' },
  { id: 'flux-anime',   label: 'Anime' },
  { id: 'flux-3d',      label: '3D Render' },
  { id: 'turbo',        label: 'Fast' },
]

const ASPECT_RATIOS = [
  { label: '1:1',  w: 1024, h: 1024 },
  { label: '16:9', w: 1280, h: 720  },
  { label: '9:16', w: 720,  h: 1280 },
  { label: '4:3',  w: 1024, h: 768  },
  { label: '3:4',  w: 768,  h: 1024 },
]

const IMAGE_STYLES = [
  'Photorealistic', 'Digital Art', 'Oil Painting', 'Watercolor',
  'Cinematic', 'Minimal', 'Fantasy', 'Sci-Fi',
]

const VIDEO_EXAMPLES = [
  'a golden retriever running on a beach',
  'ocean waves crashing on rocks at sunset',
  'a candle flame flickering in the wind',
  'timelapse of clouds moving over mountains',
]

const POLL_INTERVAL_MS = 4000
const MAX_POLL_SECONDS  = 150

export default function GeneratePage() {
  const { getToken } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('image')

  /* ── Image state ── */
  const [imgPrompt,  setImgPrompt]  = useState('')
  const [imgModel,   setImgModel]   = useState('flux')
  const [imgRatio,   setImgRatio]   = useState(0)
  const [imgStyle,   setImgStyle]   = useState('')
  const [imgLoading, setImgLoading] = useState(false)
  const [imgUrl,     setImgUrl]     = useState('')
  const [imgError,   setImgError]   = useState('')

  /* ── Audio state ── */
  const [audioText,    setAudioText]    = useState('')
  const [audioVoice,   setAudioVoice]   = useState(0)
  const [audioRate,    setAudioRate]    = useState(1)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioVoices,  setAudioVoices]  = useState<SpeechSynthesisVoice[]>([])

  /* ── Video state ── */
  const [vidPrompt,          setVidPrompt]          = useState('')
  const [vidLoading,         setVidLoading]          = useState(false)
  const [vidUrl,             setVidUrl]              = useState('')
  const [vidError,           setVidError]            = useState('')
  const [vidElapsed,         setVidElapsed]          = useState(0)
  const [vidBalanceExhausted, setVidBalanceExhausted] = useState(false)

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tokenRef = useRef<string | null>(null)

  /* ── Cleanup on unmount ── */
  useEffect(() => () => { stopPolling() }, [])

  /* ── Elapsed timer ticks only while loading ── */
  useEffect(() => {
    if (!vidLoading) { setVidElapsed(0); clearInterval(timerRef.current!); return }
    timerRef.current = setInterval(() => setVidElapsed(s => s + 1), 1000)
    return () => clearInterval(timerRef.current!)
  }, [vidLoading])

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

  /* ───────────────────────── IMAGE ───────────────────────── */
  const generateImage = async () => {
    if (!imgPrompt.trim() || imgLoading) return
    setImgError(''); setImgLoading(true); setImgUrl('')
    try {
      const token = await getToken()
      const ratio = ASPECT_RATIOS[imgRatio]
      const fullPrompt = imgStyle ? `${imgStyle} style, ${imgPrompt.trim()}` : imgPrompt.trim()
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: fullPrompt, model: imgModel, width: ratio.w, height: ratio.h }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Generation failed')
      setImgUrl(data.url)
    } catch (e: any) {
      setImgError(e.message || 'Generation failed. Try a different prompt.')
    } finally {
      setImgLoading(false)
    }
  }

  const downloadImage = () => {
    if (!imgUrl) return
    const a = document.createElement('a'); a.href = imgUrl; a.download = 'pyxis-image.png'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  /* ───────────────────────── AUDIO ───────────────────────── */
  const playAudio = () => {
    if (!audioText.trim()) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(audioText)
    if (audioVoices[audioVoice]) utter.voice = audioVoices[audioVoice]
    utter.rate = audioRate; utter.pitch = 1; utter.volume = 1
    utter.onstart = () => setAudioPlaying(true)
    utter.onend   = () => setAudioPlaying(false)
    utter.onerror = () => setAudioPlaying(false)
    window.speechSynthesis.speak(utter)
  }

  const stopAudio = () => { window.speechSynthesis.cancel(); setAudioPlaying(false) }

  /* ───────────────────────── VIDEO ───────────────────────── */
  const stopPolling = () => {
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current  = null }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const generateVideo = async () => {
    if (!vidPrompt.trim() || vidLoading) return
    setVidError(''); setVidBalanceExhausted(false); setVidLoading(true); setVidUrl('')
    stopPolling()

    try {
      const token = await getToken()
      tokenRef.current = token

      /* Step 1 — submit job (returns instantly with jobId + provider) */
      const res = await fetch('/api/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: vidPrompt.trim() }),
      })
      const data = await res.json()

      if (!res.ok || !data.jobId) {
        if (data.balanceExhausted) {
          setVidBalanceExhausted(true)
          setVidError('fal.ai balance exhausted')
        } else {
          setVidError(data.error || 'Failed to start video generation')
        }
        setVidLoading(false)
        return
      }

      const { jobId, provider } = data
      const startedAt = Date.now()

      /* Step 2 — poll /api/video/status every 4 s */
      pollRef.current = setInterval(async () => {
        if ((Date.now() - startedAt) / 1000 > MAX_POLL_SECONDS) {
          stopPolling()
          setVidError('Video generation timed out. Please try again.')
          setVidLoading(false)
          return
        }

        try {
          const t = tokenRef.current
          const url = `/api/video/status?jobId=${encodeURIComponent(jobId)}&provider=${provider}`
          const statusRes = await fetch(url, { headers: t ? { Authorization: `Bearer ${t}` } : {} })
          const statusData = await statusRes.json()

          if (statusData.status === 'completed' && statusData.url) {
            stopPolling()
            setVidUrl(statusData.url)
            setVidLoading(false)
          } else if (statusData.status === 'failed') {
            stopPolling()
            setVidError(statusData.error || 'Video generation failed. Please try again.')
            setVidLoading(false)
          }
          // else 'processing' → keep polling
        } catch {
          // network hiccup — keep polling silently
        }
      }, POLL_INTERVAL_MS)
    } catch (e: any) {
      stopPolling()
      setVidError(e.message || 'Failed to start video generation.')
      setVidLoading(false)
    }
  }

  const downloadVideo = () => {
    if (!vidUrl) return
    const a = document.createElement('a'); a.href = vidUrl; a.download = 'pyxis-video.mp4'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: 'image', icon: ImageIcon, label: 'Image' },
    { id: 'audio', icon: Music,     label: 'Audio' },
    { id: 'video', icon: Video,     label: 'Video' },
  ]

  /* ── progress bar width — caps at 95% until done ── */
  const vidProgress = Math.min((vidElapsed / MAX_POLL_SECONDS) * 100, 95)

  const vidStatusLabel =
    vidElapsed < 10 ? 'Submitting to fal.ai…' :
    vidElapsed < 30 ? 'Model warming up…' :
    vidElapsed < 70 ? 'Generating frames…' :
    'Almost there…'

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">AI Studio</h1>
              <p className="text-sm text-text-secondary">Generate images, audio, and video with AI</p>
            </div>
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
                <Icon size={16} />{t.label}
              </button>
            )
          })}
        </div>

        {/* ── IMAGE ── */}
        {activeTab === 'image' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Prompt</label>
                <textarea
                  value={imgPrompt}
                  onChange={e => setImgPrompt(e.target.value)}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generateImage() }}
                  placeholder="Describe what you want to create… (Ctrl+Enter to generate)"
                  rows={4}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Model</label>
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_MODELS.map(m => (
                    <button key={m.id} onClick={() => setImgModel(m.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        imgModel === m.id ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary hover:border-accent/40'
                      }`}
                    >{m.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Aspect Ratio</label>
                <div className="flex gap-2">
                  {ASPECT_RATIOS.map((r, i) => (
                    <button key={r.label} onClick={() => setImgRatio(i)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                        imgRatio === i ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary hover:border-accent/40'
                      }`}
                    >{r.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Style <span className="text-text-tertiary font-normal normal-case">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {IMAGE_STYLES.map(s => (
                    <button key={s} onClick={() => setImgStyle(imgStyle === s ? '' : s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        imgStyle === s ? 'bg-accent text-white border-accent' : 'bg-surface border-border text-text-secondary hover:border-accent/40'
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <button
                onClick={generateImage}
                disabled={!imgPrompt.trim() || imgLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {imgLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {imgLoading ? 'Generating…' : 'Generate Image'}
              </button>
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-3">
              <div className={`w-full rounded-2xl border border-border overflow-hidden flex items-center justify-center bg-surface ${
                ASPECT_RATIOS[imgRatio].h > ASPECT_RATIOS[imgRatio].w ? 'aspect-[9/16]' : 'aspect-square'
              }`}>
                {imgLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center animate-pulse">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <p className="text-text-tertiary text-sm">Generating your image…</p>
                  </div>
                ) : imgError ? (
                  <div className="flex flex-col items-center gap-2 px-6 text-center">
                    <AlertCircle size={24} className="text-red-400 opacity-70" />
                    <p className="text-red-400 text-sm">{imgError}</p>
                    <button onClick={generateImage} className="text-xs text-accent hover:underline mt-1">Try again</button>
                  </div>
                ) : imgUrl ? (
                  <img src={imgUrl} alt="Generated" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center px-6">
                    <ImageIcon size={32} className="text-text-tertiary opacity-30" />
                    <p className="text-text-tertiary text-sm">Your image will appear here</p>
                    <p className="text-text-tertiary text-xs">Powered by Flux AI · free, no API key needed</p>
                  </div>
                )}
              </div>
              {imgUrl && !imgLoading && (
                <div className="flex gap-2">
                  <button onClick={generateImage} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface border border-border text-text-secondary hover:bg-surface-hover text-sm transition-colors">
                    <RefreshCw size={14} />Regenerate
                  </button>
                  <button onClick={downloadImage} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 text-sm transition-colors">
                    <Download size={14} />Download
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AUDIO ── */}
        {activeTab === 'audio' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Text to Speak</label>
              <textarea
                value={audioText}
                onChange={e => setAudioText(e.target.value)}
                placeholder="Enter the text you want to convert to speech…"
                rows={6}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none focus:border-accent transition-colors"
              />
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
                <input type="range" min="0.5" max="2" step="0.1" value={audioRate}
                  onChange={e => setAudioRate(Number(e.target.value))} className="w-full accent-accent mt-2" />
              </div>
            </div>
            <div className="flex gap-3">
              {audioPlaying ? (
                <button onClick={stopAudio} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors">
                  <Square size={16} />Stop
                </button>
              ) : (
                <button onClick={playAudio} disabled={!audioText.trim()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-lg">
                  <Play size={16} />Play Audio
                </button>
              )}
            </div>
            <p className="text-xs text-text-tertiary leading-relaxed">
              Audio uses your browser&apos;s built-in Text-to-Speech engine. Chrome on Desktop offers the best quality voices.
            </p>
          </div>
        )}

        {/* ── VIDEO ── */}
        {activeTab === 'video' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Prompt</label>
                  <span className={`text-xs ${vidPrompt.length > 130 ? 'text-amber-400' : 'text-text-tertiary'}`}>
                    {vidPrompt.length}/150
                  </span>
                </div>
                <textarea
                  value={vidPrompt}
                  onChange={e => setVidPrompt(e.target.value.slice(0, 150))}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generateVideo() }}
                  placeholder="Describe the video… e.g. 'ocean waves crashing at sunset'"
                  rows={4}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none focus:border-accent transition-colors"
                />
                {/* Example prompts */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {VIDEO_EXAMPLES.map(ex => (
                    <button
                      key={ex}
                      onClick={() => setVidPrompt(ex)}
                      className="text-[10px] px-2 py-1 rounded-full bg-surface border border-border text-text-tertiary hover:text-text-primary hover:border-accent/40 transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateVideo}
                disabled={!vidPrompt.trim() || vidLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {vidLoading ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
                {vidLoading ? `Generating… ${vidElapsed}s` : 'Generate Video'}
              </button>
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-3">
              <div className="w-full aspect-video rounded-2xl border border-border overflow-hidden flex items-center justify-center bg-surface">
                {vidLoading ? (
                  <div className="flex flex-col items-center gap-3 px-6 text-center w-full">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center animate-pulse">
                      <Video size={20} className="text-white" />
                    </div>
                    <p className="text-text-secondary text-sm font-medium">{vidStatusLabel}</p>
                    <p className="text-text-tertiary text-xs">{vidElapsed}s elapsed</p>
                    <div className="w-full max-w-xs bg-surface-hover rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-1000"
                        style={{ width: `${vidProgress}%` }}
                      />
                    </div>
                  </div>
                ) : vidError ? (
                  <div className="flex flex-col items-center gap-3 px-6 text-center">
                    <AlertCircle size={24} className={vidBalanceExhausted ? 'text-amber-400 opacity-80' : 'text-red-400 opacity-70'} />
                    {vidBalanceExhausted ? (
                      <>
                        <p className="text-amber-400 text-sm font-medium">fal.ai balance exhausted</p>
                        <p className="text-text-tertiary text-xs leading-relaxed max-w-[220px]">
                          Your fal.ai account has run out of credits.
                        </p>
                        <a
                          href="https://fal.ai/dashboard/billing"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
                        >
                          Top up at fal.ai →
                        </a>
                      </>
                    ) : (
                      <>
                        <p className="text-red-400 text-sm">{vidError}</p>
                        <button onClick={generateVideo} className="text-xs text-accent hover:underline">Try again</button>
                      </>
                    )}
                  </div>
                ) : vidUrl ? (
                  <video src={vidUrl} controls autoPlay loop className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center px-6">
                    <Video size={32} className="text-text-tertiary opacity-30" />
                    <p className="text-text-tertiary text-sm">Your video will appear here</p>
                    <p className="text-text-tertiary text-xs">Powered by fal.ai · takes 30–90 seconds</p>
                  </div>
                )}
              </div>

              {vidUrl && !vidLoading && (
                <div className="flex gap-2">
                  <button onClick={generateVideo} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface border border-border text-text-secondary hover:bg-surface-hover text-sm transition-colors">
                    <RefreshCw size={14} />Regenerate
                  </button>
                  <button onClick={downloadVideo} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 text-sm transition-colors">
                    <Download size={14} />Download
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
