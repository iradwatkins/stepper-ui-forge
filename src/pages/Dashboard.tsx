import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile sidebar */}
      <DashboardSidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        className="lg:hidden"
      />

      {/* Desktop sidebar */}
      <DashboardSidebar className="hidden lg:block" />

      {/* Main content */}
      <div className="lg:pl-80">
        {/* Header */}
        <DashboardHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </DashboardHeader>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}