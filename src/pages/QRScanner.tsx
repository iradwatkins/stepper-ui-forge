import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEventPermissions } from '@/hooks/useEventPermissions'
import { QRScannerService, ScanResult, ScanStats } from '@/services/qrScannerService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Users, 
  Clock,
  Smartphone,
  Zap,
  BarChart3
} from 'lucide-react'

export default function QRScanner() {
  const { user } = useAuth()
  const eventPermissions = useEventPermissions()
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [qrInput, setQrInput] = useState('')
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [scanStats, setScanStats] = useState<ScanStats | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInstantScannerMode, setIsInstantScannerMode] = useState(false)

  useEffect(() => {
    if (eventPermissions.teamMemberEvents.length > 0) {
      setSelectedEventId(eventPermissions.teamMemberEvents[0].event_id)
    }
  }, [eventPermissions.teamMemberEvents])

  useEffect(() => {
    if (selectedEventId && user) {
      loadScanStats()
    }
  }, [selectedEventId, user])

  const loadScanStats = async () => {
    if (!selectedEventId || !user) return

    try {
      const stats = await QRScannerService.getTeamMemberScanStats(user.id, selectedEventId)
      setScanStats(stats)
    } catch (error) {
      console.error('Error loading scan stats:', error)
    }
  }

  const validateCode = async (code: string, isManual: boolean = false) => {
    if (!selectedEventId || !user) {
      setError('Please select an event first')
      return
    }

    setScanning(true)
    setError(null)

    try {
      // Determine if this is a backup code or QR code
      const isBackupCode = isManual || /^[A-Z0-9]{7}$/.test(code)
      
      const result = await QRScannerService.validateTicketEntry(
        selectedEventId,
        code,
        user.id,
        isBackupCode
      )

      // Add timestamp and scan method for display
      const scanResultWithMeta = {
        ...result,
        timestamp: new Date(),
        scan_method: isBackupCode ? 'backup_code' : 'qr_code',
        scanned_by: user.email || 'Unknown'
      }

      setScanResults(prev => [scanResultWithMeta, ...prev.slice(0, 9)]) // Keep last 10 results
      setQrInput('')
      
      // Refresh stats
      await loadScanStats()

    } catch (error) {
      console.error('Code validation error:', error)
      setError(error instanceof Error ? error.message : 'Failed to validate code')
    } finally {
      setScanning(false)
    }
  }

  const enableInstantScanner = () => {
    setIsInstantScannerMode(true)
    // Here you would typically request camera permissions and start scanning
    alert('Camera scanner would activate here. For demo, use manual entry.')
  }

  const handleManualScan = () => {
    if (!qrInput.trim()) {
      setError('Please enter QR code or 7-digit backup code')
      return
    }

    if (!selectedEventId) {
      setError('Please select an event first')
      return
    }

    validateCode(qrInput, true)
  }

  const selectedEvent = eventPermissions.teamMemberEvents.find(
    event => event.event_id === selectedEventId
  )

  if (eventPermissions.loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading scanner...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!eventPermissions.canWorkEvents) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Scanner Access</h3>
              <p className="text-muted-foreground">
                You need team member permissions to access the QR scanner.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QR Code Scanner</h1>
          <p className="text-muted-foreground">
            Scan QR codes or enter 7-digit backup codes for entry validation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={enableInstantScanner}
            className="bg-green-600 hover:bg-green-700"
            disabled={!selectedEventId}
          >
            <Zap className="h-4 w-4 mr-2" />
            Instant Scanner
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span className="text-sm text-muted-foreground">
              {eventPermissions.teamMemberEvents.length} event{eventPermissions.teamMemberEvents.length !== 1 ? 's' : ''} assigned
            </span>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
          <CardDescription>
            Choose which event you're scanning tickets for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {eventPermissions.teamMemberEvents.map((event) => (
                <SelectItem key={event.event_id} value={event.event_id}>
                  {event.event_title} - {new Date(event.event_date).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEvent && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>Event:</strong> {selectedEvent.event_title}<br />
                <strong>Date:</strong> {new Date(selectedEvent.event_date).toLocaleDateString()}<br />
                <strong>Status:</strong> <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Statistics */}
      {scanStats && selectedEventId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              My Scan Statistics
            </CardTitle>
            <CardDescription>
              Your scanning performance for this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{scanStats.total_scans}</div>
                <div className="text-sm text-muted-foreground">Total Scans</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{scanStats.successful_scans}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{scanStats.failed_scans}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-sm font-bold text-purple-600">
                  {scanStats.last_scan_at 
                    ? new Date(scanStats.last_scan_at).toLocaleTimeString()
                    : 'No scans yet'
                  }
                </div>
                <div className="text-sm text-muted-foreground">Last Scan</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanner Interface */}
      {selectedEventId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Ticket Scanner
            </CardTitle>
            <CardDescription>
              Scan QR codes or enter ticket data manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Camera Scanner Placeholder */}
              <div className="aspect-square bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Camera Scanner</p>
                  <p className="text-sm text-muted-foreground">
                    Point camera at QR code
                  </p>
                  <div className="mt-4">
                    <Badge variant="outline">
                      <Smartphone className="h-3 w-3 mr-1" />
                      Mobile Optimized
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Manual Input */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Manual Entry</label>
                  <Input
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value.toUpperCase())}
                    placeholder="Enter 7-digit code (e.g., ABC123X) or paste QR data"
                    className="mt-2 font-mono"
                    maxLength={50}
                  />
                  <div className="mt-1 text-xs text-muted-foreground">
                    Enter the 7-digit backup code from the ticket or paste QR code data
                  </div>
                </div>
                <Button 
                  onClick={handleManualScan}
                  disabled={!qrInput.trim() || scanning}
                  className="w-full"
                >
                  {scanning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Validating...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Validate Entry Code
                    </>
                  )}
                </Button>
                
                {/* Quick format examples */}
                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                  <strong>Examples:</strong><br />
                  • 7-digit code: <code className="bg-white px-1 rounded">ABC123X</code><br />
                  • QR data: <code className="bg-white px-1 rounded">{"{"}"eventId":"...","ticketId":"..."{"}"}</code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>
              Latest ticket validation results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scanResults.map((result, index) => (
                <div
                  key={`${result.ticket_id}-${index}`}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    result.success 
                      ? 'border-green-300 bg-green-50 shadow-green-100' 
                      : 'border-red-300 bg-red-50 shadow-red-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-full">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-8 h-8 bg-red-600 rounded-full">
                        <XCircle className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div>
                      <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                        {result.message}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {result.holder_name && (
                          <span>Holder: {result.holder_name}</span>
                        )}
                        {result.ticket_type && (
                          <span>Type: {result.ticket_type}</span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {result.scan_method === 'backup_code' ? '7-Digit Code' : 'QR Scan'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {result.timestamp.toLocaleTimeString()}
                    </div>
                    {result.already_used && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        Already Used
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Scanner Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium">Validation Results</h4>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Valid Entry</p>
                    <p className="text-sm text-muted-foreground">
                      Green signal - Allow entry immediately
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Entry Denied</p>
                    <p className="text-sm text-muted-foreground">
                      Red signal - Do not allow entry, check with organizer
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-800">Already Used</p>
                    <p className="text-sm text-muted-foreground">
                      Ticket previously scanned - verify with holder
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Entry Methods</h4>
                <div className="flex items-start gap-3">
                  <QrCode className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">QR Code Scanning</p>
                    <p className="text-sm text-muted-foreground">
                      Use camera or paste QR code data
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block w-5 h-5 bg-purple-600 text-white text-xs rounded text-center leading-5 mt-0.5">7</span>
                  <div>
                    <p className="font-medium">7-Digit Backup Code</p>
                    <p className="text-sm text-muted-foreground">
                      Manual entry when QR code isn't working
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Instant Scanner</p>
                    <p className="text-sm text-muted-foreground">
                      Turn your phone into a dedicated scanner
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Pro Tip:</strong> Each ticket has both a QR code and a 7-digit backup code. 
                Both work independently for entry validation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}