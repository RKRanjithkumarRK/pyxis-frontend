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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <div
        className="flex h-[min(92dvh,780px)] w-full max-w-[960px] flex-col overflow-hidden rounded-[28px] border border-border/50 bg-sidebar shadow-2xl sm:h-[80vh] sm:max-h-[680px] sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="flex w-full shrink-0 flex-col border-b border-border/50 py-3 sm:w-[220px] sm:border-b-0 sm:border-r sm:py-4">
          <div className="mb-2 flex items-center justify-between px-4">
            <p className="text-sm font-semibold text-text-primary sm:hidden">Settings</p>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 max-sm:grid max-sm:grid-cols-2 max-sm:gap-1 sm:space-y-0.5">
            {tabs.map((tab) => {
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

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border/50 px-5 py-4 sm:px-6 sm:py-5">
            <h2 className="text-lg font-semibold text-text-primary">{tabTitle}</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
