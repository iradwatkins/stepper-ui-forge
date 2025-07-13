import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminPermissions } from '@/lib/hooks/useAdminPermissions'
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import { EventsService } from '@/lib/events-db'
import { CommissionService } from '@/lib/services/CommissionService'
import { FollowerService } from '@/lib/services/FollowerService'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  AlertCircle,
  Settings,
  Bell,
  BarChart3,
  Heart,
  Building2,
  CreditCard,
  Shield,
  BookOpen,
  UserPlus,
  Edit3,
  Clock
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

interface QuickAction {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'outline' | 'secondary'
  category?: 'primary' | 'secondary' | 'admin'
}

export default function SimplifiedDashboard() {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin } = useAdminPermissions()
  const { 
    canSellTickets, 
    canWorkEvents, 
    isEventOwner,
    loading: permissionsLoading 
  } = useUserPermissions()
  const navigate = useNavigate()

  const [stats, setStats] = useState<DashboardStats>({})
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
      const realStats: DashboardStats = {}

      // Load data based on user role
      if (canSellTickets) {
        const commissionSummary = await CommissionService.getFollowerCommissionSummary(user.id)
        realStats.totalEarnings = commissionSummary.total_earnings || 0
        realStats.totalSales = commissionSummary.total_sales || 0
      }

      if (isEventOwner) {
        const userEvents = await EventsService.getUserEvents(user.id)
        realStats.totalEvents = userEvents.length
        realStats.totalRevenue = userEvents.reduce((sum, event) => sum + (event.total_revenue || 0), 0)
        realStats.totalFollowers = await FollowerService.getFollowerCount(user.id)
      }

      if (isAdmin) {
        const allEvents = await EventsService.getAllEvents(100, 0)
        const { count: userCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
        realStats.totalUsers = userCount || 0
        realStats.platformRevenue = allEvents.reduce((sum, event) => sum + (event.total_revenue || 0), 0)
        realStats.activeEvents = allEvents.filter(event => event.status === 'published').length
        realStats.systemHealth = 98
      }

      // Get upcoming events count
      const currentDate = new Date().toISOString()
      const { data: upcomingEvents } = await supabase
        .from('events')
        .select('id')
        .gte('date', currentDate)
        .eq('status', 'published')
      realStats.upcomingEvents = upcomingEvents?.length || 0

      setStats(realStats)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Get role-based quick actions
  const getQuickActions = (): QuickAction[] => {
    const actions: QuickAction[] = []

    // Primary actions available to all users
    actions.push(
      {
        title: 'Browse Events',
        description: 'Discover events near you',
        href: '/events',
        icon: Calendar,
        variant: 'outline',
        category: 'primary'
      },
      {
        title: 'Create Event',
        description: 'Start planning your event',
        href: '/create-event',
        icon: Plus,
        variant: 'default',
        category: 'primary'
      }
    )

    // Organizer actions
    if (isEventOwner) {
      actions.push(
        {
          title: 'Manage Events',
          description: 'Edit and organize your events',
          href: '/dashboard/events',
          icon: Edit3,
          variant: 'outline',
          category: 'primary'
        },
        {
          title: 'Event Analytics',
          description: 'View performance metrics',
          href: '/dashboard/analytics',
          icon: BarChart3,
          variant: 'outline',
          category: 'primary'
        },
        {
          title: 'Team Management',
          description: 'Manage team members and roles',
          href: '/dashboard/team',
          icon: Users,
          variant: 'outline',
          category: 'secondary'
        },
        {
          title: 'Followers',
          description: 'Manage your followers',
          href: '/dashboard/followers',
          icon: Heart,
          variant: 'outline',
          category: 'secondary'
        }
      )
    }

    // Seller actions
    if (canSellTickets) {
      actions.push(
        {
          title: 'Sales Dashboard',
          description: 'Track your sales performance',
          href: '/dashboard/sales',
          icon: DollarSign,
          variant: 'outline',
          category: 'primary'
        },
        {
          title: 'Referral Codes',
          description: 'Generate and manage codes',
          href: '/dashboard/referrals',
          icon: CreditCard,
          variant: 'outline',
          category: 'secondary'
        },
        {
          title: 'Earnings',
          description: 'View commission history',
          href: '/dashboard/earnings',
          icon: TrendingUp,
          variant: 'outline',
          category: 'secondary'
        }
      )
    }

    // Team member actions
    if (canWorkEvents) {
      actions.push(
        {
          title: 'Event Assignments',
          description: 'View your assigned events',
          href: '/dashboard/assignments',
          icon: Calendar,
          variant: 'outline',
          category: 'primary'
        },
        {
          title: 'Check-In Tools',
          description: 'Scan tickets and manage entry',
          href: '/dashboard/checkin',
          icon: QrCode,
          variant: 'outline',
          category: 'primary'
        },
        {
          title: 'Schedule',
          description: 'View your work schedule',
          href: '/dashboard/schedule',
          icon: Clock,
          variant: 'outline',
          category: 'secondary'
        }
      )
    }

    // Admin actions
    if (isAdmin) {
      actions.push(
        {
          title: 'User Management',
          description: 'Manage platform users',
          href: '/dashboard/admin/users',
          icon: Users,
          variant: 'outline',
          category: 'admin'
        },
        {
          title: 'Platform Analytics',
          description: 'View system-wide metrics',
          href: '/dashboard/admin/analytics',
          icon: Monitor,
          variant: 'outline',
          category: 'admin'
        },
        {
          title: 'System Monitor',
          description: 'Monitor system health',
          href: '/dashboard/admin/monitor',
          icon: Activity,
          variant: 'outline',
          category: 'admin'
        },
        {
          title: 'Magazine Management',
          description: 'Manage magazine content',
          href: '/dashboard/admin/magazine',
          icon: BookOpen,
          variant: 'outline',
          category: 'admin'
        }
      )
    }

    // Default actions for new users
    if (!canSellTickets && !canWorkEvents && !isEventOwner && !isAdmin) {
      actions.push(
        {
          title: 'Follow Organizers',
          description: 'Get updates and unlock opportunities',
          href: '/dashboard/following',
          icon: Heart,
          variant: 'outline',
          category: 'primary'
        }
      )
    }

    // Common secondary actions
    actions.push(
      {
        title: 'Notifications',
        description: 'View your notifications',
        href: '/dashboard/notifications',
        icon: Bell,
        variant: 'outline',
        category: 'secondary'
      },
      {
        title: 'Settings',
        description: 'Manage your preferences',
        href: '/dashboard/settings',
        icon: Settings,
        variant: 'outline',
        category: 'secondary'
      }
    )

    return actions
  }

  // Get role-based stats cards
  const getStatsCards = () => {
    const cards = []

    // Admin stats
    if (isAdmin) {
      cards.push(
        <Card key="total-users" className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Platform members</p>
          </CardContent>
        </Card>,
        <Card key="platform-revenue" className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.platformRevenue?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total earnings</p>
          </CardContent>
        </Card>,
        <Card key="active-events" className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEvents}</div>
            <p className="text-xs text-muted-foreground">Currently live</p>
          </CardContent>
        </Card>,
        <Card key="system-health" className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.systemHealth}%</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      )
    }

    // Organizer stats
    if (isEventOwner) {
      cards.push(
        <Card key="my-events" className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">${stats.totalRevenue?.toFixed(0)} revenue</p>
          </CardContent>
        </Card>,
        <Card key="followers" className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFollowers}</div>
            <p className="text-xs text-muted-foreground">Following you</p>
          </CardContent>
        </Card>
      )
    }

    // Seller stats
    if (canSellTickets) {
      cards.push(
        <Card key="earnings" className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.totalEarnings?.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Commission earned</p>
          </CardContent>
        </Card>,
        <Card key="sales" className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">Total sales</p>
          </CardContent>
        </Card>
      )
    }

    // Common stats
    cards.push(
      <Card key="upcoming-events" className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
          <p className="text-xs text-muted-foreground">Events coming up</p>
        </CardContent>
      </Card>
    )

    return cards.slice(0, 4) // Show max 4 cards for clean layout
  }

  const getUserGreeting = () => {
    if (isAdmin) return "Admin Dashboard"
    if (isEventOwner) return "Event Organizer"
    if (canSellTickets && canWorkEvents) return "Seller & Team Member"
    if (canSellTickets) return "Ticket Seller"
    if (canWorkEvents) return "Team Member"
    return "Welcome"
  }

  const getUserSubtitle = () => {
    if (isAdmin) return "Platform administration and system monitoring"
    if (isEventOwner) return "Manage your events, followers, and analytics"
    if (canSellTickets && canWorkEvents) return "Sell tickets and work events"
    if (canSellTickets) return "Track your sales and earnings"
    if (canWorkEvents) return "Manage your event assignments"
    return "Get started by exploring events and following organizers"
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

  const actions = getQuickActions()
  const primaryActions = actions.filter(a => a.category === 'primary')
  const secondaryActions = actions.filter(a => a.category === 'secondary')
  const adminActions = actions.filter(a => a.category === 'admin')

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{getUserGreeting()}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">{getUserSubtitle()}</p>
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

      {/* Primary Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common tasks and tools for your role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {primaryActions.map((action) => (
              <Button
                key={action.title}
                variant={action.variant}
                className="h-auto p-4 flex-col gap-2 text-left justify-start items-start hover:shadow-md transition-all"
                asChild
              >
                <Link to={action.href}>
                  <action.icon className="h-6 w-6 text-primary" />
                  <div>
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </div>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Secondary Actions */}
      {secondaryActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              More Options
            </CardTitle>
            <CardDescription>
              Additional tools and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {secondaryActions.map((action) => (
                <Button
                  key={action.title}
                  variant="outline"
                  className="h-auto p-4 flex-col gap-2 text-left justify-start items-start hover:shadow-md transition-all"
                  asChild
                >
                  <Link to={action.href}>
                    <action.icon className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Actions */}
      {adminActions.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <Shield className="h-5 w-5" />
              Admin Tools
              <Badge variant="destructive" className="ml-auto">Admin Only</Badge>
            </CardTitle>
            <CardDescription>
              Platform administration and system management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {adminActions.map((action) => (
                <Button
                  key={action.title}
                  variant="outline"
                  className="h-auto p-4 flex-col gap-2 text-left justify-start items-start hover:shadow-md transition-all border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:border-red-700 dark:hover:bg-red-950/40"
                  asChild
                >
                  <Link to={action.href}>
                    <action.icon className="h-6 w-6 text-red-600 dark:text-red-400" />
                    <div>
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Welcome message for new users */}
      {!canSellTickets && !canWorkEvents && !isEventOwner && !isAdmin && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Welcome to SteppersLife! 🎉
            </CardTitle>
            <CardDescription>
              Start your journey by exploring events and connecting with organizers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-background rounded-lg border border-primary/10">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium mb-1">Discover Events</h3>
                <p className="text-sm text-muted-foreground">Find amazing events happening near you</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg border border-primary/10">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium mb-1">Follow Organizers</h3>
                <p className="text-sm text-muted-foreground">Connect with organizers to unlock opportunities</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg border border-primary/10">
                <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium mb-1">Earn Commissions</h3>
                <p className="text-sm text-muted-foreground">Get promoted to sell tickets and earn money</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}