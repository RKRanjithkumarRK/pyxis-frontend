import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'
export const maxDuration = 55  // Vercel Hobby allows up to 60s

const HF_VIDEO_MODEL = 'damo-vilab/text-to-video-ms-1.7b'

/**
 * POST /api/video
 * Priority:
 *  1. HuggingFace Inference API — free, no API key needed (rate-limited for anon)
 *  2. fal.ai queue — async, returns jobId
 *  3. Replicate queue — async, returns jobId
 *
 * Returns one of:
 *   { url, provider: 'huggingface' }  — direct video, no polling needed
 *   { jobId, provider: 'fal'|'replicate' } — async, client must poll
 */
export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

  const cleanPrompt  = prompt.trim().slice(0, 150)
  const falKey       = process.env.FAL_KEY
  const replicateKey = process.env.REPLICATE_API_TOKEN
  const hfKey        = process.env.HUGGINGFACE_API_KEY // optional — anon works too

  /* ── 1. HuggingFace Inference (free, no API key required) ── */
  try {
    const hfHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-wait-for-model': 'true',  // wait for cold-start load
    }
    if (hfKey) hfHeaders['Authorization'] = `Bearer ${hfKey}`

    const hfRes = await fetch(
      `https://api-inference.huggingface.co/models/${HF_VIDEO_MODEL}`,
      {
        method: 'POST',
        headers: hfHeaders,
        body: JSON.stringify({ inputs: cleanPrompt }),
        signal: AbortSignal.timeout(48_000), // 48s — leaves buffer before Vercel limit
      }
    )

    if (hfRes.ok) {
      const contentType = hfRes.headers.get('content-type') || 'video/mp4'
      // HF returns binary video data
      if (contentType.includes('video') || contentType.includes('octet-stream')) {
        const buffer = await hfRes.arrayBuffer()
        if (buffer.byteLength > 1000) { // sanity check — real video is > 1KB
          const base64 = Buffer.from(buffer).toString('base64')
          const mime   = contentType.includes('video') ? contentType.split(';')[0] : 'video/mp4'
          return NextResponse.json({
            url: `data:${mime};base64,${base64}`,
            provider: 'huggingface',
          })
        }
      }
    }

    const hfStatus = hfRes.status
    const hfText   = await hfRes.text().catch(() => '')
    console.warn('[video/hf] failed:', hfStatus, hfText.slice(0, 200))
    // Fall through to fal.ai / Replicate
  } catch (err: any) {
    console.warn('[video/hf] threw (timeout or network):', err.message)
    // Fall through
  }

  /* ── 2. fal.ai queue ── */
  if (falKey) {
    try {
      const res = await fetch(
        'https://queue.fal.run/fal-ai/fast-animatediff/text-to-video',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Key ${falKey}` },
          body: JSON.stringify({
            prompt: cleanPrompt,
            video_size: { width: 512, height: 288 },
            num_inference_steps: 25,
            guidance_scale: 7.5,
            num_frames: 16,
          }),
          signal: AbortSignal.timeout(12_000),
        }
      )

      if (res.ok) {
        const data = await res.json()
        const jobId: string | undefined = data.request_id
        if (jobId) return NextResponse.json({ jobId, provider: 'fal' })
      }

      const errText = await res.text().catch(() => '')
      console.error('[video/fal] submit error:', res.status, errText.slice(0, 200))
    } catch (err: any) {
      console.error('[video/fal] threw:', err.message)
    }
  }

  /* ── 3. Replicate queue ── */
  if (replicateKey) {
    try {
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${replicateKey}`,
        },
        body: JSON.stringify({
          version: '9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351',
          input: {
            prompt: cleanPrompt,
            num_frames: 24,
            width: 576,
            height: 320,
            num_inference_steps: 25,
            fps: 8,
          },
        }),
        signal: AbortSignal.timeout(12_000),
      })

      if (res.ok) {
        const data = await res.json()
        const jobId: string | undefined = data.id
        if (jobId) return NextResponse.json({ jobId, provider: 'replicate' })
      }

      const errText = await res.text().catch(() => '')
      console.error('[video/replicate] submit error:', res.status, errText.slice(0, 200))
    } catch (err: any) {
      console.error('[video/replicate] threw:', err.message)
    }
  }

  /* ── All providers failed ── */
  return NextResponse.json(
    {
      error: 'Video generation is temporarily unavailable. HuggingFace free tier may be at capacity — please try again in a few minutes.',
      retryable: true,
    },
    { status: 503 }
  )
}
