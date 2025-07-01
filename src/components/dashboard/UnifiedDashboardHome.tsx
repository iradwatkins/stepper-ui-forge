import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminPermissions } from '@/lib/hooks/useAdminPermissions'
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar,
  Users,
  DollarSign,
  ShoppingCart,
  QrCode,
  TrendingUp,
  Plus,
  Heart,
  Monitor,
  Activity,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface DashboardStats {
  totalEarnings?: number
  totalSales?: number
  eventsWorked?: number
  ticketsScanned?: number
  totalEvents?: number
  totalFollowers?: number
  totalRevenue?: number
  activeReferralCodes?: number
  upcomingEvents?: number
  totalUsers?: number
  platformRevenue?: number
  activeEvents?: number
  systemHealth?: number
}

interface ActivityItem {
  id: string
  type: 'sale' | 'checkin' | 'follow' | 'event' | 'user_signup' | 'system'
  description: string
  amount?: number
  timestamp: string
  icon?: React.ComponentType<{ className?: string }>
}

export default function UnifiedDashboardHome() {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin } = useAdminPermissions()
  const { 
    canSellTickets, 
    canWorkEvents, 
    isEventOwner,
    loading: permissionsLoading 
  } = useUserPermissions()

  const [stats, setStats] = useState<DashboardStats>({})
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && !permissionsLoading) {
      loadDashboardData()
    }
  }, [user, permissionsLoading, isAdmin, canSellTickets, canWorkEvents, isEventOwner])

  const loadDashboardData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Load mock data based on user role
      const mockStats: DashboardStats = {
        // Regular user stats
        totalEarnings: canSellTickets ? 245.50 : undefined,
        totalSales: canSellTickets ? 23 : undefined,
        eventsWorked: canWorkEvents ? 5 : undefined,
        ticketsScanned: canWorkEvents ? 127 : undefined,
        
        // Organizer stats
        totalEvents: isEventOwner ? 3 : undefined,
        totalFollowers: isEventOwner ? 45 : undefined,
        totalRevenue: isEventOwner ? 2150.00 : undefined,
        
        // Admin stats
        totalUsers: isAdmin ? 1234 : undefined,
        platformRevenue: isAdmin ? 89012 : undefined,
        activeEvents: isAdmin ? 45 : undefined,
        systemHealth: isAdmin ? 98 : undefined,
        
        // Common stats
        activeReferralCodes: 2,
        upcomingEvents: 1
      }

      const mockActivity: ActivityItem[] = []
      
      if (canSellTickets) {
        mockActivity.push({
          id: '1',
          type: 'sale',
          description: 'Ticket sale commission earned',
          amount: 15.50,
          timestamp: '2 hours ago',
          icon: DollarSign
        })
      }
      
      if (canWorkEvents) {
        mockActivity.push({
          id: '2',
          type: 'checkin',
          description: 'Scanned tickets at Summer Festival',
          timestamp: 'Yesterday',
          icon: QrCode
        })
      }
      
      if (isEventOwner) {
        mockActivity.push({
          id: '3',
          type: 'follow',
          description: 'New follower: Sarah Johnson',
          timestamp: '2 days ago',
          icon: Heart
        })
      }
      
      if (isAdmin) {
        mockActivity.push({
          id: '4',
          type: 'user_signup',
          description: '12 new users registered today',
          timestamp: '1 hour ago',
          icon: Users
        })
        mockActivity.push({
          id: '5',
          type: 'system',
          description: 'System backup completed successfully',
          timestamp: '3 hours ago',
          icon: CheckCircle
        })
      }

      setStats(mockStats)
      setRecentActivity(mockActivity)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || permissionsLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Determine user type for personalized greeting
  const getUserGreeting = () => {
    if (isAdmin) return "Admin Dashboard"
    if (isEventOwner) return "Event Organizer Dashboard"
    if (canSellTickets && canWorkEvents) return "Seller & Team Member Dashboard"
    if (canSellTickets) return "Ticket Seller Dashboard"
    if (canWorkEvents) return "Team Member Dashboard"
    return "Welcome to SteppersLife"
  }

  const getUserSubtitle = () => {
    if (isAdmin) return "Platform administration and system monitoring"
    if (isEventOwner) return "Manage your events, followers, and analytics"
    if (canSellTickets && canWorkEvents) return "Sell tickets and work events"
    if (canSellTickets) return "Track your sales and earnings"
    if (canWorkEvents) return "Manage your event assignments"
    return "Follow organizers to unlock selling and team features"
  }

  // Build stats cards based on user role
  const getStatsCards = () => {
    const cards = []

    // Admin stats
    if (isAdmin) {
      cards.push(
        <Card key="total-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>,
        <Card key="platform-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.platformRevenue?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>,
        <Card key="active-events">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEvents}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>,
        <Card key="system-health">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.systemHealth}%</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      )
    }

    // Organizer stats
    if (isEventOwner) {
      cards.push(
        <Card key="my-events">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">${stats.totalRevenue?.toFixed(0)} total revenue</p>
          </CardContent>
        </Card>,
        <Card key="followers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFollowers}</div>
            <p className="text-xs text-muted-foreground">+3 this week</p>
          </CardContent>
        </Card>
      )
    }

    // Seller stats
    if (canSellTickets) {
      cards.push(
        <Card key="earnings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings?.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">+$15.50 from last month</p>
          </CardContent>
        </Card>,
        <Card key="sales">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">Via {stats.activeReferralCodes} referral codes</p>
          </CardContent>
        </Card>
      )
    }

    // Team member stats
    if (canWorkEvents) {
      cards.push(
        <Card key="events-worked">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Worked</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.eventsWorked}</div>
            <p className="text-xs text-muted-foreground">{stats.upcomingEvents} upcoming</p>
          </CardContent>
        </Card>,
        <Card key="tickets-scanned">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Scanned</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ticketsScanned}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      )
    }

    // Default cards for new users
    if (!canSellTickets && !canWorkEvents && !isEventOwner && !isAdmin) {
      cards.push(
        <Card key="events-attended">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Attended</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Start by browsing events</p>
          </CardContent>
        </Card>,
        <Card key="following">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Following</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Follow organizers to get promoted</p>
          </CardContent>
        </Card>
      )
    }

    return cards
  }

  // Build quick actions based on user role
  const getQuickActions = () => {
    const actions = []

    // Common actions
    actions.push(
      <Button key="browse-events" variant="outline" className="h-20 flex-col gap-2">
        <Calendar className="h-6 w-6" />
        <span className="text-sm">Browse Events</span>
      </Button>
    )

    // Create Event available to all users
    actions.push(
      <Button key="create-event" className="h-20 flex-col gap-2" asChild>
        <Link to="/create-event">
          <Plus className="h-6 w-6" />
          <span className="text-sm">Create Event</span>
        </Link>
      </Button>
    )

    if (canSellTickets) {
      actions.push(
        <Button key="generate-code" variant="outline" className="h-20 flex-col gap-2">
          <DollarSign className="h-6 w-6" />
          <span className="text-sm">Generate Code</span>
        </Button>
      )
    }

    if (canWorkEvents) {
      actions.push(
        <Button key="scan-tickets" variant="outline" className="h-20 flex-col gap-2">
          <QrCode className="h-6 w-6" />
          <span className="text-sm">Scan Tickets</span>
        </Button>
      )
    }

    if (isEventOwner) {
      actions.push(
        <Button key="manage-followers" variant="outline" className="h-20 flex-col gap-2">
          <Users className="h-6 w-6" />
          <span className="text-sm">Manage Followers</span>
        </Button>
      )
    }

    if (isAdmin) {
      actions.push(
        <Button key="user-management" variant="outline" className="h-20 flex-col gap-2">
          <Users className="h-6 w-6" />
          <span className="text-sm">User Management</span>
        </Button>,
        <Button key="system-monitor" variant="outline" className="h-20 flex-col gap-2">
          <Monitor className="h-6 w-6" />
          <span className="text-sm">System Monitor</span>
        </Button>
      )
    }

    return actions
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{getUserGreeting()}</h1>
        <p className="text-muted-foreground">{getUserSubtitle()}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {getStatsCards()}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No recent activity</p>
                <p className="text-sm">Activity will appear here as you use the platform</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-background">
                        {activity.icon && <activity.icon className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                    </div>
                    {activity.amount && (
                      <div className="text-green-600 font-medium">
                        +${activity.amount.toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {getQuickActions()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome message for new users */}
      {!canSellTickets && !canWorkEvents && !isEventOwner && !isAdmin && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Welcome to SteppersLife! 🎉</CardTitle>
            <CardDescription>
              Get started by exploring events and following organizers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium mb-1">Browse Events</h3>
                <p className="text-sm text-muted-foreground">Discover amazing events in your area</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium mb-1">Follow Organizers</h3>
                <p className="text-sm text-muted-foreground">Get updates and unlock selling opportunities</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium mb-1">Start Earning</h3>
                <p className="text-sm text-muted-foreground">Get promoted to sell tickets and earn commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}