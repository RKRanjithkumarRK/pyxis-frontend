import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = new URL(request.url).searchParams.get('q')
  if (!query) return NextResponse.json({ results: [] })

  const lowerQuery = query.toLowerCase()

  // Search conversation titles
  const snap = await adminDb
    .collection(`users/${user.uid}/conversations`)
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get()

  const results = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((c: any) => c.title?.toLowerCase().includes(lowerQuery))
    .slice(0, 20)

  return NextResponse.json({ results })
}
