import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/video
 * 1. Try fal.ai queue (fast, returns jobId immediately for client polling)
 * 2. Try Replicate queue (fallback, also async)
 * Returns { jobId, provider } or { error, balanceExhausted? }
 */
export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

  const falKey       = process.env.FAL_KEY
  const replicateKey = process.env.REPLICATE_API_TOKEN

  /* ── 1. fal.ai queue ── */
  if (falKey) {
    try {
      const res = await fetch(
        'https://queue.fal.run/fal-ai/fast-animatediff/text-to-video',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Key ${falKey}` },
          body: JSON.stringify({
            prompt: prompt.trim().slice(0, 150),
            video_size: { width: 512, height: 288 },
            num_inference_steps: 25,
            guidance_scale: 7.5,
            num_frames: 16,
          }),
          signal: AbortSignal.timeout(15_000),
        }
      )

      if (res.ok) {
        const data = await res.json()
        const jobId: string | undefined = data.request_id
        if (jobId) return NextResponse.json({ jobId, provider: 'fal' })
      }

      const errText = await res.text().catch(() => '')
      // Detect balance exhausted — fall through to Replicate
      if (res.status === 403 && errText.toLowerCase().includes('exhausted')) {
        console.warn('[video/fal] balance exhausted — trying Replicate fallback')
        // fall through
      } else {
        console.error('[video/fal] submit error:', res.status, errText.slice(0, 200))
        // fall through to Replicate
      }
    } catch (err: any) {
      console.error('[video/fal] threw:', err.message)
      // fall through
    }
  }

  /* ── 2. Replicate queue ── */
  if (replicateKey) {
    try {
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${replicateKey}`,
        },
        body: JSON.stringify({
          // zeroscope-v2-xl: reliable free text-to-video on Replicate
          version: '9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351',
          input: {
            prompt: prompt.trim().slice(0, 150),
            num_frames: 24,
            width: 576,
            height: 320,
            num_inference_steps: 25,
            fps: 8,
          },
        }),
        signal: AbortSignal.timeout(15_000),
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

  /* ── No provider worked ── */
  if (!falKey && !replicateKey) {
    return NextResponse.json(
      { error: 'Video generation is not configured on this server.', notConfigured: true },
      { status: 503 }
    )
  }

  // Likely fal.ai balance exhausted and no Replicate key
  return NextResponse.json(
    {
      error: 'fal.ai balance exhausted. Top up at fal.ai/dashboard/billing, or add a REPLICATE_API_TOKEN to Vercel for a free fallback.',
      balanceExhausted: true,
    },
    { status: 503 }
  )
}
