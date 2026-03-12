'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Sparkles, Video, Music, RefreshCw, Download,
  Mic2, Volume2, X, Film, Upload, ImageIcon, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ─── types ─────────────────────────────────────────────────────── */
type Tab = 'txt2vid' | 'img2vid' | 'audio'

/* ─── Gradio Space definitions (free, no account) ──────────────── */
interface SpaceDef {
  name: string
  url: string
  fnIndex: number
  inputs: (prompt: string) => unknown[]
}

/**
 * HuggingFace Gradio Spaces for text-to-video.
 * These are publicly accessible, no API key needed.
 * Tried in order — first success wins.
 */
const T2V_SPACES: SpaceDef[] = [
  {
    name: 'CogVideoX-5B',
    url: 'https://thudm-cogvideox-5b.hf.space',
    fnIndex: 0,
    inputs: (p) => [p, 42, 49, 8, 6.0, 50],
  },
  {
    name: 'CogVideoX-2B',
    url: 'https://thudm-cogvideox-2b.hf.space',
    fnIndex: 0,
    inputs: (p) => [p, 42, 49, 8, 6.0, 50],
  },
  {
    name: 'ZeroScope V2',
    url: 'https://hysts-zeroscope-v2.hf.space',
    fnIndex: 0,
    inputs: (p) => [p, '', 0, 576, 320, 24, 7.5, 50, 1],
  },
  {
    name: 'AnimateDiff',
    url: 'https://guoyww-animatediff.hf.space',
    fnIndex: 0,
    inputs: (p) => [p, '', 7.5, 1, 16, 8],
  },
]

/** Stable Video Diffusion space for image → video */
const I2V_SPACES: SpaceDef[] = [
  {
    name: 'Stable Video Diffusion',
    url: 'https://stabilityai-stable-video-diffusion.hf.space',
    fnIndex: 0,
    inputs: (imgB64) => [imgB64, 25, 4.0, 127, 1],
  },
  {
    name: 'SVD-XT',
    url: 'https://multimodalart-stable-video-diffusion.hf.space',
    fnIndex: 0,
    inputs: (imgB64) => [imgB64, 25, 4.0, 127],
  },
]

/* ─── helpers ────────────────────────────────────────────────────── */
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/** Try a Gradio space via SSE queue protocol */
function tryGradioSpace(
  space: SpaceDef,
  inputs: unknown[],
  onStatus: (s: string) => void,
  onPct: (n: number) => void,
  cancelRef: { current: boolean },
): Promise<Blob> {
  const sessionHash = Math.random().toString(36).slice(2, 12)

  return new Promise(async (resolve, reject) => {
    /* 1. Join the queue */
    let joinOk = false
    try {
      const jr = await fetch(`${space.url}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: inputs,
          fn_index: space.fnIndex,
          session_hash: sessionHash,
          event_data: null,
        }),
        signal: AbortSignal.timeout(20_000),
      })
      joinOk = jr.ok
      if (!jr.ok) {
        const txt = await jr.text().catch(() => '')
        reject(new Error(`Join ${jr.status}: ${txt.slice(0, 100)}`))
        return
      }
    } catch (e: any) {
      reject(new Error(`Network: ${e.message}`))
      return
    }

    if (cancelRef.current) { reject(new Error('Cancelled')); return }

    /* 2. Stream events */
    const es = new EventSource(`${space.url}/queue/data?session_hash=${sessionHash}`)
    let done = false

    const fail = (msg: string) => {
      if (done) return; done = true
      es.close(); clearTimeout(timeout)
      reject(new Error(msg))
    }
    const succeed = (blob: Blob) => {
      if (done) return; done = true
      es.close(); clearTimeout(timeout)
      resolve(blob)
    }

    const timeout = setTimeout(() => fail('Timeout (8 min)'), 8 * 60 * 1000)

    es.addEventListener('message', async (evt) => {
      if (done) return
      if (cancelRef.current) { fail('Cancelled'); return }

      let msg: any
      try { msg = JSON.parse(evt.data) } catch { return }

      switch (msg.msg) {
        case 'queue_full':
          fail('Queue full'); break

        case 'estimation': {
          const eta = Math.ceil((msg.rank_eta ?? 60) as number)
          onStatus(`Queue: position ${msg.rank ?? '?'} · ~${eta}s wait`)
          onPct(3)
          break
        }
        case 'process_starts':
          onStatus(`${space.name} is generating your video…`)
          onPct(8)
          break

        case 'process_generating': {
          const pd = msg.progress_data?.[0]
          if (pd?.length) {
            const p = Math.round((pd.index / pd.length) * 80) + 10
            onPct(p)
            onStatus(`Generating frame ${pd.index} / ${pd.length}…`)
          } else {
            onStatus('Generating video frames…')
            onPct(50)
          }
          break
        }
        case 'process_completed': {
          if (!msg.success || msg.output?.error) {
            fail(String(msg.output?.error ?? 'Generation failed'))
            return
          }
          onStatus('Downloading video…')
          onPct(95)

          // Extract video URL — Gradio returns several possible shapes
          const out = msg.output?.data?.[0]
          let videoUrl: string | null = null

          if (typeof out === 'string') {
            videoUrl = out.startsWith('http') ? out : `${space.url}${out}`
          } else if (out?.url) {
            const u = String(out.url)
            videoUrl = u.startsWith('http') ? u : `${space.url}${u}`
          } else if (out?.name || out?.path) {
            const p = String(out.name ?? out.path)
            videoUrl = p.startsWith('http') ? p : `${space.url}/file=${p}`
          } else if (out?.value?.url) {
            const u = String(out.value.url)
            videoUrl = u.startsWith('http') ? u : `${space.url}${u}`
          }

          if (!videoUrl) {
            fail(`No video URL in response: ${JSON.stringify(out).slice(0, 200)}`)
            return
          }

          fetch(videoUrl)
            .then(r => r.ok ? r.blob() : Promise.reject(new Error(`Download ${r.status}`)))
            .then(b => b.size > 500 ? succeed(b) : fail('Empty video blob'))
            .catch(e => fail(e.message))
          break
        }
      }
    })

    es.onerror = () => { if (!done) fail('SSE connection lost') }
  })
}

/** Try spaces list in order, return first working result */
async function generateWithSpaces(
  spaces: SpaceDef[],
  inputs: (space: SpaceDef) => unknown[],
  onStatus: (s: string) => void,
  onPct: (n: number) => void,
  cancelRef: { current: boolean },
): Promise<Blob> {
  let lastErr = ''
  for (let i = 0; i < spaces.length; i++) {
    const space = spaces[i]
    if (cancelRef.current) throw new Error('Cancelled')
    try {
      onStatus(`Connecting to ${space.name}…`)
      onPct(1)
      const blob = await tryGradioSpace(space, inputs(space), onStatus, onPct, cancelRef)
      if (blob.size > 500) return blob
      throw new Error('Empty video')
    } catch (e: any) {
      if (e.message === 'Cancelled' || cancelRef.current) throw new Error('Cancelled')
      lastErr = e.message
      console.warn(`[${space.name}] failed: ${lastErr}`)
      if (i < spaces.length - 1) {
        onStatus(`${space.name} unavailable — trying ${spaces[i + 1].name}…`)
        await sleep(1500)
      }
    }
  }
  throw new Error(`All AI servers busy. Last error: ${lastErr}`)
}

/** Convert File to base64 data URL */
function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target!.result as string)
    r.onerror = () => rej(new Error('File read error'))
    r.readAsDataURL(file)
  })
}

/* ─── history ────────────────────────────────────────────────────── */
interface HistItem { id: string; url: string; label: string }

/* ══════════════════════════════════════════════════════════════════ */
export default function GeneratePage() {
  const [tab, setTab] = useState<Tab>('txt2vid')

  /* txt2vid */
  const [txtPrompt, setTxtPrompt] = useState('')

  /* img2vid */
  const [imgFile,    setImgFile]    = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string>('')
  const [imgPrompt,  setImgPrompt]  = useState('')

  /* generation */
  const [generating, setGenerating] = useState(false)
  const [pct,        setPct]        = useState(0)
  const [status,     setStatus]     = useState('')
  const [videoUrl,   setVideoUrl]   = useState('')
  const [videoType,  setVideoType]  = useState('')
  const [vidError,   setVidError]   = useState('')
  const [history,    setHistory]    = useState<HistItem[]>([])

  /* audio */
  const [audioText,    setAudioText]    = useState('')
  const [audioVoice,   setAudioVoice]   = useState(0)
  const [audioRate,    setAudioRate]    = useState(1)
  const [audioPitch,   setAudioPitch]   = useState(1)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioVoices,  setAudioVoices]  = useState<SpeechSynthesisVoice[]>([])

  const cancelRef = useRef(false)
  const genRef    = useRef(false)
  const blobUrls  = useRef<string[]>([])

  /* TTS voices */
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'))
      if (v.length) setAudioVoices(v)
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  /* cleanup blob URLs */
  useEffect(() => () => { blobUrls.current.forEach(u => URL.revokeObjectURL(u)) }, [])

  /* image upload */
  const handleImgFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return }
    if (imgPreview) URL.revokeObjectURL(imgPreview)
    setImgFile(file)
    setImgPreview(URL.createObjectURL(file))
  }, [imgPreview])

  /* cancel */
  const cancelGen = useCallback(() => {
    cancelRef.current = true
    genRef.current    = false
    setGenerating(false)
    setPct(0)
    setStatus('')
  }, [])

  /* ── GENERATE ─────────────────────────────────────────────────── */
  const generate = useCallback(async () => {
    if (genRef.current) return
    const isImg = tab === 'img2vid'
    if (isImg && !imgFile) { toast.error('Please upload an image first'); return }
    if (!isImg && !txtPrompt.trim()) { toast.error('Please enter a prompt'); return }

    cancelRef.current = false
    genRef.current    = true
    setGenerating(true)
    setPct(0)
    setStatus('')
    setVidError('')
    setVideoUrl('')
    setVideoType('')

    try {
      let blob: Blob

      if (isImg) {
        /* ── Image → Video via Stable Video Diffusion space ── */
        setStatus('Reading image…')
        setPct(2)
        const imgB64 = await fileToBase64(imgFile!)
        if (cancelRef.current) return

        blob = await generateWithSpaces(
          I2V_SPACES,
          (space) => space.inputs(imgB64),
          (s) => { if (!cancelRef.current) setStatus(s) },
          (p) => { if (!cancelRef.current) setPct(p) },
          cancelRef,
        )
        setVideoType('Image to Video')
      } else {
        /* ── Text → Video via CogVideoX / ZeroScope space ── */
        blob = await generateWithSpaces(
          T2V_SPACES,
          (space) => space.inputs(txtPrompt.trim()),
          (s) => { if (!cancelRef.current) setStatus(s) },
          (p) => { if (!cancelRef.current) setPct(p) },
          cancelRef,
        )
        setVideoType('Text to Video')
      }

      if (cancelRef.current) return

      const url = URL.createObjectURL(blob)
      blobUrls.current.push(url)
      setVideoUrl(url)
      setPct(100)
      setStatus('')

      const label = isImg
        ? (imgFile?.name?.replace(/\.[^.]+$/, '') ?? 'Uploaded image')
        : txtPrompt.trim().slice(0, 40)
      setHistory(h => [{ id: Date.now().toString(), url, label }, ...h].slice(0, 8))
      toast.success('AI video ready! 🎬')

    } catch (err: any) {
      if (!cancelRef.current) {
        setVidError(err.message ?? 'Generation failed. Please try again.')
      }
    } finally {
      genRef.current = false
      if (!cancelRef.current) {
        setGenerating(false)
      }
    }
  }, [tab, imgFile, imgPrompt, txtPrompt])

  /* download */
  const download = useCallback(() => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `pyxis-ai-video-${Date.now()}.mp4`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    toast.success('Video downloaded!')
  }, [videoUrl])

  /* audio */
  const playAudio = () => {
    if (!audioText.trim()) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(audioText)
    if (audioVoices[audioVoice]) u.voice = audioVoices[audioVoice]
    u.rate = audioRate; u.pitch = audioPitch; u.volume = 1
    u.onstart = () => setAudioPlaying(true)
    u.onend   = () => setAudioPlaying(false)
    u.onerror = () => setAudioPlaying(false)
    window.speechSynthesis.speak(u)
  }
  const stopAudio = () => { window.speechSynthesis.cancel(); setAudioPlaying(false) }

  const EXAMPLES = [
    'ocean waves crashing at sunset',
    'golden retriever running on a beach',
    'cherry blossoms falling in the wind',
    'campfire burning at night in forest',
    'timelapse clouds over mountains',
    'city skyline at dusk with lights',
  ]

  const canGenerate = tab === 'img2vid' ? !!imgFile : tab === 'txt2vid' ? !!txtPrompt.trim() : false

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Header */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-text-primary">AI Video Studio</h1>
          <p className="text-[11px] text-text-secondary">Real AI video generation — free, no account needed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-4 flex shrink-0">
        {([
          { id: 'txt2vid' as Tab, label: 'Text to Video', Icon: Film      },
          { id: 'img2vid' as Tab, label: 'Image to Video', Icon: ImageIcon },
          { id: 'audio'   as Tab, label: 'Audio TTS',     Icon: Music     },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ══ VIDEO TABS ══ */}
      {(tab === 'txt2vid' || tab === 'img2vid') && (
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 112px)' }}>

          {/* Left: Controls */}
          <div className="w-[360px] shrink-0 border-r border-border overflow-y-auto p-5 space-y-5">

            {/* AI model info */}
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <Sparkles size={13} className="text-violet-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {tab === 'txt2vid'
                  ? <><strong className="text-violet-400">Real AI motion video</strong> via CogVideoX · ZeroScope · AnimateDiff — actual frames generated by AI, not animated images.</>
                  : <><strong className="text-violet-400">AI Image-to-Video</strong> via Stable Video Diffusion — AI predicts realistic motion from your image.</>
                }
                {' '}<span className="text-text-tertiary">May take 1–5 min (free GPU queue).</span>
              </p>
            </div>

            {/* Image upload (img2vid only) */}
            {tab === 'img2vid' && (
              <div>
                <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block mb-2">
                  Reference Image
                </label>
                <div
                  className={`relative rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors ${
                    imgPreview ? 'border-accent/50' : 'border-border hover:border-accent/40'
                  }`}
                  style={{ aspectRatio: '16/9' }}
                  onClick={() => { if (!imgFile) document.getElementById('img-upload')?.click() }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImgFile(f) }}
                >
                  {imgPreview ? (
                    <>
                      <img src={imgPreview} alt="preview" className="w-full h-full object-cover" />
                      <button
                        onClick={e => { e.stopPropagation(); setImgFile(null); URL.revokeObjectURL(imgPreview); setImgPreview('') }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                      >
                        <X size={11} />
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-tertiary select-none">
                      <Upload size={22} />
                      <p className="text-sm font-medium">Upload / Drop Image</p>
                      <p className="text-xs opacity-60">JPG · PNG · WebP</p>
                    </div>
                  )}
                </div>
                <input
                  id="img-upload" type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImgFile(f); e.target.value = '' }}
                />
              </div>
            )}

            {/* Prompt (txt2vid required, img2vid optional) */}
            <div>
              <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block mb-2">
                {tab === 'txt2vid' ? 'Prompt' : 'Motion Prompt (Optional)'}
              </label>
              <textarea
                value={tab === 'txt2vid' ? txtPrompt : imgPrompt}
                onChange={e => {
                  const v = e.target.value.slice(0, 300)
                  tab === 'txt2vid' ? setTxtPrompt(v) : setImgPrompt(v)
                }}
                onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generate() }}
                placeholder={
                  tab === 'txt2vid'
                    ? 'e.g. "a golden retriever running on a beach, cinematic, 4K"'
                    : 'Optional: describe the motion you want…'
                }
                rows={4}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none focus:border-accent transition-colors"
              />
              {tab === 'txt2vid' && (
                <>
                  <p className="text-[10px] text-text-tertiary text-right mt-0.5">{txtPrompt.length} / 300</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {EXAMPLES.map(ex => (
                      <button
                        key={ex} onClick={() => setTxtPrompt(ex)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-text-tertiary hover:text-text-primary hover:border-accent/40 transition-all"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* What to expect */}
            <div className="px-3 py-2.5 rounded-xl bg-surface border border-border space-y-1.5">
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">What to expect</p>
              {[
                '~1–5 min wait (free GPU queue)',
                'Real AI frames with actual motion',
                tab === 'txt2vid' ? 'Output: short MP4 clip (2–6 sec)' : 'Output: short video from your image',
                'No account or credit card needed',
              ].map(t => (
                <p key={t} className="text-[11px] text-text-tertiary flex items-center gap-1.5">
                  <span className="text-green-400">✓</span>{t}
                </p>
              ))}
            </div>

            {/* Generate / Cancel */}
            {!generating ? (
              <button
                onClick={generate} disabled={!canGenerate}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white text-sm font-semibold disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Video size={16} />Generate AI Video
              </button>
            ) : (
              <button
                onClick={cancelGen}
                className="w-full py-3 rounded-xl bg-surface border border-border text-text-secondary hover:bg-surface-hover text-sm font-medium flex items-center justify-center gap-2"
              >
                <X size={16} />Cancel
              </button>
            )}
          </div>

          {/* Right: Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0d0d]">

            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden">

              {/* Idle */}
              {!generating && !videoUrl && !vidError && (
                <div className="text-center space-y-2 select-none">
                  <Video size={52} className="text-white/10 mx-auto" />
                  <p className="text-white/50 text-xl font-medium">Bring your ideas to life.</p>
                  <p className="text-white/25 text-sm">
                    {tab === 'img2vid' ? 'Upload an image to animate with AI.' : 'Enter a prompt to generate a real AI video.'}
                  </p>
                </div>
              )}

              {/* Progress — big % like bach.art */}
              {generating && (
                <div className="text-center w-full max-w-sm space-y-4">
                  <div className="text-[80px] font-bold text-white leading-none tabular-nums">
                    {pct}<span className="text-4xl text-white/40 ml-1">%</span>
                  </div>
                  <p className="text-white text-lg font-semibold">Generation in Progress</p>
                  <p className="text-white/50 text-sm min-h-[1.5rem] px-4 text-center leading-snug">{status}</p>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-white/20 text-xs">
                    Free GPU queue — first-time generation may take a few minutes
                  </p>
                </div>
              )}

              {/* Error */}
              {!generating && vidError && (
                <div className="text-center space-y-4 max-w-md px-4">
                  <AlertCircle size={36} className="text-red-400 mx-auto" />
                  <p className="text-white/70 text-base font-medium">Generation Failed</p>
                  <p className="text-red-400/80 text-sm leading-relaxed">{vidError}</p>
                  <p className="text-white/30 text-xs leading-relaxed">
                    The free AI servers may be overloaded. Try again in a few minutes — it usually works on the next attempt.
                  </p>
                  <button
                    onClick={() => { setVidError(''); generate() }}
                    className="px-5 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 text-sm font-medium hover:bg-violet-500/30 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Video result */}
              {!generating && videoUrl && !vidError && (
                <div className="w-full max-w-2xl space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{videoType}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-white/60">AI Generated</span>
                  </div>

                  <div className="rounded-2xl overflow-hidden bg-black aspect-video border border-white/10">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={videoUrl}
                      autoPlay loop muted playsInline controls
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setVideoUrl(''); setPct(0); setVideoType('') }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 text-xs font-medium transition-colors"
                    >
                      <RefreshCw size={12} />Regenerate
                    </button>
                    <button
                      onClick={download}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30 text-xs font-medium transition-colors"
                    >
                      <Download size={12} />Download Video
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="border-t border-white/10 p-4 shrink-0">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">History</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {history.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setVideoUrl(item.url)}
                      className={`shrink-0 w-28 rounded-xl overflow-hidden border transition-all ${
                        item.url === videoUrl ? 'border-accent' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video src={item.url} muted playsInline className="w-full aspect-video object-cover" />
                      <p className="text-[9px] text-white/40 px-1.5 py-1 truncate bg-black/60">{item.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ AUDIO TTS ══ */}
      {tab === 'audio' && (
        <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-5">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <Mic2 size={15} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Uses your browser&apos;s built-in Text-to-Speech —{' '}
              <strong className="text-text-primary">100% free, works offline.</strong>{' '}
              Chrome Desktop has the best voices.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Text to Speak</label>
            <textarea
              value={audioText} onChange={e => setAudioText(e.target.value)}
              placeholder="Enter any text you want to convert to speech…" rows={7}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none focus:border-accent transition-colors"
            />
            <p className="text-[11px] text-text-tertiary mt-1">{audioText.length} characters</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Voice</label>
              <select value={audioVoice} onChange={e => setAudioVoice(Number(e.target.value))}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent">
                {audioVoices.length > 0
                  ? audioVoices.map((v, i) => <option key={i} value={i}>{v.name}</option>)
                  : <option>Loading voices…</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Speed: {audioRate}x</label>
              <input type="range" min="0.5" max="2" step="0.1" value={audioRate}
                onChange={e => setAudioRate(Number(e.target.value))} className="w-full accent-accent mt-3" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Pitch: {audioPitch.toFixed(1)}</label>
            <input type="range" min="0.5" max="2" step="0.1" value={audioPitch}
              onChange={e => setAudioPitch(Number(e.target.value))} className="w-full accent-accent" />
          </div>
          <div className="flex gap-3">
            {audioPlaying ? (
              <button onClick={stopAudio}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors">
                Stop
              </button>
            ) : (
              <button onClick={playAudio} disabled={!audioText.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold disabled:opacity-50 shadow-lg hover:from-cyan-600 hover:to-blue-600 transition-all">
                <Volume2 size={16} />Play Audio
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
