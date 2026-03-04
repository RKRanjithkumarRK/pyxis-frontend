'use client'

import { ChevronRight, Plus } from 'lucide-react'

export default function AppsSettings() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Enabled apps</h3>
          <p className="text-xs text-text-tertiary mt-0.5">Manage enabled apps Pyxis can use in your chats.</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-text-primary hover:bg-surface-hover transition-colors">
          <Plus size={14} />
          Add more
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-text-tertiary py-8 text-center">No apps connected yet.</p>
      </div>
    </div>
  )
}
