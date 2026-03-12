'use client'

import SettingsModal from '@/components/settings/SettingsModal'
import { useSidebar } from '@/contexts/SidebarContext'
import ChatList from './ChatList'
import NavLinks from './NavLinks'
import ProjectsList from './ProjectsList'
import SidebarHeader from './SidebarHeader'
import UserMenu from './UserMenu'

export default function Sidebar() {
  const { isOpen, toggle, settingsOpen, setSettingsOpen } = useSidebar()

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={toggle}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar-transition flex flex-col overflow-hidden ${
          isOpen
            ? 'w-[304px] max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:h-full'
            : 'w-0'
        } md:relative md:shrink-0 md:h-full`}
      >
        <div className="h-full p-3 md:p-4">
          <div className="panel relative flex h-full flex-col overflow-hidden rounded-[30px] border border-border/80">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(97,211,255,0.08),transparent_35%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.08),transparent_38%)]" />
            <div className="relative flex h-full flex-col">
              <SidebarHeader />

              {isOpen && (
                <>
                  <div className="px-4 pb-3">
                    <div className="rounded-[20px] border border-border/80 bg-white/5 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-text-tertiary">Workspace status</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">Operational</p>
                          <p className="text-xs text-text-tertiary">Control plane online</p>
                        </div>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.65)]" />
                      </div>
                    </div>
                  </div>

                  <div className="relative flex-1 overflow-y-auto px-2 pb-2">
                    <NavLinks />
                    <div className="mx-3 my-3 h-px bg-border/60" />
                    <ProjectsList />
                    <div className="mx-3 my-2 h-px bg-border/60" />
                    <ChatList />
                  </div>

                  <div className="relative border-t border-border/60">
                    <UserMenu />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
