'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  browserLocalPersistence,
  inMemoryPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously as firebaseSignInAnonymously,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase-client'

interface AuthContextType {
  user: FirebaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInAsGuest: () => Promise<void>
  signOut: () => Promise<void>
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)
const REDIRECT_FALLBACK_ERRORS = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
])

function prefersRedirectAuth() {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent || ''
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS/i.test(userAgent)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let unsubscribe = () => {}

    const bootstrapAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence)
      } catch {
        try {
          await setPersistence(auth, inMemoryPersistence)
        } catch {}
      }

      if (!mounted) return

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser)
        setLoading(false)
        if (firebaseUser) {
          try {
            const userRef = doc(db, 'users', firebaseUser.uid)
            const userSnap = await getDoc(userRef)
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                createdAt: new Date().toISOString(),
              })
            }
          } catch (err) {
            // Non-critical: Firestore user doc sync failed (e.g. permission rules)
            console.warn('Firestore user profile sync skipped:', err)
          }
        }
      })
    }

    bootstrapAuth()

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    if (prefersRedirectAuth()) {
      await signInWithRedirect(auth, provider)
      return
    }

    try {
      await signInWithPopup(auth, provider)
    } catch (err: any) {
      if (REDIRECT_FALLBACK_ERRORS.has(err?.code) || /popup|redirect/i.test(String(err?.message || ''))) {
        await signInWithRedirect(auth, provider)
        return
      }
      throw err
    }
  }

  const signInAsGuest = async () => {
    await firebaseSignInAnonymously(auth)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const getToken = async () => {
    if (!auth.currentUser) return null
    return auth.currentUser.getIdToken()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signInAsGuest, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
