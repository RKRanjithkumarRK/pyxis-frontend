import { adminAuth } from './firebase-admin'
import { NextRequest } from 'next/server'

export async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('[auth] No Bearer token in Authorization header')
    return null
  }
  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(token)
    return decoded
  } catch (err: any) {
    console.error('[auth] verifyIdToken failed:', err?.code, err?.message?.slice(0, 200))
    return null
  }
}
