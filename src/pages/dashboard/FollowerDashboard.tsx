// Main Follower Dashboard Page
// Determines which dashboard view to show based on user permissions

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { TicketSellerDashboard } from "@/components/dashboard/TicketSellerDashboard"
import { TeamMemberDashboard } from "@/components/dashboard/TeamMemberDashboard"
import { CombinedFollowerDashboard } from "@/components/dashboard/CombinedFollowerDashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Users } from "lucide-react"
import { FollowerService } from "@/lib/services/FollowerService"

type DashboardType = 'none' | 'seller' | 'team' | 'combined'

export default function FollowerDashboardPage() {
  const { user, loading } = useAuth()
  const [dashboardType, setDashboardType] = useState<DashboardType>('none')
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      determineDashboardType()
    }
  }, [user])

  const determineDashboardType = async () => {
    if (!user) return

    setDashboardLoading(true)
    setError(null)

    try {
      // Check if user has any permissions
      const hasPermissions = await FollowerService.hasAnyPermissions(user.id)
      
      if (!hasPermissions) {
        setDashboardType('none')
        setDashboardLoading(false)
        return
      }

      // Get selling permissions to check what type of dashboard to show
      const sellingPermissions = await FollowerService.getUserSellingPermissions(user.id)
      const hasSellingPermissions = sellingPermissions.length > 0

      // TODO: Check for team permissions
      // For now, we'll use a simplified check
      const hasTeamPermissions = false // await checkTeamPermissions(user.id)

      if (hasSellingPermissions && hasTeamPermissions) {
        setDashboardType('combined')
      } else if (hasSellingPermissions) {
        setDashboardType('seller')
      } else if (hasTeamPermissions) {
        setDashboardType('team')
      } else {
        setDashboardType('none')
      }

    } catch (err) {
      console.error('Failed to determine dashboard type:', err)
      setError('Failed to load dashboard permissions')
    } finally {
      setDashboardLoading(false)
    }
  }

  if (loading || dashboardLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access your follower dashboard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const getDashboardTitle = () => {
    switch (dashboardType) {
      case 'seller':
        return 'Ticket Seller Dashboard'
      case 'team':
        return 'Team Member Dashboard'
      case 'combined':
        return 'My Dashboard'
      default:
        return 'Follower Dashboard'
    }
  }

  const getDashboardDescription = () => {
    switch (dashboardType) {
      case 'seller':
        return 'Manage your ticket sales, referral codes, and earnings'
      case 'team':
        return 'View your event assignments and team activities'
      case 'combined':
        return 'Manage your ticket sales and team activities'
      default:
        return 'Follow event organizers to access selling and team features'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{getDashboardTitle()}</h1>
        <p className="text-muted-foreground">{getDashboardDescription()}</p>
      </div>
      
      {dashboardType === 'none' && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to SteppersLife!</h2>
          <div className="max-w-md mx-auto space-y-4">
            <p className="text-gray-600">
              You're now part of our community! To start earning or working with events, 
              follow event organizers who can grant you special permissions.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">What you can do:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Follow event organizers you're interested in</li>
                <li>• Get promoted to sell tickets and earn commissions</li>
                <li>• Work events as a team member</li>
                <li>• Access exclusive organizer content</li>
              </ul>
            </div>

            <div className="pt-4">
              <button 
                onClick={() => window.location.href = '/events'}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Events
              </button>
            </div>
          </div>
        </div>
      )}

      {dashboardType === 'seller' && (
        <TicketSellerDashboard userId={user.id} />
      )}

      {dashboardType === 'team' && (
        <TeamMemberDashboard userId={user.id} />
      )}

      {dashboardType === 'combined' && (
        <CombinedFollowerDashboard userId={user.id} />
      )}
    </div>
  )
}