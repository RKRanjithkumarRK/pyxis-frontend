import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { adminAuth } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const uid = `guest_${randomUUID()}`
    const token = await adminAuth.createCustomToken(uid, { guest: true })
    return NextResponse.json({ token })
  } catch (err: any) {
    console.error('[guest] createCustomToken failed:', err?.message?.slice(0, 200))
    return NextResponse.json({ error: 'Guest session unavailable' }, { status: 500 })
  }
}
