'use client'

import { useSidebar } from '@/contexts/SidebarContext'
import SidebarHeader from './SidebarHeader'
import NavLinks from './NavLinks'
import ChatList from './ChatList'
import ProjectsList from './ProjectsList'
import UserMenu from './UserMenu'

export default function Sidebar() {
  const { isOpen } = useSidebar()

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`sidebar-transition flex flex-col h-full bg-sidebar shrink-0 overflow-hidden ${
          isOpen ? 'w-[260px]' : 'w-0'
        }`}
      >
        <SidebarHeader />

        {isOpen && (
          <>
            <NavLinks />
            <div className="h-px bg-border/50 mx-4 my-2" />
            <ProjectsList />
            <div className="h-px bg-border/50 mx-4 my-1" />
            <ChatList />
            <UserMenu />
          </>
        )}
      </aside>
    </>
  )
}
