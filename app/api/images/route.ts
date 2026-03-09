import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

  const seed = Math.floor(Math.random() * 999999)

  // Check if user has OpenAI key — use DALL-E 3 if available
  const keyDoc = await adminDb.doc(`users/${user.uid}/private/apikeys`).get()
  const userKeys = keyDoc.exists ? keyDoc.data() || {} : {}
  const openaiKey = userKeys.openai || process.env.OPENAI_API_KEY

  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', response_format: 'url' }),
      })
      if (response.ok) {
        const data = await response.json()
        const url = data.data[0]?.url
        const revisedPrompt = data.data[0]?.revised_prompt || prompt
        if (url) return NextResponse.json({ url, prompt: revisedPrompt, source: 'dalle3' })
      }
    } catch (err: any) { console.error('Image gen error (DALL-E 3):', err) /* continue to next provider */ }
  }

  // ── 1. Try Pollinations (fast, ~5-15s) ──────────────────────────────
  try {
    const encoded = encodeURIComponent(prompt)
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true&model=flux&enhance=false`
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 20000)

    const imgRes = await fetch(pollinationsUrl, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pyxis/1.0)' },
    })
    clearTimeout(t)

    if (imgRes.ok) {
      const buffer = await imgRes.arrayBuffer()
      const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
      const base64 = Buffer.from(buffer).toString('base64')
      return NextResponse.json({ url: `data:${mimeType};base64,${base64}`, prompt, source: 'pollinations' })
    }
  } catch (err: any) { console.error('Image gen error (Pollinations):', err) /* continue to next provider */ }

  // ── 2. Fallback: Stable Horde (free, distributed, works globally) ───
  try {
    const submitRes = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: { 'apikey': '0000000000', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        params: { width: 512, height: 512, steps: 20, n: 1, sampler_name: 'k_euler' },
        models: ['stable_diffusion'],
        r2: true,
      }),
    })
    if (!submitRes.ok) throw new Error('Submit failed')
    const { id } = await submitRes.json()

    // Poll until done (max 50s)
    const deadline = Date.now() + 50000
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 4000))
      const statusRes = await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`)
      if (!statusRes.ok) continue
      const status = await statusRes.json()
      if (status.done && status.generations?.length > 0) {
        const imgUrl = status.generations[0].img
        const imgRes = await fetch(imgUrl)
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          return NextResponse.json({ url: `data:image/webp;base64,${base64}`, prompt, source: 'stablehorde' })
        }
      }
    }
  } catch (err: any) { console.error('Image gen error (Stable Horde):', err) /* continue to final fallback */ }

  return NextResponse.json({ error: 'All image generation methods failed' }, { status: 503 })
}
