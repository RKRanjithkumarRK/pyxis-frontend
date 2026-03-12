import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 25
export const dynamic = 'force-dynamic'

/**
 * GET /api/video/poll?jobId=xxx&provider=replicate|fal
 *
 * Polls the async video generation job and returns:
 *   { status: 'queued'|'generating'|'completed'|'failed', pct, message, videoUrl? }
 */

/* ── Replicate status map ── */
function replicateStatusToOurs(status: string, logs?: string): {
  status: string; pct: number; message: string
} {
  switch (status) {
    case 'starting':
      return { status: 'queued',     pct: 3,  message: 'Replicate: warming up GPU…'           }
    case 'processing': {
      // Try to parse progress from logs, e.g. "  15%|████"
      const pctMatch = logs?.match(/(\d+)%\|/)
      const parsed = pctMatch ? parseInt(pctMatch[1], 10) : 0
      const pct = parsed > 0 ? Math.round(10 + (parsed * 0.8)) : 20
      return { status: 'generating', pct, message: `Generating video… ${parsed ? `${parsed}%` : 'please wait'}` }
    }
    case 'succeeded':
      return { status: 'completed',  pct: 100, message: 'Done!' }
    case 'failed':
    case 'canceled':
      return { status: 'failed',     pct: 0,   message: 'Generation failed' }
    default:
      return { status: 'queued',     pct: 2,   message: 'Waiting in queue…'                    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId    = searchParams.get('jobId')
  const provider = searchParams.get('provider') ?? 'replicate'

  if (!jobId) {
    return NextResponse.json({ status: 'failed', error: 'Missing jobId' })
  }

  /* ═══════════════════════════════════════════════
     REPLICATE
  ═══════════════════════════════════════════════ */
  if (provider === 'replicate') {
    const replicateKey = process.env.REPLICATE_API_TOKEN
    if (!replicateKey) {
      return NextResponse.json({ status: 'failed', error: 'REPLICATE_API_TOKEN not configured' })
    }

    try {
      const res = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
        headers: { Authorization: `Token ${replicateKey}` },
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.warn(`[video/poll] Replicate poll ${res.status}: ${errText.slice(0, 120)}`)
        return NextResponse.json({
          status: 'generating',
          pct: 10,
          message: `Checking status (${res.status})…`,
        })
      }

      const data = await res.json()
      const mapped = replicateStatusToOurs(data.status, data.logs ?? '')

      if (mapped.status === 'completed') {
        // Output is an array of URLs (usually one video)
        const outputs: string[] = Array.isArray(data.output) ? data.output : []
        const videoUrl = outputs.find(u => typeof u === 'string' && u.length > 0) ?? null

        if (!videoUrl) {
          return NextResponse.json({
            status: 'failed',
            error: `Replicate succeeded but returned no video URL. Output: ${JSON.stringify(data.output).slice(0, 200)}`,
          })
        }

        // Proxy the video as base64 to avoid CORS issues in the browser
        try {
          const vidRes = await fetch(videoUrl, { signal: AbortSignal.timeout(20_000) })
          if (!vidRes.ok) {
            return NextResponse.json({ status: 'failed', error: `Video download failed: ${vidRes.status}` })
          }
          const buf = await vidRes.arrayBuffer()
          if (buf.byteLength < 500) {
            return NextResponse.json({ status: 'failed', error: 'Received empty video file — try again' })
          }
          const base64 = Buffer.from(buf).toString('base64')
          const ct     = vidRes.headers.get('content-type') || 'video/mp4'
          const mime   = ct.split(';')[0].trim()

          return NextResponse.json({
            status:    'completed',
            pct:       100,
            message:   'Done!',
            videoData: `data:${mime};base64,${base64}`,
          })
        } catch (dlErr: any) {
          console.error('[video/poll] Replicate video download threw:', dlErr.message)
          return NextResponse.json({ status: 'failed', error: `Could not download video: ${dlErr.message}` })
        }
      }

      if (mapped.status === 'failed') {
        return NextResponse.json({
          status: 'failed',
          error: data.error ?? 'Replicate generation failed — please try again',
        })
      }

      return NextResponse.json(mapped)
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return NextResponse.json({ status: 'generating', pct: 15, message: 'Waiting for Replicate response…' })
      }
      console.error('[video/poll] Replicate threw:', e.message)
      return NextResponse.json({ status: 'failed', error: `Poll error: ${e.message}` })
    }
  }

  /* ═══════════════════════════════════════════════
     FAL.AI
  ═══════════════════════════════════════════════ */
  if (provider === 'fal') {
    const falKey = process.env.FAL_KEY
    if (!falKey) {
      return NextResponse.json({ status: 'failed', error: 'FAL_KEY not configured' })
    }

    try {
      // fal uses a status endpoint; check both fast-animatediff and svd paths
      const statusRes = await fetch(
        `https://queue.fal.run/fal-ai/fast-animatediff/text-to-video/requests/${jobId}/status`,
        {
          headers: { Authorization: `Key ${falKey}` },
          signal: AbortSignal.timeout(10_000),
        },
      )

      if (!statusRes.ok) {
        return NextResponse.json({ status: 'generating', pct: 10, message: 'Checking fal status…' })
      }

      const statusData = await statusRes.json()
      const falStatus: string = statusData.status ?? 'IN_QUEUE'

      if (falStatus === 'IN_QUEUE') {
        const pos = statusData.queue_position ?? '?'
        return NextResponse.json({ status: 'queued', pct: 3, message: `fal queue position: ${pos}` })
      }
      if (falStatus === 'IN_PROGRESS') {
        return NextResponse.json({ status: 'generating', pct: 35, message: 'fal is generating your video…' })
      }
      if (falStatus === 'COMPLETED') {
        // Fetch the result
        const resultRes = await fetch(
          `https://queue.fal.run/fal-ai/fast-animatediff/text-to-video/requests/${jobId}`,
          { headers: { Authorization: `Key ${falKey}` }, signal: AbortSignal.timeout(10_000) },
        )
        if (!resultRes.ok) {
          return NextResponse.json({ status: 'failed', error: `fal result fetch failed: ${resultRes.status}` })
        }
        const result = await resultRes.json()
        const videoUrl: string | undefined =
          result.video?.url ?? result.video_url ?? result.output?.video?.url

        if (!videoUrl) {
          return NextResponse.json({
            status: 'failed',
            error: `fal returned no video URL: ${JSON.stringify(result).slice(0, 200)}`,
          })
        }

        // Proxy as base64
        const vidRes = await fetch(videoUrl, { signal: AbortSignal.timeout(20_000) })
        if (!vidRes.ok) {
          return NextResponse.json({ status: 'failed', error: `fal video download failed: ${vidRes.status}` })
        }
        const buf    = await vidRes.arrayBuffer()
        const base64 = Buffer.from(buf).toString('base64')
        const ct     = vidRes.headers.get('content-type') || 'video/mp4'
        const mime   = ct.split(';')[0].trim()

        return NextResponse.json({
          status:    'completed',
          pct:       100,
          message:   'Done!',
          videoData: `data:${mime};base64,${base64}`,
        })
      }

      return NextResponse.json({ status: 'failed', error: `fal status: ${falStatus}` })
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return NextResponse.json({ status: 'generating', pct: 15, message: 'Waiting for fal response…' })
      }
      console.error('[video/poll] fal threw:', e.message)
      return NextResponse.json({ status: 'failed', error: `fal poll error: ${e.message}` })
    }
  }

  return NextResponse.json({ status: 'failed', error: `Unknown provider: ${provider}` })
}
