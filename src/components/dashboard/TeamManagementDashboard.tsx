import React, { useState, useEffect } from 'react'
import { Plus, Users, UserCheck, Clock, AlertCircle, MoreVertical, Shield, Headphones, Building, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from '@/components/ui/dialog'
import { TeamService, TeamMember, TeamRole, TeamStats, CheckInSession } from '@/lib/services/TeamService'
import { TeamMemberInvite } from './TeamMemberInvite'

interface TeamManagementDashboardProps {
  eventId: string
  onInviteMember?: () => void
}

export function TeamManagementDashboard({ eventId, onInviteMember }: TeamManagementDashboardProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [activeSessions, setActiveSessions] = useState<CheckInSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  useEffect(() => {
    loadTeamData()
  }, [eventId])

  const loadTeamData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [membersResult, statsResult] = await Promise.all([
        TeamService.getEventTeamMembers(eventId),
        TeamService.getTeamStats(eventId)
      ])

      if (membersResult.success) {
        setTeamMembers(membersResult.data || [])
      } else {
        setError(membersResult.error || 'Failed to load team members')
      }

      if (statsResult.success) {
        setTeamStats(statsResult.data || null)
      }
    } catch (err) {
      setError('Failed to load team data')
      console.error('TeamManagementDashboard.loadTeamData failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      const result = await TeamService.removeTeamMember(eventId, userId)
      if (result.success) {
        await loadTeamData() // Refresh data
      } else {
        setError(result.error || 'Failed to remove team member')
      }
    } catch (err) {
      setError('Failed to remove team member')
      console.error('TeamManagementDashboard.handleRemoveMember failed:', err)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: TeamRole) => {
    try {
      const result = await TeamService.updateTeamMemberRole(eventId, userId, newRole)
      if (result.success) {
        await loadTeamData() // Refresh data
      } else {
        setError(result.error || 'Failed to update team member role')
      }
    } catch (err) {
      setError('Failed to update team member role')
      console.error('TeamManagementDashboard.handleUpdateRole failed:', err)
    }
  }

  const getRoleIcon = (role: TeamRole) => {
    const icons = {
      event_manager: Shield,
      check_in_staff: UserCheck,
      customer_service: Headphones,
      security: Shield,
      vendor_coordinator: Building
    }
    const Icon = icons[role] || Users
    return <Icon className="w-4 h-4" />
  }

  const getRoleBadgeVariant = (role: TeamRole) => {
    const variants = {
      event_manager: 'default',
      check_in_staff: 'secondary',
      customer_service: 'outline',
      security: 'destructive',
      vendor_coordinator: 'secondary'
    }
    return variants[role] || 'secondary'
  }

  const formatLastActive = (lastActive: string | null) => {
    if (!lastActive) return 'Never'
    const date = new Date(lastActive)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Team Management</h2>
            <p className="text-muted-foreground">Manage your event team and permissions</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">Manage your event team and permissions</p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => onInviteMember?.()}>
              <Plus className="w-4 h-4 mr-2" />
              Invite Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your event team
              </DialogDescription>
            </DialogHeader>
            <TeamMemberInvite
              eventId={eventId}
              onInviteSent={() => {
                setShowInviteDialog(false)
                loadTeamData()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {teamStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="ml-2 text-sm font-medium">Total Members</span>
              </div>
              <div className="text-2xl font-bold">{teamStats.total_members}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="ml-2 text-sm font-medium">Active Sessions</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{teamStats.active_sessions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="ml-2 text-sm font-medium">Check-in Staff</span>
              </div>
              <div className="text-2xl font-bold">{teamStats.roles_breakdown.check_in_staff}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="ml-2 text-sm font-medium">Pending Invites</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {teamStats.recent_activity.pending_invitations}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                View and manage team members for this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No team members yet</p>
                  <p className="text-sm">Invite team members to help manage your event</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.user_profile?.avatar_url} />
                              <AvatarFallback>
                                {member.user_profile?.full_name?.[0] || 
                                 member.user_profile?.email?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {member.user_profile?.full_name || 'Unknown User'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {member.user_profile?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getRoleBadgeVariant(member.role_type)}
                            className="flex items-center w-fit"
                          >
                            {getRoleIcon(member.role_type)}
                            <span className="ml-1">
                              {TeamService.getRoleDisplayName(member.role_type)}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatLastActive(member.last_active)}
                        </TableCell>
                        <TableCell>
                          {member.accepted_at 
                            ? new Date(member.accepted_at).toLocaleDateString()
                            : 'Pending'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(member.user_id, 'event_manager')}
                                disabled={member.role_type === 'event_manager'}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Promote to Manager
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(member.user_id, 'check_in_staff')}
                                disabled={member.role_type === 'check_in_staff'}
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Set as Check-in Staff
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleRemoveMember(member.user_id)}
                                className="text-destructive"
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                Remove Member
                              </DropdownMenuItem>
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
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Roles & Permissions</CardTitle>
              <CardDescription>
                Overview of team roles and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(TeamService.getRolePermissions('event_manager')).map(([role, _]) => {
                  const roleType = role as TeamRole
                  const permissions = TeamService.getRolePermissions(roleType)
                  const count = teamStats?.roles_breakdown[roleType] || 0
                  
                  return (
                    <Card key={role} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(roleType)}
                          <span className="font-medium">
                            {TeamService.getRoleDisplayName(roleType)}
                          </span>
                        </div>
                        <Badge variant="secondary">{count} members</Badge>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(permissions).map(([permission, granted]) => (
                          <div key={permission} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            <Badge variant={granted ? 'default' : 'outline'} className="text-xs">
                              {granted ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Activity Log</CardTitle>
              <CardDescription>
                Recent team activities and check-in sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Activity logging coming soon</p>
                <p className="text-sm">Team activities will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}