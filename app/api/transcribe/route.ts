import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { audio, mimeType = 'audio/webm' } = await req.json()

    if (!audio) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }

    const googleKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_API_KEY_2 ||
      process.env.GOOGLE_API_KEY_3
    if (!googleKey) {
      return NextResponse.json({ error: 'No Google API key configured' }, { status: 503 })
    }

    // Use Gemini 2.5 Flash multimodal to transcribe audio
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: audio, // base64 encoded audio
                }
              },
              {
                text: 'Transcribe this audio exactly as spoken. Return ONLY the transcript text with no additional commentary, labels, or formatting. If the audio is silent or unclear, return an empty string.'
              }
            ]
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 500,
          }
        })
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('Gemini transcribe error:', err)
      return NextResponse.json({ error: 'Transcription failed', detail: err }, { status: 502 })
    }

    const data = await res.json()
    const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''

    return NextResponse.json({ transcript })
  } catch (err: any) {
    console.error('Transcribe route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
