'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function SecuritySettings() {
  const { signOut } = useAuth()

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between py-4">
        <div>
          <span className="text-sm font-medium text-text-primary">Log out of this device</span>
          <p className="text-xs text-text-tertiary mt-0.5">Sign out of your current session.</p>
        </div>
        <button
          onClick={signOut}
          className="px-4 py-1.5 rounded-lg border border-border text-sm text-text-primary hover:bg-surface-hover transition-colors"
        >
          Log out
        </button>
      </div>

      <div className="h-px bg-border" />

      <div className="flex items-center justify-between py-4">
        <div>
          <span className="text-sm font-medium text-text-primary">Log out of all devices</span>
          <p className="text-xs text-text-tertiary mt-0.5">Signs you out everywhere. You will need to log in again.</p>
        </div>
        <button
          onClick={signOut}
          className="px-4 py-1.5 rounded-lg border border-danger text-sm text-danger hover:bg-danger/10 transition-colors"
        >
          Log out all
        </button>
      </div>
    </div>
  )
}
