import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebarCollapsed')
    return stored ? JSON.parse(stored) : false
  })

  // Listen for sidebar collapse changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('sidebarCollapsed')
      setSidebarCollapsed(stored ? JSON.parse(stored) : false)
    }

    window.addEventListener('storage', handleStorageChange)
    // Also listen for custom event for same-window updates
    window.addEventListener('sidebarCollapsedChanged', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('sidebarCollapsedChanged', handleStorageChange)
    }
  }, [])

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
      <div className={`relative transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-80'}`}>
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