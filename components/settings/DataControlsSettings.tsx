'use client'

import { useState } from 'react'
import Toggle from '@/components/ui/Toggle'

export default function DataControlsSettings() {
  const [improveModel, setImproveModel] = useState(false)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between py-4">
        <div>
          <span className="text-sm text-text-primary">Improve the model for everyone</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">{improveModel ? 'On' : 'Off'}</span>
          <Toggle checked={improveModel} onChange={setImproveModel} />
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="flex items-center justify-between py-4">
        <span className="text-sm text-text-primary">Shared links</span>
        <button className="px-4 py-1.5 rounded-lg border border-border text-sm text-text-primary hover:bg-surface-hover transition-colors">
          Manage
        </button>
      </div>

      <div className="h-px bg-border" />

      <div className="flex items-center justify-between py-4">
        <span className="text-sm text-text-primary">Archived chats</span>
        <button className="px-4 py-1.5 rounded-lg border border-border text-sm text-text-primary hover:bg-surface-hover transition-colors">
          Manage
        </button>
      </div>

      <div className="h-px bg-border" />

      <div className="flex items-center justify-between py-4">
        <span className="text-sm text-text-primary">Archive all chats</span>
        <button className="px-4 py-1.5 rounded-lg border border-border text-sm text-text-primary hover:bg-surface-hover transition-colors">
          Archive all
        </button>
      </div>

      <div className="h-px bg-border" />

      <div className="flex items-center justify-between py-4">
        <span className="text-sm text-text-primary">Delete all chats</span>
        <button className="px-4 py-1.5 rounded-lg border border-danger text-sm text-danger hover:bg-danger/10 transition-colors">
          Delete all
        </button>
      </div>

      <div className="h-px bg-border" />

      <div className="flex items-center justify-between py-4">
        <span className="text-sm text-text-primary">Export data</span>
        <button className="px-4 py-1.5 rounded-lg border border-border text-sm text-text-primary hover:bg-surface-hover transition-colors">
          Export
        </button>
      </div>
    </div>
  )
}
