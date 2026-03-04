import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const section = new URL(request.url).searchParams.get('section')

  if (section) {
    const doc = await adminDb.doc(`users/${user.uid}/settings/${section}`).get()
    return NextResponse.json(doc.exists ? doc.data() : {})
  }

  const doc = await adminDb.doc(`users/${user.uid}`).get()
  return NextResponse.json(doc.exists ? doc.data() : {})
}

export async function POST(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { section, ...data } = await request.json()

  if (section) {
    await adminDb.doc(`users/${user.uid}/settings/${section}`).set(data, { merge: true })
  } else {
    await adminDb.doc(`users/${user.uid}`).set(data, { merge: true })
  }

  return NextResponse.json({ success: true })
}
