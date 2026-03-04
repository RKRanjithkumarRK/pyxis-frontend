'use client'

import { ChevronRight } from 'lucide-react'
import Toggle from '@/components/ui/Toggle'
import { useState } from 'react'

export default function SecuritySettings() {
  const [authenticator, setAuthenticator] = useState(false)
  const [pushNotif, setPushNotif] = useState(false)
  const [textMsg, setTextMsg] = useState(false)

  return (
    <div className="space-y-1">
      {/* Passkeys */}
      <div className="flex items-center justify-between py-4">
        <div>
          <span className="text-sm font-medium text-text-primary">Passkeys</span>
          <p className="text-xs text-text-tertiary mt-0.5">Passkeys are secure and protect your account with multi-factor authentication.</p>
        </div>
        <button className="flex items-center gap-1 text-sm text-text-primary hover:text-accent transition-colors">
          Add <ChevronRight size={14} />
        </button>
      </div>

      <div className="h-px bg-border" />

      {/* MFA */}
      <div className="py-4">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Multi-factor authentication (MFA)</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-text-primary">Authenticator app</span>
              <p className="text-xs text-text-tertiary mt-0.5">Use one-time codes from an authenticator app.</p>
            </div>
            <Toggle checked={authenticator} onChange={setAuthenticator} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-text-primary">Push notifications</span>
              <p className="text-xs text-text-tertiary mt-0.5">Approve log-ins with a push sent to your trusted device</p>
            </div>
            <Toggle checked={pushNotif} onChange={setPushNotif} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-text-primary">Text message</span>
              <p className="text-xs text-text-tertiary mt-0.5">Get 6-digit verification codes by SMS or WhatsApp</p>
            </div>
            <Toggle checked={textMsg} onChange={setTextMsg} />
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Log out */}
      <div className="flex items-center justify-between py-4">
        <span className="text-sm text-text-primary">Log out of this device</span>
        <button className="px-4 py-1.5 rounded-lg border border-border text-sm text-text-primary hover:bg-surface-hover transition-colors">
          Log out
        </button>
      </div>

      <div className="h-px bg-border" />

      <div className="flex items-center justify-between py-4">
        <div>
          <span className="text-sm text-text-primary">Log out of all devices</span>
          <p className="text-xs text-text-tertiary mt-0.5">Log out of all active sessions across all devices.</p>
        </div>
        <button className="px-4 py-1.5 rounded-lg border border-danger text-sm text-danger hover:bg-danger/10 transition-colors">
          Log out all
        </button>
      </div>
    </div>
  )
}
