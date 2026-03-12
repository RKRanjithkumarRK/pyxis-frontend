import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchImage(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(18_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
    })
    if (res.ok) return res
    console.warn('[frame] fetch returned', res.status, url.slice(0, 80))
    return null
  } catch {
    return null
  }
}

/**
 * GET /api/frame?prompt=...&seed=...&idx=0-4
 * Tries Pollinations AI first (free, AI-generated).
 * Falls back to Picsum Photos if Pollinations is rate-limited.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const prompt = searchParams.get('prompt')?.trim()
  const seed   = parseInt(searchParams.get('seed') || '0', 10) || Date.now()
  const idx    = parseInt(searchParams.get('idx') || '0', 10)

  if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

  // Stagger concurrent requests to avoid Pollinations rate-limit
  if (idx > 0) await sleep(idx * 700)

  // 1. Try Pollinations AI (free AI image generation)
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=512&height=288&nologo=true&model=flux`
  let res = await fetchImage(pollinationsUrl)

  // 2. Retry once after a delay if rate-limited
  if (!res) {
    await sleep(2500)
    res = await fetchImage(pollinationsUrl)
  }

  // 3. Fallback: Picsum Photos (reliable free stock photography)
  if (!res) {
    console.warn('[frame] Pollinations failed, using Picsum fallback for idx', idx)
    const picsumSeed = Math.abs(seed % 1000) + idx * 13
    const picsumUrl = `https://picsum.photos/seed/${picsumSeed}/512/288`
    res = await fetchImage(picsumUrl)
  }

  if (!res) {
    return NextResponse.json({ error: 'All image sources failed' }, { status: 502 })
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'X-Image-Source': res.url?.includes('picsum') ? 'picsum' : 'pollinations',
    },
  })
}
