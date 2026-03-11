import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const FAL_MODEL = 'fal-ai/fast-animatediff/text-to-video'

/**
 * GET /api/video/status?jobId=xxx&provider=fal|replicate
 * Returns: { status: 'processing' | 'completed' | 'failed', url?, error? }
 */
export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jobId   = searchParams.get('jobId')
  const provider = searchParams.get('provider') || 'fal'

  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  /* ── fal.ai status ── */
  if (provider === 'fal') {
    const falKey = process.env.FAL_KEY
    if (!falKey) return NextResponse.json({ status: 'failed', error: 'fal.ai not configured' })

    try {
      // 1. Check status
      const statusRes = await fetch(
        `https://queue.fal.run/${FAL_MODEL}/requests/${jobId}/status`,
        { headers: { Authorization: `Key ${falKey}` }, signal: AbortSignal.timeout(10_000) }
      )

      if (!statusRes.ok) {
        console.warn('[video/fal status]', statusRes.status)
        return NextResponse.json({ status: 'processing' })
      }

      const statusData = await statusRes.json()
      const queueStatus: string = statusData.status ?? 'IN_QUEUE'

      if (queueStatus === 'FAILED') {
        return NextResponse.json({ status: 'failed', error: 'fal.ai generation failed. Please try again.' })
      }
      if (queueStatus !== 'COMPLETED') {
        return NextResponse.json({ status: 'processing' })
      }

      // 2. Fetch result
      const resultRes = await fetch(
        `https://queue.fal.run/${FAL_MODEL}/requests/${jobId}`,
        { headers: { Authorization: `Key ${falKey}` }, signal: AbortSignal.timeout(10_000) }
      )
      if (!resultRes.ok) return NextResponse.json({ status: 'processing' })

      const result = await resultRes.json()
      const videoUrl: string | undefined = result?.video?.url ?? result?.url
      if (!videoUrl) return NextResponse.json({ status: 'failed', error: 'No video URL in fal.ai result.' })

      return NextResponse.json({ status: 'completed', url: videoUrl })
    } catch (err: any) {
      console.error('[video/fal status] threw:', err.message)
      return NextResponse.json({ status: 'processing' })
    }
  }

  /* ── Replicate status ── */
  if (provider === 'replicate') {
    const replicateKey = process.env.REPLICATE_API_TOKEN
    if (!replicateKey) return NextResponse.json({ status: 'failed', error: 'Replicate not configured' })

    try {
      const res = await fetch(
        `https://api.replicate.com/v1/predictions/${jobId}`,
        {
          headers: { Authorization: `Token ${replicateKey}` },
          signal: AbortSignal.timeout(10_000),
        }
      )
      if (!res.ok) {
        console.warn('[video/replicate status]', res.status)
        return NextResponse.json({ status: 'processing' })
      }

      const data = await res.json()
      const repStatus: string = data.status // 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'

      if (repStatus === 'succeeded') {
        // Replicate returns output as array of URLs or single URL
        const url: string | undefined = Array.isArray(data.output) ? data.output[0] : data.output
        if (!url) return NextResponse.json({ status: 'failed', error: 'No video URL in Replicate result.' })
        return NextResponse.json({ status: 'completed', url })
      }

      if (repStatus === 'failed' || repStatus === 'canceled') {
        const errMsg = data.error || 'Replicate generation failed. Please try again.'
        return NextResponse.json({ status: 'failed', error: errMsg })
      }

      // starting | processing
      return NextResponse.json({ status: 'processing' })
    } catch (err: any) {
      console.error('[video/replicate status] threw:', err.message)
      return NextResponse.json({ status: 'processing' })
    }
  }

  return NextResponse.json({ status: 'failed', error: 'Unknown provider' })
}
