import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
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
            className="lg:hidden hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </DashboardHeader>

        {/* Page content */}
        <main className="p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}