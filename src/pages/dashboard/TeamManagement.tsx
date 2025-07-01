import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { TeamManagementDashboard } from '@/components/dashboard/TeamManagementDashboard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export default function TeamManagement() {
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const selectedEventId = eventId || searchParams.get('eventId') || 'demo-event-123'
  const [inviteCount, setInviteCount] = useState(0)

  const handleInviteMember = () => {
    setInviteCount(prev => prev + 1)
  }

  if (!selectedEventId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage your event team members and permissions
          </p>
        </div>
        <Alert className="border-orange-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select an event to manage team members. You can choose an event from the Events section.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Event Selection Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-sm text-muted-foreground">Managing team for event:</div>
        <div className="font-medium">Demo Event (ID: {selectedEventId})</div>
      </div>

      {/* Team Management Dashboard */}
      <TeamManagementDashboard 
        eventId={selectedEventId}
        onInviteMember={handleInviteMember}
      />

      {/* Development Info */}
      {inviteCount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Development Note: {inviteCount} invite(s) initiated. In production, this would send email invitations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}