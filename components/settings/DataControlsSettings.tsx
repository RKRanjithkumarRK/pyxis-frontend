'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function DataControlsSettings() {
  const { getToken } = useAuth()
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAll = async () => {
    if (!confirm('Delete all chats? This cannot be undone.')) return
    setDeleting(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/conversations', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('All chats deleted')
      window.location.reload()
    } catch {
      toast.error('Failed to delete chats')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between py-4">
        <div>
          <span className="text-sm font-medium text-text-primary">Delete all chats</span>
          <p className="text-xs text-text-tertiary mt-0.5">Permanently delete all your conversations. This cannot be undone.</p>
        </div>
        <button
          onClick={handleDeleteAll}
          disabled={deleting}
          className="px-4 py-1.5 rounded-lg border border-danger text-sm text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete all'}
        </button>
      </div>
    </div>
  )
}
