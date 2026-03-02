import { NextRequest } from 'next/server'
import { streamChat } from '@/lib/ai-router'
import { verifyToken } from '@/lib/auth-helper'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages, model } = await req.json()

  // load system prompt
  const profileDoc = await adminDb.doc(`users/${user.uid}/profile/main`).get()
  const systemPrompt = profileDoc.exists
    ? profileDoc.data()?.systemPrompt || 'You are a helpful AI assistant.'
    : 'You are a helpful AI assistant.'

  // load user API keys
  const keyDoc = await adminDb.doc(`users/${user.uid}/private/apikeys`).get()
  const userKeys = keyDoc.exists ? keyDoc.data() || {} : {}

  const stream = await streamChat(messages, model, systemPrompt, userKeys)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}