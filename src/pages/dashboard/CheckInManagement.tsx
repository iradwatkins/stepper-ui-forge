import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckinDashboard } from '@/components/dashboard/CheckinDashboard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Smartphone, QrCode, Users, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CheckInManagement() {
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId') || 'demo-event-123'
  const [qrScannerActive, setQrScannerActive] = useState(false)

  const mockStats = {
    activeStaff: 3,
    totalCheckins: 87,
    lastCheckinTime: new Date(Date.now() - 5 * 60 * 1000).toLocaleTimeString(),
    duplicateAttempts: 2
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Check-in Management</h1>
          <p className="text-muted-foreground">
            Monitor real-time check-in activity and manage staff operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link to="/dashboard/team">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Manage Staff
            </Button>
          </Link>
          <Button 
            onClick={() => setQrScannerActive(true)}
            className={qrScannerActive ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <QrCode className="w-4 h-4 mr-2" />
            {qrScannerActive ? 'Scanner Active' : 'Start Scanning'}
          </Button>
        </div>
      </div>

      {/* Event Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-sm text-muted-foreground">Managing check-ins for event:</div>
        <div className="font-medium">Demo Event (ID: {eventId})</div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Staff</p>
                <p className="text-2xl font-bold text-green-600">{mockStats.activeStaff}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Check-ins</p>
                <p className="text-2xl font-bold">{mockStats.totalCheckins}</p>
              </div>
              <QrCode className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Check-in</p>
                <p className="text-2xl font-bold text-blue-600">{mockStats.lastCheckinTime}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duplicate Attempts</p>
                <p className="text-2xl font-bold text-orange-600">{mockStats.duplicateAttempts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Status */}
      {qrScannerActive && (
        <Alert className="border-green-200 bg-green-50">
          <Smartphone className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            QR Scanner is active. Staff can now scan tickets for check-in. 
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setQrScannerActive(false)}
              className="ml-2 text-green-800 hover:text-green-900"
            >
              Stop Scanner
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard */}
      <CheckinDashboard eventId={eventId} />

      {/* Development Note */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Development Note: This page integrates the CheckinDashboard component. 
          In production, the QR scanner would interface with mobile devices and camera APIs.
        </AlertDescription>
      </Alert>
    </div>
  )
}