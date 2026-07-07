import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  return (
    <div className="min-h-screen flex bg-canvas">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 p-7 overflow-y-auto">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24">
                <Icon
                  name="loader-circle"
                  size={26}
                  className="animate-spin text-navy-600"
                />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
