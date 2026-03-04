'use client'

import { useState } from 'react'

interface NotifRow {
  label: string
  description?: string
  options: string[]
  default: string
}

const rows: NotifRow[] = [
  { label: 'Responses', description: 'Get notified when Pyxis responds to requests that take time, like research or image generation.', options: ['Push', 'Email', 'Push, Email', 'Off'], default: 'Push' },
  { label: 'Group chats', description: "You'll receive notifications for new messages from group chats.", options: ['Push', 'Email', 'Push, Email', 'Off'], default: 'Push' },
  { label: 'Tasks', description: "Get notified when tasks you've created have updates.", options: ['Push', 'Email', 'Push, Email', 'Off'], default: 'Push, Email' },
  { label: 'Projects', description: 'Get notified when you receive an email invitation to a shared project.', options: ['Email', 'Off'], default: 'Email' },
  { label: 'Recommendations', description: 'Stay in the loop on new tools, tips, and features from Pyxis.', options: ['Push', 'Email', 'Push, Email', 'Off'], default: 'Push, Email' },
  { label: 'Usage', description: "We'll notify you when limits reset for features like image creation.", options: ['Push', 'Email', 'Push, Email', 'Off'], default: 'Push, Email' },
]

export default function NotificationSettings() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(rows.map(r => [r.label, r.default]))
  )

  return (
    <div className="space-y-1">
      {rows.map(row => (
        <div key={row.label}>
          <div className="flex items-center justify-between py-4">
            <div className="flex-1 mr-4">
              <span className="text-sm font-medium text-text-primary">{row.label}</span>
              {row.description && (
                <p className="text-xs text-text-tertiary mt-1">{row.description}</p>
              )}
            </div>
            <select
              value={values[row.label]}
              onChange={e => setValues(p => ({ ...p, [row.label]: e.target.value }))}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none cursor-pointer"
            >
              {row.options.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="h-px bg-border/50" />
        </div>
      ))}
    </div>
  )
}
