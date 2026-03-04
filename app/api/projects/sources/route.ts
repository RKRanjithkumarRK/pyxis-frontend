import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

// GET /api/projects/sources?projectId=xxx
export async function GET(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const snap = await adminDb
    .collection(`users/${user.uid}/projects/${projectId}/sources`)
    .orderBy('createdAt', 'desc')
    .get()

  const sources = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ sources })
}

// POST /api/projects/sources
// body: { projectId, type, content, label }
export async function POST(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, type, content, label } = await request.json()
  if (!projectId || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const ref = await adminDb.collection(`users/${user.uid}/projects/${projectId}/sources`).add({
    type: type || 'text',
    content,
    label: label || content.slice(0, 40),
    createdAt: new Date().toISOString(),
  })

  return NextResponse.json({ id: ref.id })
}

// DELETE /api/projects/sources?projectId=xxx&sourceId=yyy
export async function DELETE(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId')
  const sourceId = url.searchParams.get('sourceId')

  if (!projectId || !sourceId) return NextResponse.json({ error: 'Missing projectId or sourceId' }, { status: 400 })

  await adminDb.doc(`users/${user.uid}/projects/${projectId}/sources/${sourceId}`).delete()
  return NextResponse.json({ success: true })
}
