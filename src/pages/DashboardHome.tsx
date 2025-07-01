// Simple, Clean Dashboard - Main dashboard page
// Replaces complex multi-level dashboard with simple, accessible design

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Users,
  DollarSign,
  ShoppingCart,
  QrCode,
  TrendingUp,
  Plus,
  Settings,
  Eye,
  Copy,
  Download,
  Scan,
  UserPlus,
  Crown,
  AlertCircle
} from 'lucide-react'
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import { FollowerService } from '@/lib/services/FollowerService'

interface DashboardData {
  // User stats
  totalEarnings: number
  totalSales: number
  eventsWorked: number
  ticketsScanned: number
  
  // Organizer stats
  totalEvents: number
  totalFollowers: number
  totalRevenue: number
  
  // Recent activity
  recentActivity: Array<{
    id: string
    type: 'sale' | 'checkin' | 'follow' | 'event'
    description: string
    amount?: number
    timestamp: string
  }>
  
  // Quick actions
  activeReferralCodes: number
  upcomingEvents: number
}

export default function DashboardHome() {
  const { user, loading: authLoading } = useAuth()
  const { 
    canSellTickets, 
    canWorkEvents, 
    isEventOwner, 
    sellingPermissions,
    loading: permissionsLoading 
  } = useUserPermissions()

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalEarnings: 0,
    totalSales: 0,
    eventsWorked: 0,
    ticketsScanned: 0,
    totalEvents: 0,
    totalFollowers: 0,
    totalRevenue: 0,
    recentActivity: [],
    activeReferralCodes: 0,
    upcomingEvents: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && !permissionsLoading) {
      loadDashboardData()
    }
  }, [user, permissionsLoading])

  const loadDashboardData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Load mock data for demonstration
      const mockData: DashboardData = {
        totalEarnings: 245.50,
        totalSales: 23,
        eventsWorked: 5,
        ticketsScanned: 127,
        totalEvents: 3,
        totalFollowers: 45,
        totalRevenue: 2150.00,
        activeReferralCodes: 2,
        upcomingEvents: 1,
        recentActivity: [
          {
            id: '1',
            type: 'sale',
            description: 'Ticket sale commission earned',
            amount: 15.50,
            timestamp: '2 hours ago'
          },
          {
            id: '2',
            type: 'checkin',
            description: 'Scanned tickets at Summer Festival',
            timestamp: 'Yesterday'
          },
          {
            id: '3',
            type: 'follow',
            description: 'New follower: Sarah Johnson',
            timestamp: '2 days ago'
          }
        ]
      }

      setDashboardData(mockData)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || permissionsLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Welcome to SteppersLife</CardTitle>
            <CardDescription>Please sign in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/auth/signin'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Determine user type for personalized greeting
  const getUserGreeting = () => {
    if (isEventOwner) return "Event Organizer Dashboard"
    if (canSellTickets && canWorkEvents) return "Seller & Team Member Dashboard"
    if (canSellTickets) return "Ticket Seller Dashboard"
    if (canWorkEvents) return "Team Member Dashboard"
    return "Welcome to SteppersLife"
  }

  const getUserSubtitle = () => {
    if (isEventOwner) return "Manage your events, followers, and analytics"
    if (canSellTickets && canWorkEvents) return "Sell tickets and work events"
    if (canSellTickets) return "Track your sales and earnings"
    if (canWorkEvents) return "Manage your event assignments"
    return "Follow organizers to unlock selling and team features"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{getUserGreeting()}</h1>
              <p className="text-gray-600">{getUserSubtitle()}</p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex space-x-3">
              {canSellTickets && (
                <Button variant="outline" size="sm">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Generate Link
                </Button>
              )}
              {canWorkEvents && (
                <Button variant="outline" size="sm">
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan Tickets
                </Button>
              )}
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Earnings (for sellers) */}
          {canSellTickets && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${dashboardData.totalEarnings.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  +$15.50 from last month
                </p>
              </CardContent>
            </Card>
          )}

          {/* Sales (for sellers) */}
          {canSellTickets && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalSales}</div>
                <p className="text-xs text-muted-foreground">
                  Via {dashboardData.activeReferralCodes} referral codes
                </p>
              </CardContent>
            </Card>
          )}

          {/* Events Worked (for team members) */}
          {canWorkEvents && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Events Worked</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.eventsWorked}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.upcomingEvents} upcoming
                </p>
              </CardContent>
            </Card>
          )}

          {/* Events Created (for organizers) */}
          {isEventOwner && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalEvents}</div>
                <p className="text-xs text-muted-foreground">
                  ${dashboardData.totalRevenue.toFixed(0)} total revenue
                </p>
              </CardContent>
            </Card>
          )}

          {/* Followers (for organizers) */}
          {isEventOwner && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Followers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalFollowers}</div>
                <p className="text-xs text-muted-foreground">
                  +3 this week
                </p>
              </CardContent>
            </Card>
          )}

          {/* Default stats for new users */}
          {!canSellTickets && !canWorkEvents && !isEventOwner && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Events Attended</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Start by browsing events</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Following</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Follow organizers to get promoted</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest actions and earnings</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent activity</p>
                  <p className="text-sm">Start selling tickets or working events to see activity here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          activity.type === 'sale' ? 'bg-green-100' :
                          activity.type === 'checkin' ? 'bg-blue-100' :
                          activity.type === 'follow' ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          {activity.type === 'sale' && <DollarSign className="h-4 w-4 text-green-600" />}
                          {activity.type === 'checkin' && <QrCode className="h-4 w-4 text-blue-600" />}
                          {activity.type === 'follow' && <Users className="h-4 w-4 text-purple-600" />}
                          {activity.type === 'event' && <Calendar className="h-4 w-4 text-gray-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{activity.description}</p>
                          <p className="text-xs text-gray-500">{activity.timestamp}</p>
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
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => window.location.href = '/events'}
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  Browse Events
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => window.location.href = '/create-event'}
                >
                  <Plus className="h-6 w-6 mb-2" />
                  Create Event
                </Button>

                {canSellTickets && (
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => window.location.href = '/dashboard/follower'}
                  >
                    <DollarSign className="h-6 w-6 mb-2" />
                    Generate Code
                  </Button>
                )}

                {canWorkEvents && (
                  <Button variant="outline" className="h-20 flex-col">
                    <QrCode className="h-6 w-6 mb-2" />
                    Scan Tickets
                  </Button>
                )}

                {isEventOwner && (
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => window.location.href = '/dashboard/FollowerManagement'}
                  >
                    <Users className="h-6 w-6 mb-2" />
                    Manage Followers
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => window.location.href = '/profile'}
                >
                  <Settings className="h-6 w-6 mb-2" />
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permission Status */}
        {(canSellTickets || canWorkEvents || isEventOwner) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Your Permissions</CardTitle>
              <CardDescription>What you can do on SteppersLife</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {isEventOwner && (
                  <Badge variant="default" className="px-3 py-1">
                    <Crown className="h-3 w-3 mr-1" />
                    Event Organizer
                  </Badge>
                )}
                {canSellTickets && (
                  <Badge variant="secondary" className="px-3 py-1">
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Ticket Seller
                  </Badge>
                )}
                {canWorkEvents && (
                  <Badge variant="secondary" className="px-3 py-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    Team Member
                  </Badge>
                )}
              </div>
              
              {sellingPermissions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Selling Permissions:</p>
                  <div className="space-y-2">
                    {sellingPermissions.map((permission) => (
                      <div key={permission.organizer_id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                        <span>{permission.organizer_name}</span>
                        <span className="font-medium">{(permission.commission_rate * 100).toFixed(1)}% commission</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* New User Welcome */}
        {!canSellTickets && !canWorkEvents && !isEventOwner && (
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Welcome to SteppersLife! 🎉</CardTitle>
              <CardDescription className="text-blue-700">
                Get started by exploring events and following organizers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-medium mb-1">Browse Events</h3>
                  <p className="text-sm text-gray-600">Discover amazing events in your area</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-medium mb-1">Follow Organizers</h3>
                  <p className="text-sm text-gray-600">Get updates and unlock selling opportunities</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-medium mb-1">Start Earning</h3>
                  <p className="text-sm text-gray-600">Get promoted to sell tickets and earn commissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}