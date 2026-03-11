import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/video
 * Submits a job to the fal.ai queue and immediately returns a jobId.
 * The client then polls /api/video/status?jobId=xxx to get the result.
 * This avoids Vercel's 60s serverless function timeout entirely.
 */
export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

  const falKey = process.env.FAL_KEY
  if (!falKey) {
    return NextResponse.json({ error: 'Video generation is not configured.' }, { status: 503 })
  }

  try {
    const res = await fetch(
      'https://queue.fal.run/fal-ai/fast-animatediff/text-to-video',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${falKey}`,
        },
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

    if (!res.ok) {
      const err = await res.text()
      console.error('[video] queue submit error:', res.status, err.slice(0, 300))
      return NextResponse.json({ error: 'Failed to submit video job. Please try again.' }, { status: 502 })
    }

    const data = await res.json()
    const jobId: string | undefined = data.request_id
    if (!jobId) {
      console.error('[video] no request_id:', JSON.stringify(data).slice(0, 200))
      return NextResponse.json({ error: 'No job ID returned. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ jobId, status: 'queued' })
  } catch (err: any) {
    console.error('[video] submit threw:', err.message)
    return NextResponse.json({ error: 'Could not reach video service. Please try again.' }, { status: 503 })
  }
}
