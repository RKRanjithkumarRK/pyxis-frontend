import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 25
export const dynamic = 'force-dynamic'

/**
 * POST /api/video/start
 *
 * Priority:
 *  1. REPLICATE_API_TOKEN → Replicate async prediction (ZeroScope v2 XL or SVD)
 *  2. FAL_KEY            → fal.ai async queue
 *  3. Neither            → { ok: false, needsSetup: true }
 *
 * Returns:
 *   { ok: true,  jobId, provider: 'replicate'|'fal', sessionHash: null }
 *   { ok: false, needsSetup: true, message }
 *   { ok: false, error }
 */

const REPLICATE_T2V_VERSION =
  'anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351'

const REPLICATE_I2V_VERSION =
  'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438'

export async function POST(req: NextRequest) {
  let body: { prompt?: string; mode?: string; imageData?: string; testMode?: boolean }
  try { body = await req.json() } catch { body = {} }

  const { prompt = '', mode = 'txt2vid', imageData, testMode = false } = body
  const replicateKey = process.env.REPLICATE_API_TOKEN
  const falKey       = process.env.FAL_KEY

  /* ── Test mode: just check if a provider is configured ── */
  if (testMode) {
    if (replicateKey || falKey) {
      return NextResponse.json({ ok: true, configured: true, provider: replicateKey ? 'replicate' : 'fal' })
    }
    return NextResponse.json({ ok: false, needsSetup: true, message: 'No API key configured' })
  }

  /* ── 1. Replicate ── */
  if (replicateKey) {
    try {
      const isImg = mode === 'img2vid'
      const version = isImg ? REPLICATE_I2V_VERSION : REPLICATE_T2V_VERSION

      const input: Record<string, unknown> = isImg
        ? {
            // SVD: image + motion params
            input_image: imageData,
            motion_bucket_id: 127,
            fps: 6,
            cond_aug: 0.02,
            decoding_t: 7,
            video_length: '25_frames_with_svd_xt',
          }
        : {
            // ZeroScope v2 XL: text-to-video
            prompt: prompt.trim().slice(0, 300) || 'cinematic video',
            negative_prompt: 'very blue, dust, noisy, washed out, ugly, distorted, broken',
            width: 576,
            height: 320,
            num_frames: 24,
            num_inference_steps: 25,
            guidance_scale: 7.5,
            fps: 8,
          }

      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${replicateKey}`,
        },
        body: JSON.stringify({ version, input }),
        signal: AbortSignal.timeout(12_000),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.id) {
          console.log(`[video/start] Replicate prediction started: ${data.id}`)
          return NextResponse.json({
            ok: true,
            jobId: data.id,
            provider: 'replicate',
            sessionHash: null,
            spaceName: 'Replicate',
          })
        }
      }

      const errText = await res.text().catch(() => '')
      console.warn(`[video/start] Replicate error ${res.status}: ${errText.slice(0, 200)}`)
    } catch (e: any) {
      console.warn(`[video/start] Replicate threw: ${e.message}`)
    }
  }

  /* ── 2. fal.ai ── */
  if (falKey) {
    try {
      const isImg = mode === 'img2vid'
      const endpoint = isImg
        ? 'https://queue.fal.run/fal-ai/stable-video-diffusion'
        : 'https://queue.fal.run/fal-ai/fast-animatediff/text-to-video'

      const payload = isImg
        ? { image_url: imageData, motion_bucket_id: 127, fps: 6 }
        : {
            prompt: prompt.trim().slice(0, 300) || 'cinematic video',
            video_size: { width: 512, height: 288 },
            num_inference_steps: 25,
            guidance_scale: 7.5,
            num_frames: 16,
          }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Key ${falKey}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12_000),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.request_id) {
          console.log(`[video/start] fal job started: ${data.request_id}`)
          return NextResponse.json({
            ok: true,
            jobId: data.request_id,
            provider: 'fal',
            sessionHash: null,
            spaceName: 'fal.ai',
          })
        }
      }

      const errText = await res.text().catch(() => '')
      console.warn(`[video/start] fal error ${res.status}: ${errText.slice(0, 200)}`)
    } catch (e: any) {
      console.warn(`[video/start] fal threw: ${e.message}`)
    }
  }

  /* ── No keys configured ── */
  if (!replicateKey && !falKey) {
    return NextResponse.json(
      {
        ok: false,
        needsSetup: true,
        message: 'Video generation requires a free API key. Add REPLICATE_API_TOKEN to your environment variables.',
      },
      { status: 200 },
    )
  }

  /* ── Keys exist but all providers failed ── */
  return NextResponse.json(
    { ok: false, error: 'Video provider is temporarily unavailable. Please try again in a few minutes.' },
    { status: 503 },
  )
}
