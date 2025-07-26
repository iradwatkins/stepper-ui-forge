import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminPermissions } from '@/lib/hooks/useAdminPermissions'
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import { EventsService } from '@/lib/events-db'
import { CommissionService } from '@/lib/services/CommissionService'
import { PayoutService } from '@/lib/services/PayoutService'
import { ReferralService } from '@/lib/services/ReferralService'
import { FollowerService } from '@/lib/services/FollowerService'
import { supabase } from '@/lib/supabase'
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
  Monitor,
  Activity,
  AlertCircle
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
      // Initialize stats object
      const realStats: DashboardStats = {}
      const realActivity: ActivityItem[] = []

      // Load data based on user role
      if (canSellTickets) {
        // Get real commission data
        const commissionSummary = await CommissionService.getFollowerCommissionSummary(user.id)
        const earnings = await CommissionService.getFollowerEarnings(user.id)
        realStats.totalEarnings = commissionSummary.total_earnings || 0
        realStats.totalSales = commissionSummary.total_sales || 0
        
        // Add recent commission activity
        if (earnings.length > 0) {
          const recentEarning = earnings[0]
          realActivity.push({
            id: recentEarning.id,
            type: 'sale',
            description: `Commission earned from ticket sale`,
            amount: recentEarning.commission_amount,
            timestamp: new Date(recentEarning.created_at).toLocaleDateString(),
            icon: DollarSign
          })
        }
      }

      if (isEventOwner) {
        // Get real event data for organizer
        const userEvents = await EventsService.getUserEvents(user.id)
        realStats.totalEvents = userEvents.length
        realStats.totalRevenue = userEvents.reduce((sum, event) => sum + (event.total_revenue || 0), 0)
        
        // Only get follower count if system is available
        if (FollowerService.isFollowerSystemAvailable()) {
          realStats.totalFollowers = await FollowerService.getFollowerCount(user.id)
        } else {
          realStats.totalFollowers = 0
        }
        
        // Add recent event activity
        if (userEvents.length > 0) {
          const recentEvent = userEvents.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
          realActivity.push({
            id: recentEvent.id,
            type: 'event',
            description: `Created event: ${recentEvent.title}`,
            timestamp: new Date(recentEvent.created_at).toLocaleDateString(),
            icon: Calendar
          })
        }
      }

      if (isAdmin) {
        // Get platform-wide data for admin
        const allEvents = await EventsService.getAllEvents(100, 0)
        // Get total user count from profiles table
        const { count: userCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
        realStats.totalUsers = userCount || 0
        realStats.platformRevenue = allEvents.reduce((sum, event) => sum + (event.total_revenue || 0), 0)
        realStats.activeEvents = allEvents.filter(event => event.status === 'published').length
        // Calculate system health based on active events and recent activity
        const activeEventCount = allEvents.filter(event => event.status === 'published').length
        const totalEventCount = allEvents.length
        realStats.systemHealth = totalEventCount > 0 ? Math.round((activeEventCount / totalEventCount) * 100) : 100
        
        // Add admin activity
        realActivity.push({
          id: 'admin-1',
          type: 'system',
          description: `Platform has ${allEvents.length} total events`,
          timestamp: 'Today',
          icon: Monitor
        })
      }

      // Common stats for all users
      if (canSellTickets) {
        // Get active referral codes count
        const referralStats = await ReferralService.getFollowerReferralStats(user.id)
        realStats.activeReferralCodes = referralStats.filter(code => code.clicks > 0 || code.conversions > 0).length
      }
      // Get upcoming events count for the user
      const currentDate = new Date().toISOString()
      const { data: upcomingEvents } = await supabase
        .from('events')
        .select('id')
        .gte('date', currentDate)
        .eq('status', 'published')
      realStats.upcomingEvents = upcomingEvents?.length || 0

      setStats(realStats)
      setRecentActivity(realActivity)
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold">{stats.totalUsers?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>,
        <Card key="platform-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold">${stats.platformRevenue?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>,
        <Card key="active-events">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">Active Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold">{stats.activeEvents}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>,
        <Card key="system-health">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">System Health</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">My Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">${stats.totalRevenue?.toFixed(0)} total revenue</p>
          </CardContent>
        </Card>,
        <Card key="followers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold">${stats.totalEarnings?.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">+$15.50 from last month</p>
          </CardContent>
        </Card>,
        <Card key="sales">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">Tickets Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">Events Worked</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold">{stats.eventsWorked}</div>
            <p className="text-xs text-muted-foreground">{stats.upcomingEvents} upcoming</p>
          </CardContent>
        </Card>,
        <Card key="tickets-scanned">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">Tickets Scanned</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">Events Attended</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Start by browsing events</p>
          </CardContent>
        </Card>,
        <Card key="following">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium leading-relaxed">Following</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
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
      <Button key="browse-events" variant="outline" className="h-24 flex-col gap-3 p-4">
        <Calendar className="h-6 w-6" />
        <span className="text-sm">Browse Events</span>
      </Button>
    )

    // Create Event available to all users
    actions.push(
      <Button key="create-event" className="h-24 flex-col gap-3 p-4" asChild>
        <Link to="/create-event">
          <Plus className="h-6 w-6" />
          <span className="text-sm">Create Event</span>
        </Link>
      </Button>
    )

    if (canSellTickets) {
      actions.push(
        <Button key="generate-code" variant="outline" className="h-24 flex-col gap-3 p-4">
          <DollarSign className="h-6 w-6" />
          <span className="text-sm">Generate Code</span>
        </Button>
      )
    }

    if (canWorkEvents) {
      actions.push(
        <Button key="scan-tickets" variant="outline" className="h-24 flex-col gap-3 p-4">
          <QrCode className="h-6 w-6" />
          <span className="text-sm">Scan Tickets</span>
        </Button>
      )
    }

    if (isEventOwner) {
      actions.push(
        <Button key="manage-followers" variant="outline" className="h-24 flex-col gap-3 p-4">
          <Users className="h-6 w-6" />
          <span className="text-sm">Manage Followers</span>
        </Button>
      )
    }

    if (isAdmin) {
      actions.push(
        <Button key="user-management" variant="outline" className="h-24 flex-col gap-3 p-4">
          <Users className="h-6 w-6" />
          <span className="text-sm">User Management</span>
        </Button>,
        <Button key="system-monitor" variant="outline" className="h-24 flex-col gap-3 p-4">
          <Monitor className="h-6 w-6" />
          <span className="text-sm">System Monitor</span>
        </Button>
      )
    }

    return actions
  }

  return (
    <div className="space-y-8">
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
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {getStatsCards()}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
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
                  <div key={activity.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-background rounded-lg">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium mb-1">Browse Events</h3>
                <p className="text-sm text-muted-foreground">Discover amazing events in your area</p>
              </div>
              <div className="text-center p-6 bg-background rounded-lg">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium mb-1">Follow Organizers</h3>
                <p className="text-sm text-muted-foreground">Get updates and unlock selling opportunities</p>
              </div>
              <div className="text-center p-6 bg-background rounded-lg">
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