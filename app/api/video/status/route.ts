import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MODEL = 'fal-ai/fast-animatediff/text-to-video'

/**
 * GET /api/video/status?jobId=xxx
 * Checks the fal.ai queue status for a submitted job.
 * Returns: { status: 'processing' | 'completed' | 'failed', url?, error? }
 */
export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  try {
    /* ── Check status ── */
    const statusRes = await fetch(
      `https://queue.fal.run/${MODEL}/requests/${jobId}`,
      {
        headers: { Authorization: `Key ${falKey}` },
        signal: AbortSignal.timeout(10_000),
      }
    )

    if (!statusRes.ok) {
      // Don't error out — treat as still processing
      console.warn('[video/status] status check failed:', statusRes.status)
      return NextResponse.json({ status: 'processing' })
    }

    const statusData = await statusRes.json()
    const queueStatus: string = statusData.status ?? 'IN_QUEUE'

    if (queueStatus === 'FAILED') {
      return NextResponse.json({ status: 'failed', error: 'Video generation failed on the server. Please try again.' })
    }

    if (queueStatus !== 'COMPLETED') {
      // IN_QUEUE or IN_PROGRESS
      return NextResponse.json({ status: 'processing' })
    }

    /* ── Fetch the result ── */
    const resultRes = await fetch(
      `https://queue.fal.run/${MODEL}/requests/${jobId}/result`,
      {
        headers: { Authorization: `Key ${falKey}` },
        signal: AbortSignal.timeout(10_000),
      }
    )

    if (!resultRes.ok) {
      console.warn('[video/status] result fetch failed:', resultRes.status)
      return NextResponse.json({ status: 'processing' })
    }

    const result = await resultRes.json()
    const videoUrl: string | undefined = result?.video?.url ?? result?.url

    if (!videoUrl) {
      console.error('[video/status] no url in result:', JSON.stringify(result).slice(0, 300))
      return NextResponse.json({ status: 'failed', error: 'No video URL in result. Please try again.' })
    }

    return NextResponse.json({ status: 'completed', url: videoUrl })
  } catch (err: any) {
    console.error('[video/status] threw:', err.message)
    return NextResponse.json({ status: 'processing' })
  }
}
