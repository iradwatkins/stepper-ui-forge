import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  Settings, 
  Save, 
  Shield, 
  DollarSign, 
  Mail, 
  Database,
  AlertTriangle,
  Info
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    platformName: 'SteppersLife',
    supportEmail: 'support@stepperslife.com',
    defaultCommissionRate: 10,
    enableUserRegistration: true,
    enableEventCreation: true,
    requireEventApproval: false,
    enablePayments: true,
    maintenanceMode: false,
    maxFileSize: 10,
    allowedFileTypes: 'jpg,png,pdf',
    emailNotifications: true,
    smsNotifications: false,
    welcomeMessage: 'Welcome to SteppersLife! Start by exploring events and following organizers.',
    termsOfService: '',
    privacyPolicy: ''
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // TODO: Implement actual save functionality
    console.log('Saving settings:', settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">Configure platform settings and policies</p>
        </div>
        <Button onClick={handleSave} disabled={saved}>
          <Save className="h-4 w-4 mr-2" />
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {saved && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>Settings have been saved successfully.</AlertDescription>
        </Alert>
      )}

      {/* Platform Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Platform Configuration
          </CardTitle>
          <CardDescription>Basic platform settings and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={settings.platformName}
                onChange={(e) => updateSetting('platformName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => updateSetting('supportEmail', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <Textarea
              id="welcomeMessage"
              value={settings.welcomeMessage}
              onChange={(e) => updateSetting('welcomeMessage', e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Business Configuration
          </CardTitle>
          <CardDescription>Commission rates and payment settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="commissionRate">Default Commission Rate (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                min="0"
                max="100"
                value={settings.defaultCommissionRate}
                onChange={(e) => updateSetting('defaultCommissionRate', parseInt(e.target.value))}
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="enablePayments"
                checked={settings.enablePayments}
                onCheckedChange={(checked) => updateSetting('enablePayments', checked)}
              />
              <Label htmlFor="enablePayments">Enable Payment Processing</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User & Content Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User & Content Management
          </CardTitle>
          <CardDescription>Control user registration and content policies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableUserRegistration"
                  checked={settings.enableUserRegistration}
                  onCheckedChange={(checked) => updateSetting('enableUserRegistration', checked)}
                />
                <Label htmlFor="enableUserRegistration">Enable User Registration</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableEventCreation"
                  checked={settings.enableEventCreation}
                  onCheckedChange={(checked) => updateSetting('enableEventCreation', checked)}
                />
                <Label htmlFor="enableEventCreation">Enable Event Creation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="requireEventApproval"
                  checked={settings.requireEventApproval}
                  onCheckedChange={(checked) => updateSetting('requireEventApproval', checked)}
                />
                <Label htmlFor="requireEventApproval">Require Event Approval</Label>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.maxFileSize}
                  onChange={(e) => updateSetting('maxFileSize', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
                <Input
                  id="allowedFileTypes"
                  value={settings.allowedFileTypes}
                  onChange={(e) => updateSetting('allowedFileTypes', e.target.value)}
                  placeholder="jpg,png,pdf"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Configure system notifications and communications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
              />
              <Label htmlFor="emailNotifications">Enable Email Notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="smsNotifications"
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
              />
              <Label htmlFor="smsNotifications">Enable SMS Notifications</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Maintenance
          </CardTitle>
          <CardDescription>System-wide controls and maintenance options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
            />
            <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
          </div>
          {settings.maintenanceMode && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Maintenance mode will prevent users from accessing the platform. Only administrators will be able to log in.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="pt-4">
            <h4 className="font-medium mb-2">System Actions</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Clear Cache
              </Button>
              <Button variant="outline" size="sm">
                Backup Database
              </Button>
              <Button variant="outline" size="sm">
                Generate Reports
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Legal Documents</CardTitle>
          <CardDescription>Terms of service and privacy policy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="termsOfService">Terms of Service</Label>
            <Textarea
              id="termsOfService"
              value={settings.termsOfService}
              onChange={(e) => updateSetting('termsOfService', e.target.value)}
              rows={6}
              placeholder="Enter your terms of service..."
            />
          </div>
          <div>
            <Label htmlFor="privacyPolicy">Privacy Policy</Label>
            <Textarea
              id="privacyPolicy"
              value={settings.privacyPolicy}
              onChange={(e) => updateSetting('privacyPolicy', e.target.value)}
              rows={6}
              placeholder="Enter your privacy policy..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}