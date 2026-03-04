import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conversationId = new URL(request.url).searchParams.get('conversationId')
  if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })

  const snap = await adminDb
    .collection(`users/${user.uid}/conversations/${conversationId}/messages`)
    .orderBy('createdAt', 'asc')
    .get()

  const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ messages })
}

export async function POST(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, role, content, imageUrl } = await request.json()
  if (!conversationId || !role || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const ref = await adminDb
    .collection(`users/${user.uid}/conversations/${conversationId}/messages`)
    .add({
      role,
      content,
      ...(imageUrl ? { imageUrl } : {}),
      createdAt: new Date().toISOString(),
    })

  // Update conversation
  const convRef = adminDb.doc(`users/${user.uid}/conversations/${conversationId}`)
  const conv = await convRef.get()
  const data = conv.data()

  // Auto-title from first user message
  if (role === 'user' && data?.title === 'New Chat') {
    await convRef.update({ title: content.slice(0, 60), updatedAt: new Date().toISOString() })
  } else {
    await convRef.update({ updatedAt: new Date().toISOString() })
  }

  return NextResponse.json({ id: ref.id })
}
