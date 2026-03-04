import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const snap = await adminDb
    .collection(`users/${user.uid}/projects`)
    .orderBy('updatedAt', 'desc')
    .get()

  const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ projects })
}

export async function POST(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  const now = new Date().toISOString()

  const ref = await adminDb.collection(`users/${user.uid}/projects`).add({
    name: name || 'New Project',
    createdAt: now,
    updatedAt: now,
  })

  return NextResponse.json({ id: ref.id })
}

export async function PATCH(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, name } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await adminDb.doc(`users/${user.uid}/projects/${id}`).update({
    name: name || 'Untitled Project',
    updatedAt: new Date().toISOString(),
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await adminDb.doc(`users/${user.uid}/projects/${id}`).delete()
  return NextResponse.json({ success: true })
}
