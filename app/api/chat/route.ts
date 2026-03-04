import { NextRequest } from 'next/server'
import { streamChat } from '@/lib/openrouter'
import { verifyToken } from '@/lib/auth-helper'
import { adminDb } from '@/lib/firebase-admin'
import { getModel } from '@/lib/models'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages, model } = await req.json()

  const [profileSnap, keySnap] = await Promise.all([
    adminDb.doc(`users/${user.uid}/settings/personalization`).get(),
    adminDb.doc(`users/${user.uid}/private/apikeys`).get(),
  ])

  const customInstructions = profileSnap.exists ? profileSnap.data()?.customInstructions || '' : ''
  const systemPrompt = customInstructions || 'You are Pyxis, a helpful AI assistant. Be concise and clear.'

  const userKeys = keySnap.exists ? keySnap.data() || {} : {}
  const apiKey = userKeys.openrouter || process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'No OpenRouter API key configured. Add one in Settings → Account → API Keys.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const modelDef = getModel(model)
  const maxTokens = modelDef?.maxTokens ?? 2048

  try {
    const stream = await streamChat(messages, model, apiKey, systemPrompt, maxTokens)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
