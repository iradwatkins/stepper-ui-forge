import React, { useState, useRef } from 'react'
import { Camera, Check, X, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useQRValidation } from '@/lib/hooks/useQRValidation'
import { QRValidationService } from '@/lib/services/QRValidationService'

interface QRScannerProps {
  onValidation?: (result: any) => void
  onCheckIn?: (result: any) => void
  autoCheckIn?: boolean
  checkedInBy?: string
  mode?: 'validate' | 'checkin' | 'both'
}

export function QRScanner({ 
  onValidation, 
  onCheckIn, 
  autoCheckIn = false, 
  checkedInBy,
  mode = 'validate' 
}: QRScannerProps) {
  const [qrInput, setQrInput] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
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

  const handleValidateQR = async () => {
    if (!qrInput.trim()) return
    
    try {
      if (mode === 'checkin' || (mode === 'both' && autoCheckIn)) {
        const result = await validateAndCheckIn(qrInput, checkedInBy)
        onCheckIn?.(result)
      } else {
        const result = await validateQR(qrInput)
        onValidation?.(result)
      }
      setQrInput('')
    } catch (err) {
      // Error is handled by the hook
    }
  }

  const handleCheckIn = async () => {
    if (!lastValidation?.ticket?.id) return
    
    try {
      const result = await checkInTicket(lastValidation.ticket.id, checkedInBy)
      onCheckIn?.(result)
    } catch (err) {
      // Error is handled by the hook
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // This would require QR code reading from image
    // For now, just show manual input
    setShowManualInput(true)
  }

  const renderValidationResult = () => {
    if (!lastValidation) return null

    const ticket = lastValidation.ticket
    const formattedTicket = ticket ? QRValidationService.formatTicketForDisplay(ticket) : null

    return (
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            {lastValidation.valid ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
            <span className={`font-medium ${lastValidation.valid ? 'text-green-700' : 'text-red-700'}`}>
              {lastValidation.message}
            </span>
          </div>

          {formattedTicket && (
            <div className="space-y-2 text-sm">
              <div><strong>Holder:</strong> {formattedTicket.holderName}</div>
              <div><strong>Email:</strong> {formattedTicket.holderEmail}</div>
              <div><strong>Event:</strong> {formattedTicket.eventTitle}</div>
              <div><strong>Date:</strong> {formattedTicket.eventDate} at {formattedTicket.eventTime}</div>
              <div><strong>Venue:</strong> {formattedTicket.venue}</div>
              <div><strong>Ticket Type:</strong> {formattedTicket.ticketType}</div>
              <div><strong>Status:</strong> 
                <span className={`ml-1 ${
                  formattedTicket.status === 'active' ? 'text-green-600' : 
                  formattedTicket.status === 'used' ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {formattedTicket.status.toUpperCase()}
                </span>
              </div>
              {formattedTicket.checkedInAt && (
                <div><strong>Checked In:</strong> {formattedTicket.checkedInAt}</div>
              )}
            </div>
          )}

          {lastValidation.valid && formattedTicket?.status === 'active' && mode !== 'validate' && (
            <Button 
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="w-full mt-4"
            >
              {isCheckingIn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking In...
                </>
              ) : (
                'Check In Ticket'
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderCheckInResult = () => {
    if (!lastCheckIn || mode === 'validate') return null

    return (
      <Alert className={`mt-4 ${lastCheckIn.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <AlertCircle className={`h-4 w-4 ${lastCheckIn.success ? 'text-green-600' : 'text-red-600'}`} />
        <AlertDescription className={lastCheckIn.success ? 'text-green-800' : 'text-red-800'}>
          {lastCheckIn.message}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">
              {mode === 'validate' ? 'Validate Ticket' : 
               mode === 'checkin' ? 'Check In Ticket' : 
               'Scan Ticket'}
            </h3>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => setShowManualInput(!showManualInput)}
                className="w-full"
              >
                Manual QR Code Entry
              </Button>

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                Upload QR Code Image
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {showManualInput && (
              <div className="space-y-3">
                <textarea
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Paste or enter QR code data here..."
                  className="w-full p-3 border rounded-md resize-none"
                  rows={3}
                />
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleValidateQR}
                    disabled={!qrInput.trim() || isValidating || isCheckingIn}
                    className="flex-1"
                  >
                    {(isValidating || isCheckingIn) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      mode === 'validate' ? 'Validate' : 
                      mode === 'checkin' ? 'Check In' : 
                      'Process'
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={clearState}
                    disabled={isValidating || isCheckingIn}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {renderValidationResult()}
      {renderCheckInResult()}
    </div>
  )
}