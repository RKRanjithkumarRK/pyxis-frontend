import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt, size = '1024x1024' } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

  const [width, height] = size.split('x').map(Number)
  const seed = Math.floor(Math.random() * 999999)

  // Check if user has OpenAI key — use DALL-E 3 if available
  const keyDoc = await adminDb.doc(`users/${user.uid}/private/apikeys`).get()
  const userKeys = keyDoc.exists ? keyDoc.data() || {} : {}
  const openaiKey = userKeys.openai || process.env.OPENAI_API_KEY

  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size, response_format: 'url' }),
      })
      if (response.ok) {
        const data = await response.json()
        const url = data.data[0]?.url
        const revisedPrompt = data.data[0]?.revised_prompt || prompt
        if (url) {
          return NextResponse.json({ url, prompt: revisedPrompt, source: 'dalle3' })
        }
      }
    } catch {}
  }

  // Free fallback: return Pollinations URL directly — client loads the image
  // This avoids server-side proxy timeouts entirely
  const encoded = encodeURIComponent(prompt)
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`

  return NextResponse.json({ url, prompt, source: 'pollinations' })
}
