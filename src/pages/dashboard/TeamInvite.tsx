import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TeamMemberInvite } from '@/components/dashboard/TeamMemberInvite'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Users, Mail, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Invitation {
  id: string
  email: string
  role: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  sentAt: string
  expiresAt: string
}

export default function TeamInvite() {
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId') || 'demo-event-123'
  const [invitations, setInvitations] = useState<Invitation[]>([
    {
      id: 'inv-1',
      email: 'sarah@demo.local',
      role: 'Check-in Staff',
      status: 'pending',
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'inv-2',
      email: 'mike@demo.local',
      role: 'Customer Service',
      status: 'accepted',
      sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
    }
  ])

  const handleInviteSent = (inviteData: any) => {
    const newInvitation: Invitation = {
      id: `inv-${Date.now()}`,
      email: inviteData.email,
      role: inviteData.role,
      status: 'pending',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
    setInvitations(prev => [newInvitation, ...prev])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'declined': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'accepted': return <CheckCircle className="w-4 h-4" />
      case 'declined': return <AlertTriangle className="w-4 h-4" />
      case 'expired': return <AlertTriangle className="w-4 h-4" />
      default: return null
    }
  }

  const pendingCount = invitations.filter(inv => inv.status === 'pending').length
  const acceptedCount = invitations.filter(inv => inv.status === 'accepted').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Invitations</h1>
          <p className="text-muted-foreground">
            Invite team members and manage invitation status
          </p>
        </div>
        <Link to="/dashboard/team">
          <Button variant="outline">
            <Users className="w-4 h-4 mr-2" />
            View Team
          </Button>
        </Link>
      </div>

      {/* Event Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-sm text-muted-foreground">Inviting members for event:</div>
        <div className="font-medium">Demo Event (ID: {eventId})</div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold text-green-600">{acceptedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{invitations.length}</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invite Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send New Invitation</CardTitle>
            <CardDescription>
              Invite a new team member to help manage your event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMemberInvite 
              eventId={eventId}
              onInviteSent={handleInviteSent}
            />
          </CardContent>
        </Card>

        {/* Recent Invitations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invitations</CardTitle>
            <CardDescription>
              Track the status of your sent invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No invitations sent yet</p>
                </div>
              ) : (
                invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(invitation.status)}
                      <div>
                        <div className="font-medium">{invitation.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {invitation.role} • Sent {new Date(invitation.sentAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(invitation.status)}>
                      {invitation.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Development Note */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Development Note: In production, invitations would be sent via email with secure links. 
          The TeamMemberInvite component handles the actual invitation workflow.
        </AlertDescription>
      </Alert>
    </div>
  )
}