import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  // Only allow Pollinations and known image hosts
  const allowed = [
    'image.pollinations.ai',
    'cdn.openai.com',
    // OpenAI DALL-E regional blob storage (varies by Azure region)
    '.blob.core.windows.net',
    // Stable Horde CDN
    'stablehorde.net',
  ]
  let hostname = ''
  try {
    hostname = new URL(url).hostname
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  if (!allowed.some(h => hostname.endsWith(h))) {
    return NextResponse.json({ error: 'Disallowed host' }, { status: 403 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pyxis/1.0)' },
    })
    if (!res.ok) throw new Error(`Upstream error ${res.status}`)

    const contentType = res.headers.get('content-type') || 'image/png'
    const arrayBuffer = await res.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch image' }, { status: 500 })
  }
}
