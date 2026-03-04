'use client'

import { Plus, HelpCircle } from 'lucide-react'

export default function ParentalControls() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-medium text-text-primary">Parental controls</h3>
        <HelpCircle size={14} className="text-text-tertiary" />
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Parents and teens can link accounts, giving parents tools to adjust certain features, set limits, and add safeguards that work for their family.
      </p>
      <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-text-primary hover:bg-surface-hover transition-colors">
        <Plus size={16} />
        Add family member
      </button>
    </div>
  )
}
