// Follower Management Dashboard for organizers
// Manage followers, grant permissions, view follower stats, and track commissions

import React, { useState, useEffect } from 'react'
import { Users, UserPlus, DollarSign, TrendingUp, Settings, Eye, ShoppingCart, Calendar, Crown, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { FollowerService, FollowerWithPermissions, UserPermissions } from '@/lib/services/FollowerService'
import { ReferralService } from '@/lib/services/ReferralService'

interface FollowerManagementDashboardProps {
  organizerId: string
}

interface FollowerStats {
  totalFollowers: number
  totalPromoted: number
  totalSellers: number
  totalTeamMembers: number
  totalCommissionPaid: number
}

export function FollowerManagementDashboard({ organizerId }: FollowerManagementDashboardProps) {
  const [followers, setFollowers] = useState<FollowerWithPermissions[]>([])
  const [followerStats, setFollowerStats] = useState<FollowerStats>({
    totalFollowers: 0,
    totalPromoted: 0,
    totalSellers: 0,
    totalTeamMembers: 0,
    totalCommissionPaid: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFollower, setSelectedFollower] = useState<FollowerWithPermissions | null>(null)
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false)
  const [tempPermissions, setTempPermissions] = useState<UserPermissions>({
    can_sell_tickets: false,
    can_work_events: false,
    is_co_organizer: false,
    commission_rate: 0
  })

  useEffect(() => {
    loadFollowerData()
  }, [organizerId])

  const loadFollowerData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check if follower system is available first
      if (!FollowerService.isFollowerSystemAvailable()) {
        console.debug('Follower system not available, skipping follower data load');
        setFollowers([]);
        setStats({ totalFollowers: 0, activeReferrals: 0, totalEarnings: 0 });
        return;
      }
      
      const [followersData, followerCount] = await Promise.all([
        FollowerService.getFollowersWithPermissions(organizerId),
        FollowerService.getFollowerCount(organizerId)
      ])

      setFollowers(followersData)
      
      // Calculate stats
      const stats: FollowerStats = {
        totalFollowers: followerCount,
        totalPromoted: followersData.filter(f => hasAnyPermissions(f.permissions)).length,
        totalSellers: followersData.filter(f => f.permissions?.can_sell_tickets).length,
        totalTeamMembers: followersData.filter(f => f.permissions?.can_work_events).length,
        totalCommissionPaid: 0 // TODO: Calculate from commission earnings
      }
      
      setFollowerStats(stats)
    } catch (err) {
      console.error('Failed to load follower data:', err)
      setError('Failed to load follower data')
    } finally {
      setLoading(false)
    }
  }

  const hasAnyPermissions = (permissions?: UserPermissions) => {
    return permissions && (
      permissions.can_sell_tickets || 
      permissions.can_work_events || 
      permissions.is_co_organizer
    )
  }

  const handleUpdatePermissions = async () => {
    if (!selectedFollower) return

    try {
      const result = await FollowerService.promoteFollower(
        organizerId,
        selectedFollower.id,
        tempPermissions
      )

      if (result.success) {
        await loadFollowerData()
        setShowPermissionsDialog(false)
        setSelectedFollower(null)
      } else {
        setError(result.error || 'Failed to update permissions')
      }
    } catch (err) {
      console.error('Failed to update permissions:', err)
      setError('Failed to update permissions')
    }
  }

  const handleRevokeAllPermissions = async (follower: FollowerWithPermissions) => {
    try {
      const result = await FollowerService.revokePromotions(organizerId, follower.id)
      
      if (result.success) {
        await loadFollowerData()
      } else {
        setError(result.error || 'Failed to revoke permissions')
      }
    } catch (err) {
      console.error('Failed to revoke permissions:', err)
      setError('Failed to revoke permissions')
    }
  }

  const openPermissionsDialog = (follower: FollowerWithPermissions) => {
    setSelectedFollower(follower)
    setTempPermissions({
      can_sell_tickets: follower.permissions?.can_sell_tickets || false,
      can_work_events: follower.permissions?.can_work_events || false,
      is_co_organizer: follower.permissions?.is_co_organizer || false,
      commission_rate: follower.permissions?.commission_rate || 0,
      commission_type: follower.permissions?.commission_type || 'percentage',
      commission_fixed_amount: follower.permissions?.commission_fixed_amount || 0
    })
    setShowPermissionsDialog(true)
  }

  const getPermissionBadges = (permissions?: UserPermissions) => {
    if (!permissions || !hasAnyPermissions(permissions)) {
      return <Badge variant="secondary">Follower</Badge>
    }

    const badges = []
    if (permissions.is_co_organizer) {
      badges.push(<Badge key="co-organizer" className="bg-purple-100 text-purple-800"><Crown className="w-3 h-3 mr-1" />Co-Organizer</Badge>)
    }
    if (permissions.can_sell_tickets) {
      badges.push(<Badge key="seller" className="bg-green-100 text-green-800"><ShoppingCart className="w-3 h-3 mr-1" />Seller</Badge>)
    }
    if (permissions.can_work_events) {
      badges.push(<Badge key="team" className="bg-blue-100 text-blue-800"><Calendar className="w-3 h-3 mr-1" />Team</Badge>)
    }
    
    return badges
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading followers...</p>
        </div>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{followerStats.totalFollowers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promoted</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{followerStats.totalPromoted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Sellers</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{followerStats.totalSellers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{followerStats.totalTeamMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${followerStats.totalCommissionPaid.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Followers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Followers
          </CardTitle>
          <CardDescription>
            View and manage your followers' permissions and roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {followers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No followers yet</h3>
              <p className="text-gray-600">Share your events to start gaining followers!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Follower</TableHead>
                  <TableHead>Followed</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followers.map((follower) => (
                  <TableRow key={follower.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={follower.avatar_url || ''} />
                          <AvatarFallback>
                            {follower.full_name?.charAt(0) || follower.email.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{follower.full_name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{follower.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {new Date(follower.followed_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getPermissionBadges(follower.permissions)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {follower.permissions?.can_sell_tickets ? (
                        follower.permissions.commission_type === 'fixed' ? (
                          <span className="font-medium">${follower.permissions.commission_fixed_amount?.toFixed(2)}/ticket</span>
                        ) : follower.permissions.commission_rate > 0 ? (
                          <span className="font-medium">{(follower.permissions.commission_rate * 100).toFixed(1)}%</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openPermissionsDialog(follower)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Manage Permissions
                          </DropdownMenuItem>
                          {hasAnyPermissions(follower.permissions) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleRevokeAllPermissions(follower)}
                                className="text-red-600"
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Revoke All Permissions
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>
              Set permissions for {selectedFollower?.full_name || selectedFollower?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Ticket Selling</Label>
                <p className="text-xs text-gray-600">
                  Allow this follower to sell tickets and earn commissions
                </p>
              </div>
              <Switch
                checked={tempPermissions.can_sell_tickets}
                onCheckedChange={(checked) => 
                  setTempPermissions(prev => ({ ...prev, can_sell_tickets: checked }))
                }
              />
            </div>

            {tempPermissions.can_sell_tickets && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Commission Type</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="commission-type"
                        value="percentage"
                        checked={tempPermissions.commission_type === 'percentage'}
                        onChange={(e) => 
                          setTempPermissions(prev => ({ 
                            ...prev, 
                            commission_type: 'percentage' as const
                          }))
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Percentage</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="commission-type"
                        value="fixed"
                        checked={tempPermissions.commission_type === 'fixed'}
                        onChange={(e) => 
                          setTempPermissions(prev => ({ 
                            ...prev, 
                            commission_type: 'fixed' as const
                          }))
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Fixed Amount</span>
                    </label>
                  </div>
                </div>

                {tempPermissions.commission_type === 'percentage' ? (
                  <div className="space-y-2">
                    <Label htmlFor="commission-rate" className="text-sm font-medium">
                      Commission Rate (%)
                    </Label>
                    <Input
                      id="commission-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={tempPermissions.commission_rate * 100}
                      onChange={(e) => 
                        setTempPermissions(prev => ({ 
                          ...prev, 
                          commission_rate: parseFloat(e.target.value) / 100 
                        }))
                      }
                      placeholder="5.0"
                    />
                    <p className="text-xs text-gray-600">
                      Percentage of each sale this follower will earn
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="commission-fixed" className="text-sm font-medium">
                      Fixed Amount per Ticket ($)
                    </Label>
                    <Input
                      id="commission-fixed"
                      type="number"
                      min="0"
                      step="0.01"
                      value={tempPermissions.commission_fixed_amount || 0}
                      onChange={(e) => 
                        setTempPermissions(prev => ({ 
                          ...prev, 
                          commission_fixed_amount: parseFloat(e.target.value) || 0
                        }))
                      }
                      placeholder="2.00"
                    />
                    <p className="text-xs text-gray-600">
                      Fixed dollar amount this follower will earn per ticket sold
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Team Member</Label>
                <p className="text-xs text-gray-600">
                  Allow this follower to scan tickets and work events
                </p>
              </div>
              <Switch
                checked={tempPermissions.can_work_events}
                onCheckedChange={(checked) => 
                  setTempPermissions(prev => ({ ...prev, can_work_events: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Co-Organizer</Label>
                <p className="text-xs text-gray-600">
                  Grant full event management access
                </p>
              </div>
              <Switch
                checked={tempPermissions.is_co_organizer}
                onCheckedChange={(checked) => 
                  setTempPermissions(prev => ({ ...prev, is_co_organizer: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions}>
              Update Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}