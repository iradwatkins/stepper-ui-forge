import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { 
  Shield, 
  Smartphone, 
  Key, 
  Copy, 
  CheckCircle, 
  AlertTriangle,
  Download
} from 'lucide-react'
import { TwoFactorService, TwoFactorSetup as TwoFactorSetupType } from '@/lib/two-factor'

interface TwoFactorSetupProps {
  userId: string
  isEnabled: boolean
  onStatusChange: (enabled: boolean) => void
}

export function TwoFactorSetup({ userId, isEnabled, onStatusChange }: TwoFactorSetupProps) {
  const { toast } = useToast()
  const [showSetup, setShowSetup] = useState(false)
  const [showDisable, setShowDisable] = useState(false)
  const [setupData, setSetupData] = useState<TwoFactorSetupType | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup')

  const handleEnable2FA = async () => {
    setLoading(true)
    try {
      const setup = await TwoFactorService.setup2FA(userId)
      if (setup) {
        setSetupData(setup)
        setShowSetup(true)
        setStep('setup')
      } else {
        toast({
          title: "Setup failed",
          description: "Failed to initialize 2FA setup. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      toast({
        title: "Setup failed",
        description: "An error occurred during 2FA setup.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!setupData || !verificationCode) return

    setLoading(true)
    try {
      const success = await TwoFactorService.enable2FA(userId, verificationCode, setupData.secret)
      if (success) {
        setStep('backup')
        toast({
          title: "2FA enabled",
          description: "Two-factor authentication has been successfully enabled.",
        })
      } else {
        toast({
          title: "Invalid code",
          description: "The verification code is incorrect. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error)
      toast({
        title: "Verification failed",
        description: "Failed to verify the code. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!password) return

    setLoading(true)
    try {
      const success = await TwoFactorService.disable2FA(userId, password)
      if (success) {
        onStatusChange(false)
        setShowDisable(false)
        setPassword('')
        toast({
          title: "2FA disabled",
          description: "Two-factor authentication has been disabled.",
        })
      } else {
        toast({
          title: "Disable failed",
          description: "Failed to disable 2FA. Please check your password.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      toast({
        title: "Disable failed",
        description: "An error occurred while disabling 2FA.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    })
  }

  const completeSetup = () => {
    onStatusChange(true)
    setShowSetup(false)
    setSetupData(null)
    setVerificationCode('')
    setStep('setup')
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Two-Factor Authentication</p>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEnabled && (
            <Badge className="bg-green-100 text-green-800">Enabled</Badge>
          )}
          <Button
            variant={isEnabled ? "outline" : "default"}
            size="sm"
            onClick={isEnabled ? () => setShowDisable(true) : handleEnable2FA}
            disabled={loading}
          >
            {loading ? 'Loading...' : isEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      {/* Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Secure your account with 2FA using an authenticator app
            </DialogDescription>
          </DialogHeader>

          {step === 'setup' && setupData && (
            <div className="space-y-6">
              <div className="text-center">
                <img 
                  src={setupData.qr_code} 
                  alt="QR Code" 
                  className="mx-auto mb-4 border rounded"
                />
                <p className="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Manual Setup Key</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2 py-1 bg-muted rounded text-sm font-mono">
                      {setupData.secret}
                    </code>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyToClipboard(setupData.secret)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Enter this key manually if you can't scan the QR code
                  </p>
                </CardContent>
              </Card>

              <div>
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSetup(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleVerifyCode}
                  disabled={!verificationCode || verificationCode.length !== 6 || loading}
                  className="flex-1"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </div>
            </div>
          )}

          {step === 'backup' && setupData && (
            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication has been successfully enabled!
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Backup Codes
                  </CardTitle>
                  <CardDescription>
                    Save these codes in a safe place. You can use them to access your account if you lose your phone.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {setupData.backup_codes.map((code, index) => (
                      <code key={index} className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {code}
                      </code>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(setupData.backup_codes.join('\n'))}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Copy All Codes
                  </Button>
                </CardContent>
              </Card>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Store these backup codes securely. Each code can only be used once.
                </AlertDescription>
              </Alert>

              <Button onClick={completeSetup} className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Setup
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password to disable 2FA for your account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Disabling 2FA will make your account less secure.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDisable(false)
                  setPassword('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDisable2FA}
                disabled={!password || loading}
                className="flex-1"
              >
                {loading ? 'Disabling...' : 'Disable 2FA'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}