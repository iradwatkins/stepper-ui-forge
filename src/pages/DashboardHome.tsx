import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { EventsService } from '@/lib/events-db'
import { EventWithStats, TicketType } from '@/types/database'

interface DashboardStats {
  total_events: number
  published_events: number
  draft_events: number
  completed_events: number
  total_tickets_sold: number
  total_revenue: number
  total_attendees: number
  recent_events: EventWithStats[]
}
import { SupabaseStatus } from '@/components/SupabaseStatus'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Ticket,
  Users,
  TrendingUp,
  Plus,
  Eye,
  BarChart3,
  DollarSign
} from 'lucide-react'

export default function DashboardHome() {
  const { user } = useAuth()
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user?.id])

  const loadDashboardData = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const stats = await EventsService.getDashboardStats(user.id)
      setDashboardStats(stats)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Fallback to empty stats
      setDashboardStats({
        total_events: 0,
        published_events: 0,
        draft_events: 0,
        completed_events: 0,
        total_tickets_sold: 0,
        total_revenue: 0,
        total_attendees: 0,
        recent_events: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: "Total Events",
      value: dashboardStats?.total_events?.toString() || "0",
      change: `${dashboardStats?.draft_events || 0} drafts`,
      changeType: "positive" as const,
      icon: Calendar,
      color: "bg-blue-500"
    },
    {
      title: "Tickets Sold",
      value: dashboardStats?.total_tickets_sold?.toLocaleString() || "0",
      change: `${dashboardStats?.published_events || 0} active events`,
      changeType: "positive" as const,
      icon: Ticket,
      color: "bg-green-500"
    },
    {
      title: "Total Revenue",
      value: `$${dashboardStats?.total_revenue?.toLocaleString() || "0"}`,
      change: `${dashboardStats?.completed_events || 0} completed`,
      changeType: "positive" as const,
      icon: DollarSign,
      color: "bg-purple-500"
    },
    {
      title: "Total Attendees",
      value: dashboardStats?.total_attendees?.toLocaleString() || "0",
      change: "All time",
      changeType: "positive" as const,
      icon: Users,
      color: "bg-orange-500"
    }
  ]

  const recentEvents = dashboardStats?.recent_events?.map((event: EventWithStats) => ({
    id: event.id,
    title: event.title,
    date: new Date(event.date).toLocaleDateString(),
    status: event.status.charAt(0).toUpperCase() + event.status.slice(1),
    ticketsSold: event.tickets_sold || 0,
    totalTickets: event.ticket_types?.reduce((sum: number, tt: TicketType) => sum + (tt.quantity || 0), 0) || 0,
    revenue: `$${(event.total_revenue || 0).toLocaleString()}`
  })) || []

  return (
    <div className="space-y-8">
      {/* Supabase Status */}
      <SupabaseStatus />

      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.user_metadata?.full_name || 'there'}! 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here's what's happening with your events today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="card-hover border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className={`text-xs mt-1 ${
                stat.changeType === 'positive' ? 'text-green-600' : 
                stat.changeType === 'negative' ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Events */}
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Recent Events</CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage and track your event performance
              </CardDescription>
            </div>
            <Button className="button-primary">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{event.title}</h4>
                    <p className="text-sm text-muted-foreground">{event.date}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={
                        event.status === 'Published' ? 'default' :
                        event.status === 'Draft' ? 'secondary' : 'outline'
                      }>
                        {event.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {event.ticketsSold}/{event.totalTickets} tickets sold
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{event.revenue}</p>
                    <Button variant="ghost" size="sm" className="mt-1 hover:bg-muted">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Analytics */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create New Event
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Invite Team Member
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>This Month</CardTitle>
              <CardDescription>
                Your performance summary
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Events Created</span>
                <span className="font-medium">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tickets Sold</span>
                <span className="font-medium">421</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Revenue</span>
                <span className="font-medium">$8,420</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Conversion Rate</span>
                <span className="font-medium text-green-600">12.5%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates from your events and team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                action: "New ticket purchase",
                details: "John Doe purchased 2 tickets for Summer Music Festival",
                time: "2 minutes ago",
                type: "ticket"
              },
              {
                action: "Event published",
                details: "Tech Conference: Future of AI is now live",
                time: "1 hour ago",
                type: "event"
              },
              {
                action: "Team member invited",
                details: "Sarah Johnson was added to your team",
                time: "3 hours ago",
                type: "team"
              }
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                <div className={`p-1.5 rounded-full ${
                  activity.type === 'ticket' ? 'bg-green-100' :
                  activity.type === 'event' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  {activity.type === 'ticket' && <Ticket className="h-3 w-3 text-green-600" />}
                  {activity.type === 'event' && <Calendar className="h-3 w-3 text-blue-600" />}
                  {activity.type === 'team' && <Users className="h-3 w-3 text-purple-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action}
                  </p>
                  <p className="text-sm text-gray-600">
                    {activity.details}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}