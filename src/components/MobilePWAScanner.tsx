import React, { useState, useRef, useEffect } from 'react'
import { 
  Camera, 
  Flashlight, 
  FlashlightOff, 
  RotateCcw, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  Wifi, 
  WifiOff,
  Users,
  Clock,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useQRValidation } from '@/lib/hooks/useQRValidation'
import { TeamService } from '@/lib/services/TeamService'
import { QRValidationService } from '@/lib/services/QRValidationService'
import QrScanner from 'qr-scanner'

interface MobilePWAScannerProps {
  eventId: string
  onValidation?: (result: any) => void
  onCheckIn?: (result: any) => void
  autoCheckIn?: boolean
  mode?: 'validate' | 'checkin' | 'both'
}

export function MobilePWAScanner({ 
  eventId,
  onValidation, 
  onCheckIn, 
  autoCheckIn = true, 
  mode = 'checkin' 
}: MobilePWAScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [flashlightOn, setFlashlightOn] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment')
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online')
  const [queuedScans, setQueuedScans] = useState<any[]>([])
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    scanned: 0,
    validated: 0,
    checkedIn: 0,
    startTime: null as Date | null
  })
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scannerRef = useRef<any>(null)

  const {
    isValidating,
    isCheckingIn,
    lastValidation,
    lastCheckIn,
    error,
    validateQR,
    checkInTicket,
    validateAndCheckIn,
    clearState,
    clearError
  } = useQRValidation()

  // Network status monitoring
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(navigator.onLine ? 'online' : 'offline')
    }

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)
    updateNetworkStatus()

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
    }
  }, [])

  // Start check-in session when component mounts
  useEffect(() => {
    startCheckInSession()
    return () => {
      stopCheckInSession()
    }
  }, [eventId])

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const startCheckInSession = async () => {
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        timestamp: new Date().toISOString()
      }

      const result = await TeamService.startCheckInSession(eventId, deviceInfo)
      if (result.success) {
        setSessionActive(true)
        setSessionStats(prev => ({
          ...prev,
          startTime: new Date()
        }))
      }
    } catch (error) {
      console.error('Failed to start check-in session:', error)
    }
  }

  const stopCheckInSession = async () => {
    if (sessionActive) {
      // Note: Would need to track session ID for this to work
      setSessionActive(false)
    }
  }

  const initializeCamera = async () => {
    try {
      // Stop existing scanner if running
      if (scannerRef.current) {
        scannerRef.current.stop()
        scannerRef.current.destroy()
        scannerRef.current = null
      }

      if (videoRef.current) {
        // Initialize QR scanner
        scannerRef.current = new QrScanner(
          videoRef.current,
          (result) => handleQRCodeDetected(result.data),
          {
            preferredCamera: cameraFacing,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 1,
            calculateScanRegion: (video) => {
              // Create a centered scan region (80% of video dimensions)
              const smallestDimension = Math.min(video.videoWidth, video.videoHeight)
              const scanRegionSize = Math.round(0.8 * smallestDimension)
              
              return {
                x: Math.round((video.videoWidth - scanRegionSize) / 2),
                y: Math.round((video.videoHeight - scanRegionSize) / 2),
                width: scanRegionSize,
                height: scanRegionSize
              }
            }
          }
        )

        // Start scanning
        await scannerRef.current.start()
        setIsScanning(true)
      }
    } catch (error) {
      console.error('Camera initialization failed:', error)
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    // Stop QR scanner
    if (scannerRef.current) {
      scannerRef.current.stop()
      scannerRef.current.destroy()
      scannerRef.current = null
    }
    
    // Stop media stream (if any)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setIsScanning(false)
  }

  const toggleFlashlight = async () => {
    try {
      if (scannerRef.current) {
        // Use QR scanner's flashlight control
        if (flashlightOn) {
          await scannerRef.current.turnFlashlightOff()
        } else {
          await scannerRef.current.turnFlashlightOn()
        }
        setFlashlightOn(!flashlightOn)
      }
    } catch (error) {
      console.error('Flashlight toggle failed:', error)
    }
  }

  const switchCamera = async () => {
    try {
      const newFacing = cameraFacing === 'user' ? 'environment' : 'user'
      setCameraFacing(newFacing)
      
      if (scannerRef.current && isScanning) {
        // Switch camera using QR scanner's method
        await scannerRef.current.setCamera(newFacing)
      }
    } catch (error) {
      console.error('Camera switch failed:', error)
      // Fallback to restart
      if (isScanning) {
        stopCamera()
        setTimeout(initializeCamera, 100)
      }
    }
  }

  const handleQRCodeDetected = async (qrData: string) => {
    try {
      setSessionStats(prev => ({
        ...prev,
        scanned: prev.scanned + 1
      }))

      if (networkStatus === 'offline') {
        // Queue for later sync
        const queuedScan = {
          qrData,
          timestamp: new Date().toISOString(),
          mode,
          synced: false
        }
        setQueuedScans(prev => [...prev, queuedScan])
        return
      }

      if (mode === 'checkin' || (mode === 'both' && autoCheckIn)) {
        const result = await validateAndCheckIn(qrData)
        onCheckIn?.(result)
        
        if (result.success) {
          setSessionStats(prev => ({
            ...prev,
            validated: prev.validated + 1,
            checkedIn: prev.checkedIn + 1
          }))
        }
      } else {
        const result = await validateQR(qrData)
        onValidation?.(result)
        
        if (result.valid) {
          setSessionStats(prev => ({
            ...prev,
            validated: prev.validated + 1
          }))
        }
      }
    } catch (error) {
      console.error('QR code processing failed:', error)
    }
  }

  const syncQueuedScans = async () => {
    for (const scan of queuedScans) {
      if (!scan.synced) {
        try {
          await handleQRCodeDetected(scan.qrData)
          scan.synced = true
        } catch (error) {
          console.error('Failed to sync queued scan:', error)
        }
      }
    }
    setQueuedScans(prev => prev.filter(scan => !scan.synced))
  }

  // Auto-sync when coming back online
  useEffect(() => {
    if (networkStatus === 'online' && queuedScans.length > 0) {
      syncQueuedScans()
    }
  }, [networkStatus])

  const renderNetworkStatus = () => (
    <div className="flex items-center space-x-2">
      {networkStatus === 'online' ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">Offline</span>
          {queuedScans.length > 0 && (
            <Badge variant="secondary">{queuedScans.length} queued</Badge>
          )}
        </>
      )}
    </div>
  )

  const formatSessionTime = () => {
    if (!sessionStats.startTime) return '00:00'
    const now = new Date()
    const diff = now.getTime() - sessionStats.startTime.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const renderValidationResult = () => {
    if (!lastValidation && !lastCheckIn) return null

    const result = lastCheckIn || lastValidation
    const isSuccess = lastCheckIn ? lastCheckIn.success : lastValidation?.valid

    return (
      <Card className={`mt-4 ${isSuccess ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            {isSuccess ? (
              <Check className="w-6 h-6 text-green-500" />
            ) : (
              <X className="w-6 h-6 text-red-500" />
            )}
            <span className={`font-medium ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
              {result?.message || (isSuccess ? 'Success' : 'Failed')}
            </span>
          </div>

          {lastValidation?.ticket && (
            <div className="space-y-2 text-sm">
              <div><strong>Name:</strong> {lastValidation.ticket.holder_name || 'Guest'}</div>
              <div><strong>Email:</strong> {lastValidation.ticket.holder_email}</div>
              <div><strong>Type:</strong> {lastValidation.ticket.ticket_types?.name || 'General'}</div>
              <div><strong>Status:</strong> 
                <Badge className="ml-2" variant={
                  lastValidation.ticket.status === 'active' ? 'default' : 'secondary'
                }>
                  {lastValidation.ticket.status?.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">Event Check-in</h1>
          {renderNetworkStatus()}
        </div>
        
        {/* Session Stats */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <div className="font-medium">{sessionStats.scanned}</div>
            <div className="text-gray-400">Scanned</div>
          </div>
          <div>
            <div className="font-medium">{sessionStats.validated}</div>
            <div className="text-gray-400">Valid</div>
          </div>
          <div>
            <div className="font-medium">{sessionStats.checkedIn}</div>
            <div className="text-gray-400">Checked In</div>
          </div>
          <div>
            <div className="font-medium">{formatSessionTime()}</div>
            <div className="text-gray-400">Session</div>
          </div>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative h-96 bg-black flex items-center justify-center">
        {isScanning ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
        ) : (
          <div className="text-white text-center">
            <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Camera not active</p>
          </div>
        )}

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white border-dashed rounded-lg"></div>
          </div>
        )}

        {/* Camera controls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleFlashlight}
            className="rounded-full"
          >
            {flashlightOn ? <FlashlightOff className="w-5 h-5" /> : <Flashlight className="w-5 h-5" />}
          </Button>
          
          <Button
            variant="secondary"
            size="icon"
            onClick={switchCamera}
            className="rounded-full"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4">
        {!isScanning ? (
          <Button onClick={initializeCamera} className="w-full" size="lg">
            <Camera className="w-5 h-5 mr-2" />
            Start Camera
          </Button>
        ) : (
          <Button onClick={stopCamera} variant="outline" className="w-full" size="lg">
            Stop Camera
          </Button>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {(isValidating || isCheckingIn) && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Processing...</span>
          </div>
        )}

        {/* Validation Result */}
        {renderValidationResult()}

        {/* Manual Clear */}
        {(lastValidation || lastCheckIn) && (
          <Button onClick={clearState} variant="outline" className="w-full">
            Clear Result
          </Button>
        )}
      </div>

      {/* PWA Install Prompt - would be shown when app is installable */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-sm text-gray-600 text-center">
          Add this app to your home screen for better offline performance
        </p>
      </div>
    </div>
  )
}