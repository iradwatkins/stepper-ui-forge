import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Settings as SettingsIcon,
  Palette,
  Globe,
  Bell,
  Shield,
  Database,
  Zap,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  Save,
  RotateCcw
} from 'lucide-react'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  // Application Settings State
  const [settings, setSettings] = useState({
    // Appearance
    theme: 'system',
    fontSize: [14],
    reducedMotion: false,
    highContrast: false,
    
    // Notifications
    browserNotifications: true,
    soundEnabled: true,
    soundVolume: [75],
    desktopNotifications: true,
    
    // Performance
    animationsEnabled: true,
    autoSave: true,
    autoSaveInterval: 30,
    cacheEnabled: true,
    
    // Privacy & Security
    analyticsEnabled: true,
    crashReporting: true,
    sessionTimeout: 60,
    
    // Regional
    language: 'en',
    timezone: 'auto',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD'
  })

  useEffect(() => {
    // Load settings from localStorage on mount
    const savedSettings = localStorage.getItem('app-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
  }, [])

  const saveSettings = () => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings))
      
      // Apply theme setting
      if (settings.theme !== theme) {
        setTheme(settings.theme)
      }
      
      toast({
        title: "Settings saved",
        description: "Your preferences have been successfully saved.",
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Save failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      })
    }
  }

  const resetSettings = () => {
    const defaultSettings = {
      theme: 'system',
      fontSize: [14],
      reducedMotion: false,
      highContrast: false,
      browserNotifications: true,
      soundEnabled: true,
      soundVolume: [75],
      desktopNotifications: true,
      animationsEnabled: true,
      autoSave: true,
      autoSaveInterval: 30,
      cacheEnabled: true,
      analyticsEnabled: true,
      crashReporting: true,
      sessionTimeout: 60,
      language: 'en',
      timezone: 'auto',
      dateFormat: 'MM/DD/YYYY',
      currency: 'USD'
    }
    
    setSettings(defaultSettings)
    localStorage.removeItem('app-settings')
    setTheme('system')
    
    toast({
      title: "Settings reset",
      description: "All settings have been restored to defaults.",
    })
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Português' }
  ]

  const currencies = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
    { value: 'AUD', label: 'Australian Dollar (A$)' }
  ]

  const dateFormats = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY' }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Settings Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Customize your application preferences and behavior
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetSettings}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset All
          </Button>
          <Button onClick={saveSettings}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the visual appearance of the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={settings.theme} onValueChange={(value) => updateSetting('theme', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Font Size</Label>
              <div className="space-y-3">
                <Slider
                  value={settings.fontSize}
                  onValueChange={(value) => updateSetting('fontSize', value)}
                  max={20}
                  min={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Small (10px)</span>
                  <span>Current: {settings.fontSize[0]}px</span>
                  <span>Large (20px)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Reduced Motion</Label>
                <p className="text-sm text-gray-500">Minimize animations and transitions</p>
              </div>
              <Switch
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>High Contrast</Label>
                <p className="text-sm text-gray-500">Increase contrast for better visibility</p>
              </div>
              <Switch
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting('highContrast', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how and when you receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Browser Notifications</Label>
                <p className="text-sm text-gray-500">Show notifications in your browser</p>
              </div>
              <Switch
                checked={settings.browserNotifications}
                onCheckedChange={(checked) => updateSetting('browserNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Desktop Notifications</Label>
                <p className="text-sm text-gray-500">Show system notifications on your desktop</p>
              </div>
              <Switch
                checked={settings.desktopNotifications}
                onCheckedChange={(checked) => updateSetting('desktopNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                <div>
                  <Label>Sound Notifications</Label>
                  <p className="text-sm text-gray-500">Play sounds for notifications</p>
                </div>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
              />
            </div>

            {settings.soundEnabled && (
              <div className="space-y-2 ml-6">
                <Label>Sound Volume</Label>
                <div className="space-y-3">
                  <Slider
                    value={settings.soundVolume}
                    onValueChange={(value) => updateSetting('soundVolume', value)}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Silent</span>
                    <span>{settings.soundVolume[0]}%</span>
                    <span>Loud</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance
          </CardTitle>
          <CardDescription>
            Optimize application performance and behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Animations</Label>
                <p className="text-sm text-gray-500">Enable smooth animations and transitions</p>
              </div>
              <Switch
                checked={settings.animationsEnabled}
                onCheckedChange={(checked) => updateSetting('animationsEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Save</Label>
                <p className="text-sm text-gray-500">Automatically save changes</p>
              </div>
              <Switch
                checked={settings.autoSave}
                onCheckedChange={(checked) => updateSetting('autoSave', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Browser Cache</Label>
                <p className="text-sm text-gray-500">Cache data for faster loading</p>
              </div>
              <Switch
                checked={settings.cacheEnabled}
                onCheckedChange={(checked) => updateSetting('cacheEnabled', checked)}
              />
            </div>
          </div>

          {settings.autoSave && (
            <div className="space-y-2">
              <Label>Auto Save Interval</Label>
              <Select 
                value={settings.autoSaveInterval.toString()} 
                onValueChange={(value) => updateSetting('autoSaveInterval', parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Every 15 seconds</SelectItem>
                  <SelectItem value="30">Every 30 seconds</SelectItem>
                  <SelectItem value="60">Every minute</SelectItem>
                  <SelectItem value="300">Every 5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy & Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Control data collection and security preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Analytics</Label>
                <p className="text-sm text-gray-500">Help improve the app by sharing usage data</p>
              </div>
              <Switch
                checked={settings.analyticsEnabled}
                onCheckedChange={(checked) => updateSetting('analyticsEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Crash Reporting</Label>
                <p className="text-sm text-gray-500">Automatically report crashes and errors</p>
              </div>
              <Switch
                checked={settings.crashReporting}
                onCheckedChange={(checked) => updateSetting('crashReporting', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label>Session Timeout</Label>
              <Select 
                value={settings.sessionTimeout.toString()} 
                onValueChange={(value) => updateSetting('sessionTimeout', parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional
          </CardTitle>
          <CardDescription>
            Configure language, timezone, and formatting preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={settings.currency} onValueChange={(value) => updateSetting('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select value={settings.dateFormat} onValueChange={(value) => updateSetting('dateFormat', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateFormats.map(format => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Settings Summary
          </CardTitle>
          <CardDescription>
            Overview of your current configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Theme</p>
              <Badge variant="secondary">{settings.theme}</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Language</p>
              <Badge variant="secondary">
                {languages.find(l => l.value === settings.language)?.label}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Currency</p>
              <Badge variant="secondary">
                {currencies.find(c => c.value === settings.currency)?.label}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Notifications</p>
              <Badge variant={settings.browserNotifications ? "default" : "secondary"}>
                {settings.browserNotifications ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Auto Save</p>
              <Badge variant={settings.autoSave ? "default" : "secondary"}>
                {settings.autoSave ? `${settings.autoSaveInterval}s` : "Disabled"}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Analytics</p>
              <Badge variant={settings.analyticsEnabled ? "default" : "secondary"}>
                {settings.analyticsEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}