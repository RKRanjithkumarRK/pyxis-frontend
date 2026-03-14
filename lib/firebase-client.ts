import { FirebaseApp, getApps, initializeApp } from 'firebase/app'
import { Auth, getAuth } from 'firebase/auth'
import { Firestore, getFirestore, initializeFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const firebaseEnabled = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.trim().length > 0
)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

const forceLongPolling =
  (process.env.NEXT_PUBLIC_FIREBASE_FORCE_LONG_POLLING || '').toLowerCase() === 'true'

if (typeof window !== 'undefined' && firebaseEnabled) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  auth = getAuth(app)
  db = forceLongPolling
    ? initializeFirestore(app, { experimentalForceLongPolling: true })
    : getFirestore(app)
}

export { app, auth, db }
export default app
