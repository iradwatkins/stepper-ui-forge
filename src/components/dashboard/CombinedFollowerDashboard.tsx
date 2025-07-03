// Combined Follower Dashboard for users with both selling and team permissions
// Integrates ticket selling and team member functionalities

import React, { useState, useEffect } from 'react'
import { DollarSign, Calendar, Users, TrendingUp, ShoppingCart, QrCode } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TicketSellerDashboard } from './TicketSellerDashboard'
import { TeamMemberDashboard } from './TeamMemberDashboard'
import { FollowerService, UserPermissions } from '@/lib/services/FollowerService'

interface CombinedFollowerDashboardProps {
  userId: string
}

interface CombinedStats {
  totalEarnings: number
  totalSales: number
  eventsWorked: number
  ticketsScanned: number
  activeOrganizers: number
}

export function CombinedFollowerDashboard({ userId }: CombinedFollowerDashboardProps) {
  const [permissions, setPermissions] = useState<Record<string, UserPermissions>>({})
  const [combinedStats, setCombinedStats] = useState<CombinedStats>({
    totalEarnings: 0,
    totalSales: 0,
    eventsWorked: 0,
    ticketsScanned: 0,
    activeOrganizers: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCombinedData()
  }, [userId])

  const loadCombinedData = async () => {
    setLoading(true)
    setError(null)

    try {
      // TODO: Load permissions for all organizers user follows
      // For now, using mock data
      const mockPermissions: Record<string, UserPermissions> = {}
      setPermissions(mockPermissions)

      // TODO: Calculate combined stats from both selling and team activities
      const mockStats: CombinedStats = {
        totalEarnings: 0,
        totalSales: 0,
        eventsWorked: 0,
        ticketsScanned: 0,
        activeOrganizers: Object.keys(mockPermissions).length
      }
      setCombinedStats(mockStats)

    } catch (err) {
      console.error('Failed to load combined data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const hasSellingPermissions = Object.values(permissions).some(p => p.can_sell_tickets)
  const hasTeamPermissions = Object.values(permissions).some(p => p.can_work_events)
  const hasCoOrganizerPermissions = Object.values(permissions).some(p => p.is_co_organizer)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!hasSellingPermissions && !hasTeamPermissions) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No permissions granted</h3>
        <p className="text-gray-600">
          Follow event organizers and ask them to grant you selling or team permissions to access dashboard features.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Permission Status */}
      <div className="flex flex-wrap gap-2 mb-6">
        {hasCoOrganizerPermissions && (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
            <Users className="h-4 w-4" />
            Co-Organizer Access
          </div>
        )}
        {hasSellingPermissions && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            <ShoppingCart className="h-4 w-4" />
            Ticket Seller
          </div>
        )}
        {hasTeamPermissions && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            <Calendar className="h-4 w-4" />
            Team Member
          </div>
        )}
      </div>

      {/* Combined Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${combinedStats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From ticket sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{combinedStats.totalSales}</div>
            <p className="text-xs text-muted-foreground">Through referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Worked</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{combinedStats.eventsWorked}</div>
            <p className="text-xs text-muted-foreground">As team member</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Scanned</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{combinedStats.ticketsScanned}</div>
            <p className="text-xs text-muted-foreground">Check-ins processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Organizers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{combinedStats.activeOrganizers}</div>
            <p className="text-xs text-muted-foreground">Working with</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {hasSellingPermissions && (
            <TabsTrigger value="selling">Ticket Sales</TabsTrigger>
          )}
          {hasTeamPermissions && (
            <TabsTrigger value="team">Team Work</TabsTrigger>
          )}
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {hasSellingPermissions && (
                    <Card className="p-4 border-dashed">
                      <div className="text-center">
                        <ShoppingCart className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <h3 className="font-medium">Generate Referral Code</h3>
                        <p className="text-sm text-gray-600 mt-1">Create new referral links</p>
                      </div>
                    </Card>
                  )}
                  
                  {hasTeamPermissions && (
                    <Card className="p-4 border-dashed">
                      <div className="text-center">
                        <QrCode className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <h3 className="font-medium">Scan Tickets</h3>
                        <p className="text-sm text-gray-600 mt-1">Check in attendees</p>
                      </div>
                    </Card>
                  )}
                  
                  <Card className="p-4 border-dashed">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <h3 className="font-medium">View Analytics</h3>
                      <p className="text-sm text-gray-600 mt-1">Track performance</p>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Ticket sale commission earned</p>
                        <p className="text-sm text-gray-600">2 hours ago</p>
                      </div>
                    </div>
                    <div className="text-green-600 font-medium">+$15.50</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <QrCode className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Scanned tickets at Summer Festival</p>
                        <p className="text-sm text-gray-600">Yesterday</p>
                      </div>
                    </div>
                    <div className="text-blue-600 font-medium">45 scans</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {hasSellingPermissions && (
          <TabsContent value="selling">
            <TicketSellerDashboard userId={userId} />
          </TabsContent>
        )}

        {hasTeamPermissions && (
          <TabsContent value="team">
            <TeamMemberDashboard userId={userId} />
          </TabsContent>
        )}

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Your Permissions</CardTitle>
              <CardDescription>
                Permissions granted by event organizers you follow
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(permissions).length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No permissions yet</h3>
                  <p className="text-gray-600">
                    Follow event organizers to get permissions for selling tickets or working events.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(permissions).map(([organizerId, perms]) => (
                    <div key={organizerId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Organizer Name</h4>
                          <p className="text-sm text-gray-600">organizer@example.com</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {perms.can_sell_tickets && (
                            <div className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              Ticket Sales ({(perms.commission_rate * 100).toFixed(1)}%)
                            </div>
                          )}
                          {perms.can_work_events && (
                            <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              Team Member
                            </div>
                          )}
                          {perms.is_co_organizer && (
                            <div className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                              Co-Organizer
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}