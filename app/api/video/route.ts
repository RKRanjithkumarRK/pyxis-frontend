import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'

export const dynamic  = 'force-dynamic'
export const maxDuration = 120

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/* ─── fal.ai — primary provider (15–30 s, reliable) ─────────────────────── */
async function generateWithFal(
  prompt: string,
  falKey: string,
): Promise<{ url: string; isRemote: boolean } | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  try {
    const res = await fetch('https://fal.run/fal-ai/fast-animatediff/text-to-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify({
        prompt: prompt.slice(0, 150),        // fal works best with concise prompts
        video_size: { width: 512, height: 288 },
        num_inference_steps: 20,
        guidance_scale: 7.5,
        num_frames: 16,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const err = await res.text()
      console.error('[video/fal] error:', res.status, err.slice(0, 200))
      return null
    }
    const data = await res.json()
    const url: string | undefined = data?.video?.url ?? data?.url
    if (!url) { console.error('[video/fal] no url in response:', JSON.stringify(data).slice(0, 200)); return null }
    return { url, isRemote: true }
  } catch (err: any) {
    clearTimeout(timeout)
    console.error('[video/fal] threw:', err.message)
    return null
  }
}

/* ─── HuggingFace — fallback (slow, free) ───────────────────────────────── */
const HF_MODELS = ['cerspense/zeroscope_v2_576w', 'damo-vilab/text-to-video-ms-1.7b']

function parseHfError(body: string, status: number): 'loading' | 'auth' | 'ratelimit' | string {
  if (body.trimStart().startsWith('<') || body.includes('<!DOCTYPE')) {
    if (status === 401 || status === 403) return 'auth'
    if (status === 429) return 'ratelimit'
    return 'loading'
  }
  try {
    const j = JSON.parse(body)
    const msg: string = j.error || j.message || ''
    if (msg.toLowerCase().includes('loading') || status === 503) return 'loading'
    return msg || `HTTP ${status}`
  } catch {
    return body.slice(0, 150) || `HTTP ${status}`
  }
}

async function generateWithHF(
  prompt: string,
  hfToken: string | undefined,
): Promise<{ url: string } | null> {
  // Use a short prompt — these small models perform best under 80 chars
  const shortPrompt = prompt.slice(0, 100)

  for (const model of HF_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(8_000)

      const controller = new AbortController()
      // 45 s per attempt — leaves room for 2 attempts inside 120 s Vercel limit
      const timeout = setTimeout(() => controller.abort(), 45_000)

      try {
        const res = await fetch(
          `https://router.huggingface.co/hf-inference/models/${model}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-wait-for-model': 'true',
              'x-use-cache': 'false',
              ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
            },
            body: JSON.stringify({ inputs: shortPrompt }),
            signal: controller.signal,
          }
        )
        clearTimeout(timeout)

        if (!res.ok) {
          const reason = parseHfError(await res.text(), res.status)
          if (reason === 'auth') return null      // no point trying other models
          console.log(`[video/hf] ${model} attempt ${attempt + 1}: ${reason}`)
          continue
        }

        const ct = res.headers.get('content-type') || 'video/mp4'
        if (ct.includes('text/html')) { console.log(`[video/hf] ${model}: got HTML, retrying`); continue }

        const buf = await res.arrayBuffer()
        const b64 = Buffer.from(buf).toString('base64')
        return { url: `data:${ct};base64,${b64}` }

      } catch (err: any) {
        clearTimeout(timeout)
        console.log(`[video/hf] ${model} attempt ${attempt + 1} threw: ${err.message}`)
        // AbortError = timeout → try next attempt / next model
      }
    }
  }
  return null
}

/* ─── Handler ────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

  const falKey  = process.env.FAL_KEY
  const hfToken = process.env.HF_TOKEN

  /* 1 — fal.ai (fast, ~15-30 s) */
  if (falKey) {
    const result = await generateWithFal(prompt.trim(), falKey)
    if (result) {
      if (result.isRemote) {
        // Proxy the remote URL → base64 so the client doesn't need CORS
        try {
          const r = await fetch(result.url)
          const buf = await r.arrayBuffer()
          const ct = r.headers.get('content-type') || 'video/mp4'
          return NextResponse.json({
            url: `data:${ct};base64,${Buffer.from(buf).toString('base64')}`,
            source: 'fal',
          })
        } catch {
          // Proxying failed → return the raw URL directly (CORS should be OK)
          return NextResponse.json({ url: result.url, source: 'fal' })
        }
      }
      return NextResponse.json({ url: result.url, source: 'fal' })
    }
  }

  /* 2 — HuggingFace (slow, needs HF_TOKEN for priority) */
  const hfResult = await generateWithHF(prompt.trim(), hfToken)
  if (hfResult) {
    return NextResponse.json({ url: hfResult.url, source: 'huggingface' })
  }

  /* 3 — All failed */
  if (!falKey && !hfToken) {
    return NextResponse.json({
      error: 'Video generation needs API credentials.',
      needsSetup: true,
    }, { status: 503 })
  }

  return NextResponse.json({
    error: 'Video generation timed out. Try a shorter, simpler prompt — e.g. "a cat running through a field".',
    hint: true,
  }, { status: 503 })
}
