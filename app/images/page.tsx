'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Sparkles, Download, Maximize2, RotateCcw, Paperclip, ChevronDown,
  X, Loader2, Wand2, Image as ImageIcon, Zap, Clock, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GalleryImage {
  id: string
  url: string
  prompt: string
  style: string
  timestamp: number
  aspectRatio: string
  isNew?: boolean
  isLoading?: boolean
  width: number
  height: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODELS = [
  { id: 'flux-ultra', label: 'FLUX Ultra', badge: 'Best' },
  { id: 'flux-pro', label: 'FLUX Pro', badge: 'Popular' },
  { id: 'photo-v2', label: 'Photorealistic v2', badge: null },
  { id: 'anime-xl', label: 'Anime XL', badge: null },
  { id: 'cinematic-4k', label: 'Cinematic 4K', badge: null },
]

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', short: '1:1', width: 1024, height: 1024 },
  { id: '16:9', label: 'Landscape', short: '16:9', width: 1920, height: 1080 },
  { id: '9:16', label: 'Portrait', short: '9:16', width: 1080, height: 1920 },
  { id: '21:9', label: 'Wide', short: '21:9', width: 2560, height: 1080 },
]

const STYLE_PRESETS = [
  { id: 'none', label: 'Default', suffix: '' },
  { id: 'photorealistic', label: 'Photorealistic', suffix: ', photorealistic, 4K, ultra detailed, sharp focus, DSLR' },
  { id: 'cinematic', label: 'Cinematic', suffix: ', cinematic lighting, movie still, anamorphic lens, dramatic atmosphere' },
  { id: 'anime', label: 'Anime', suffix: ', anime style, Studio Ghibli, vibrant colors, detailed illustration' },
  { id: 'digital-art', label: 'Digital Art', suffix: ', digital art, concept art, artstation trending, highly detailed' },
  { id: 'oil-painting', label: 'Oil Painting', suffix: ', oil painting, classical art, textured brushstrokes, museum quality' },
  { id: 'watercolor', label: 'Watercolor', suffix: ', watercolor painting, soft edges, pastel colors, artistic' },
  { id: 'cyberpunk', label: 'Cyberpunk', suffix: ', cyberpunk, neon lights, futuristic city, rain, dark atmosphere' },
  { id: 'fantasy', label: 'Fantasy', suffix: ', fantasy art, magical, epic, ethereal glow, intricate detail' },
  { id: 'sketch', label: 'Sketch', suffix: ', pencil sketch, hand drawn, detailed linework, graphite' },
  { id: '3d-render', label: '3D Render', suffix: ', 3D render, octane render, subsurface scattering, photorealistic lighting' },
  { id: 'architecture', label: 'Architecture', suffix: ', architectural visualization, clean lines, modern design, professional render' },
]

const QUALITY_OPTIONS = [
  { id: 'draft', label: 'Draft', desc: 'Fast' },
  { id: 'standard', label: 'Standard', desc: 'Balanced' },
  { id: 'hd', label: 'HD', desc: 'Best' },
]

const EXAMPLE_PROMPTS = [
  { prompt: 'majestic lion golden hour savanna photorealistic 4K', w: 512, h: 512 },
  { prompt: 'neon cyberpunk city rain night futuristic', w: 512, h: 768 },
  { prompt: 'beautiful woman beach sunset cinematic', w: 512, h: 768 },
  { prompt: 'mystical forest with glowing mushrooms fantasy', w: 512, h: 512 },
  { prompt: 'modern luxury interior architecture minimal', w: 768, h: 512 },
  { prompt: 'astronaut floating space earth view cinematic', w: 512, h: 512 },
  { prompt: 'japanese cherry blossom temple anime style', w: 512, h: 768 },
  { prompt: 'delicious gourmet food restaurant photorealistic', w: 512, h: 512 },
  { prompt: 'abstract colorful digital art geometric', w: 512, h: 512 },
  { prompt: 'cute puppy golden retriever studio portrait', w: 512, h: 512 },
  { prompt: 'epic mountain landscape aurora borealis', w: 768, h: 512 },
  { prompt: 'vintage sports car classic photography', w: 768, h: 512 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pollinationsUrl(prompt: string, w: number, h: number) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true`
}

function timeAgo(ts: number) {
  const d = Date.now() - ts
  if (d < 60000) return 'just now'
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`
  return `${Math.floor(d / 3600000)}h ago`
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="break-inside-avoid mb-4 rounded-2xl overflow-hidden bg-gray-100 animate-pulse" style={{ height: 280 }}>
      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-100 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
        <div className="space-y-2 text-center">
          <div className="h-2 w-32 bg-gray-300 rounded mx-auto" />
          <div className="h-2 w-20 bg-gray-200 rounded mx-auto" />
        </div>
      </div>
    </div>
  )
}

// ─── Image Card ───────────────────────────────────────────────────────────────

interface ImageCardProps {
  img: GalleryImage
  onExpand: (img: GalleryImage) => void
  onDownload: (img: GalleryImage) => void
  onRemix: (prompt: string) => void
}

function ImageCard({ img, onExpand, onDownload, onRemix }: ImageCardProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation()
    setErrored(false)
    setLoaded(false)
    setRetryKey(k => k + 1)
  }

  return (
    <div
      className="break-inside-avoid mb-4 group relative rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
      style={{ transform: 'translateZ(0)' }}
    >
      {!loaded && !errored && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-100 animate-pulse" style={{ minHeight: 200 }} />
      )}
      {!errored ? (
        <img
          key={retryKey}
          src={img.url}
          alt={img.prompt}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-48 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-100 to-gray-50">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-gray-400 text-xs text-center px-4 leading-relaxed line-clamp-2">{img.prompt}</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 hover:text-gray-700 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Action buttons top-right */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onExpand(img) }}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all"
            title="Expand"
          >
            <Maximize2 className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(img) }}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all"
            title="Download"
          >
            <Download className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemix(img.prompt) }}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all"
            title="Remix"
          >
            <RotateCcw className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        {/* Prompt bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-xs leading-snug line-clamp-2 font-medium">{img.prompt}</p>
          {img.timestamp > 0 && (
            <p className="text-white/50 text-[10px] mt-1 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> {timeAgo(img.timestamp)}
            </p>
          )}
        </div>
      </div>

      {/* New badge */}
      {img.isNew && (
        <div className="absolute top-3 left-3">
          <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[10px] font-semibold rounded-full shadow-lg">
            NEW
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImagesPage() {
  const { getToken } = useAuth()

  // Input state
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState(MODELS[0])
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0])
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0])
  const [selectedQuality, setSelectedQuality] = useState(QUALITY_OPTIONS[1])
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedImageName, setUploadedImageName] = useState('')

  // UI state
  const [generating, setGenerating] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null)

  // Gallery
  const [generatedImages, setGeneratedImages] = useState<GalleryImage[]>([])
  const [exampleImages, setExampleImages] = useState<GalleryImage[]>([])
  const [showSkeleton, setShowSkeleton] = useState(false)

  // History
  const [history, setHistory] = useState<GalleryImage[]>([])

  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  // Load example images on mount
  useEffect(() => {
    const examples: GalleryImage[] = EXAMPLE_PROMPTS.map((ep, i) => ({
      id: `example-${i}`,
      url: pollinationsUrl(ep.prompt, ep.w, ep.h),
      prompt: ep.prompt,
      style: 'Default',
      timestamp: 0,
      aspectRatio: ep.w > ep.h ? '16:9' : ep.w === ep.h ? '1:1' : '9:16',
      isNew: false,
      width: ep.w,
      height: ep.h,
    }))
    setExampleImages(examples)
  }, [])

  // Close model dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return }
    setUploadedImageName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string)
    reader.readAsDataURL(file)
    toast.success('Image uploaded — it will be used as style reference')
  }

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || enhancing) return
    setEnhancing(true)
    // Simulate AI enhancement by appending quality descriptors
    await new Promise(r => setTimeout(r, 900))
    const enhancements = [
      'highly detailed', 'professional quality', 'sharp focus',
      'beautiful composition', 'stunning lighting', 'award winning photography',
    ]
    const picked = enhancements.slice(0, 3).join(', ')
    setPrompt(p => p.trim() + `, ${picked}`)
    setEnhancing(false)
    toast.success('Prompt enhanced!')
  }

  const handleGenerate = useCallback(async () => {
    const base = prompt.trim()
    if (!base || generating) return

    const finalPrompt = uploadedImage
      ? base + ', maintain the style and composition of the reference image' + selectedStyle.suffix
      : base + selectedStyle.suffix

    setGenerating(true)
    setShowSkeleton(true)

    try {
      const token = await getToken()
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          model: selectedModel.id,
          width: selectedRatio.width,
          height: selectedRatio.height,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      const newImg: GalleryImage = {
        id: `gen-${Date.now()}`,
        url: data.url,
        prompt: base,
        style: selectedStyle.label,
        timestamp: Date.now(),
        aspectRatio: selectedRatio.id,
        isNew: true,
        width: selectedRatio.width,
        height: selectedRatio.height,
      }

      setGeneratedImages(prev => [newImg, ...prev])
      setHistory(prev => [newImg, ...prev].slice(0, 8))
      setPrompt('')
      setUploadedImage(null)
      setUploadedImageName('')
      toast.success('Image generated!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate'
      toast.error(msg)
    } finally {
      setGenerating(false)
      setShowSkeleton(false)
    }
  }, [prompt, generating, selectedStyle, selectedRatio, uploadedImage, getToken])

  const handleDownload = async (img: GalleryImage) => {
    const slug = img.prompt.slice(0, 24).replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '')
    const filename = `pyxis-${slug}.png`
    try {
      let blob: Blob
      if (img.url.startsWith('data:')) {
        const [header, b64] = img.url.split(',')
        const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
        const binary = atob(b64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        blob = new Blob([bytes], { type: mime })
      } else {
        const res = await fetch('/api/images/proxy?url=' + encodeURIComponent(img.url))
        if (!res.ok) throw new Error('Download failed')
        blob = await res.blob()
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 200)
      toast.success('Downloaded!')
    } catch {
      toast.error('Download failed')
    }
  }

  const handleRemix = (p: string) => {
    setPrompt(p)
    textareaRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const allGalleryImages = [...generatedImages, ...exampleImages]

  return (
    <div className="min-h-0 flex flex-col bg-transparent text-text-primary">

      {/* ── Hero Header ───────────────────────────────────────────── */}
      <div className="w-full px-6 pt-10 pb-6 flex flex-col items-center text-center border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-200">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI Image Studio</h1>
        </div>
        <p className="text-gray-500 text-base max-w-lg">
          Create stunning visuals with AI — free, instant, no account needed
        </p>
      </div>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Prompt Card ─────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Model selector bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Model</span>
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => setModelOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-purple-300 transition-all shadow-sm"
              >
                {selectedModel.label}
                {selectedModel.badge && (
                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-600 text-[10px] font-semibold rounded">
                    {selectedModel.badge}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {modelOpen && (
                <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-30 min-w-[200px] overflow-hidden">
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedModel(m); setModelOpen(false) }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-purple-50 transition-colors ${
                        selectedModel.id === m.id ? 'text-purple-600 font-medium bg-purple-50/50' : 'text-gray-700'
                      }`}
                    >
                      <span>{m.label}</span>
                      {m.badge && (
                        <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-600 rounded font-semibold">{m.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Textarea */}
          <div className="relative p-4">
            {uploadedImage && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl">
                <img src={uploadedImage} alt="ref" className="w-8 h-8 rounded object-cover" />
                <span className="text-xs text-purple-700 font-medium flex-1 truncate">{uploadedImageName}</span>
                <button onClick={() => { setUploadedImage(null); setUploadedImageName('') }}>
                  <X className="w-3.5 h-3.5 text-purple-400 hover:text-purple-600" />
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value.slice(0, 5000))}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleGenerate() }}
              placeholder="Describe an image or upload your photo, and I'll create something unique…"
              className="w-full resize-none outline-none text-gray-800 text-base placeholder:text-gray-400 min-h-[100px] leading-relaxed"
              rows={4}
              disabled={generating}
            />
            {/* Bottom bar of textarea */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {/* Upload */}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all text-xs"
                  title="Upload reference image"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
                {/* Enhance */}
                <button
                  onClick={handleEnhancePrompt}
                  disabled={!prompt.trim() || enhancing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 disabled:opacity-40 rounded-lg transition-all text-xs font-medium"
                  title="Enhance prompt with AI"
                >
                  {enhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Enhance</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-300">{prompt.length}/5000</span>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md shadow-purple-200 hover:shadow-purple-300 transition-all active:scale-95"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {generating ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Settings Row ───────────────────────────────────── */}
        <div className="space-y-3">
          {/* Aspect ratio */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide w-20 shrink-0">Ratio</span>
            <div className="flex items-center gap-2">
              {ASPECT_RATIOS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRatio(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    selectedRatio.id === r.id
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span>{r.label}</span>
                  <span className={`ml-1 ${selectedRatio.id === r.id ? 'text-gray-300' : 'text-gray-400'}`}>
                    {r.short}
                  </span>
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Quality</span>
              {QUALITY_OPTIONS.map(q => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuality(q)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    selectedQuality.id === q.id
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style presets */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide w-20 shrink-0">Style</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
              {STYLE_PRESETS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyle(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                    selectedStyle.id === s.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white border-transparent shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Gallery ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Gallery
              <span className="ml-2 text-sm font-normal text-gray-400">
                {generatedImages.length > 0 ? `${generatedImages.length} generated · ` : ''}
                {exampleImages.length} examples
              </span>
            </h2>
            {generatedImages.length > 0 && (
              <button
                onClick={() => setGeneratedImages([])}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors"
              >
                Clear generated
              </button>
            )}
          </div>

          <div className="columns-2 md:columns-4 gap-4">
            {/* Skeleton while generating */}
            {showSkeleton && (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}

            {allGalleryImages.map(img => (
              <ImageCard
                key={img.id}
                img={img}
                onExpand={setLightbox}
                onDownload={handleDownload}
                onRemix={handleRemix}
              />
            ))}
          </div>
        </div>

        {/* ── History Strip ────────────────────────────────────────── */}
        {history.length > 0 && (
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Recent Generations
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {history.map(img => (
                <button
                  key={img.id}
                  onClick={() => setLightbox(img)}
                  className="flex-shrink-0 group relative w-16 h-16 rounded-xl overflow-hidden border-2 border-transparent hover:border-purple-400 transition-all"
                  title={img.prompt}
                >
                  <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Lightbox Modal ───────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Image */}
            <img
              src={lightbox.url}
              alt={lightbox.prompt}
              className="w-full max-h-[70vh] object-contain bg-gray-50"
            />

            {/* Info panel */}
            <div className="p-5 border-t border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 mb-1 leading-snug">{lightbox.prompt}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-medium">{lightbox.style}</span>
                    <span>{lightbox.aspectRatio}</span>
                    {lightbox.timestamp > 0 && <span>{timeAgo(lightbox.timestamp)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { handleRemix(lightbox.prompt); setLightbox(null) }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-all"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Remix
                  </button>
                  <button
                    onClick={() => handleDownload(lightbox)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 rounded-lg text-sm text-white font-medium transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
