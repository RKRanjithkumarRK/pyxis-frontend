'use client'

import { useState, useEffect } from 'react'
import { X, Settings, Palette, Database, Shield, User } from 'lucide-react'
import { SettingsTab } from '@/types'
import GeneralSettings from './GeneralSettings'
import PersonalizationSettings from './PersonalizationSettings'
import DataControlsSettings from './DataControlsSettings'
import SecuritySettings from './SecuritySettings'
import AccountSettings from './AccountSettings'

const tabs: { id: SettingsTab; label: string; icon: any }[] = [
  { id: 'general',         label: 'General',         icon: Settings },
  { id: 'personalization', label: 'Personalization', icon: Palette  },
  { id: 'data',            label: 'Data controls',   icon: Database },
  { id: 'security',        label: 'Security',        icon: Shield   },
  { id: 'account',         label: 'Account',         icon: User     },
]

interface Props {
  onClose: () => void
}

export default function SettingsModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const renderContent = () => {
    switch (activeTab) {
      case 'general':         return <GeneralSettings />
      case 'personalization': return <PersonalizationSettings />
      case 'data':            return <DataControlsSettings />
      case 'security':        return <SecuritySettings />
      case 'account':         return <AccountSettings />
    }
  }

  const tabTitle = tabs.find(t => t.id === activeTab)?.label || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-sidebar rounded-2xl shadow-2xl w-full max-w-[700px] h-[80vh] max-h-[600px] flex overflow-hidden border border-border/50"
        onClick={e => e.stopPropagation()}
      >
        {/* Left nav */}
        <nav className="w-[200px] shrink-0 flex flex-col py-4 border-r border-border/50">
          <div className="flex items-center justify-between px-4 mb-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-surface-hover text-text-primary font-medium'
                      : 'text-text-secondary hover:bg-surface-hover/50 hover:text-text-primary'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Right content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-6 py-5 border-b border-border/50">
            <h2 className="text-lg font-semibold text-text-primary">{tabTitle}</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
