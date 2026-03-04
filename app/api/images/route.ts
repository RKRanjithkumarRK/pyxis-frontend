import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel hobby allows up to 60s

export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt, size = '512x512' } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

  const seed = Math.floor(Math.random() * 999999)

  // Check if user has OpenAI key — use DALL-E 3 if available
  const keyDoc = await adminDb.doc(`users/${user.uid}/private/apikeys`).get()
  const userKeys = keyDoc.exists ? keyDoc.data() || {} : {}
  const openaiKey = userKeys.openai || process.env.OPENAI_API_KEY

  if (openaiKey) {
    try {
      const dalleSize = '1024x1024' // DALL-E always 1024
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: dalleSize, response_format: 'url' }),
      })
      if (response.ok) {
        const data = await response.json()
        const url = data.data[0]?.url
        const revisedPrompt = data.data[0]?.revised_prompt || prompt
        if (url) return NextResponse.json({ url, prompt: revisedPrompt, source: 'dalle3' })
      }
    } catch {}
    // Fall through to free if DALL-E fails
  }

  // Free fallback: proxy Pollinations through server to fix Brave/CORS error 1033
  // Using 'turbo' model (fast, ~5-15s) and 512x512 to stay within timeout
  const encoded = encodeURIComponent(prompt)
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true&model=turbo&enhance=false`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 50000)

  try {
    const imgRes = await fetch(pollinationsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pyxis/1.0)' },
    })
    clearTimeout(timeoutId)

    if (!imgRes.ok) {
      throw new Error(`Pollinations returned ${imgRes.status}`)
    }

    const buffer = await imgRes.arrayBuffer()
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'

    // Return as base64 data URL — works in ALL browsers including Brave
    const base64 = Buffer.from(buffer).toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

    return NextResponse.json({ url: dataUrl, prompt, source: 'pollinations' })
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: 'Image generation timed out. Please try again.' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Image generation failed. Please try a different description.' }, { status: 500 })
  }
}
