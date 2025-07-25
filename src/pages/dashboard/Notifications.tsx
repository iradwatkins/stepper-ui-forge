import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Bell, Check, Trash2, Settings, Mail, Smartphone, AlertTriangle, Loader2 } from 'lucide-react'
import { 
  NotificationService, 
  type Notification, 
  type NotificationSettings 
} from '@/lib/services/NotificationService'

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: true,
    push: true,
    teamUpdates: true,
    securityAlerts: true,
    paymentNotifications: true,
    eventUpdates: false
  })
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    today: 0
  })

  useEffect(() => {
    if (user) {
      loadNotifications()
      loadNotificationSettings()
      
      // Subscribe to real-time notifications
      const subscription = NotificationService.subscribeToNotifications(
        user.id,
        (newNotification) => {
          setNotifications(prev => [newNotification, ...prev])
          setStats(prev => ({
            ...prev,
            total: prev.total + 1,
            unread: prev.unread + 1,
            today: isToday(newNotification.created_at) ? prev.today + 1 : prev.today
          }))
        }
      )

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const loadNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      const [notifs, counts] = await Promise.all([
        NotificationService.getUserNotifications(user.id),
        NotificationService.getNotificationCounts(user.id)
      ])
      
      setNotifications(notifs)
      setStats({
        total: counts.total,
        unread: counts.unread,
        today: counts.today
      })
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNotificationSettings = async () => {
    if (!user) return

    try {
      const settings = await NotificationService.getNotificationSettings(user.id)
      setNotificationSettings(settings)
    } catch (error) {
      console.error('Failed to load notification settings:', error)
    }
  }

  const markAsRead = async (id: string) => {
    if (!user) return

    const success = await NotificationService.markAsRead(user.id, [id])
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }))
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    const success = await NotificationService.markAsRead(user.id)
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setStats(prev => ({ ...prev, unread: 0 }))
    }
  }

  const deleteNotification = async (id: string) => {
    if (!user) return

    const success = await NotificationService.deleteNotification(user.id, id)
    if (success) {
      const notif = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      setStats(prev => ({
        total: prev.total - 1,
        unread: notif && !notif.read ? prev.unread - 1 : prev.unread,
        today: notif && isToday(notif.created_at) ? prev.today - 1 : prev.today
      }))
    }
  }

  const saveSettings = async () => {
    if (!user) return

    setSavingSettings(true)
    try {
      await NotificationService.updateNotificationSettings(user.id, notificationSettings)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSavingSettings(false)
    }
  }

  const isToday = (timestamp: string) => {
    return new Date(timestamp).toDateString() === new Date().toDateString()
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const unreadCount = stats.unread

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your events, team, and system alerts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Badge variant="secondary">
            {unreadCount} unread
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Notifications List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Recent Notifications
              </CardTitle>
              <CardDescription>
                Latest updates and alerts from your events and team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start justify-between p-4 border rounded-lg ${
                        !notification.read ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{notification.title}</h4>
                          <Badge className={getTypeColor(notification.type)}>
                            {notification.type}
                          </Badge>
                          {!notification.read && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()} • {notification.category}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Delivery Methods */}
              <div>
                <h4 className="font-medium mb-3">Delivery Methods</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Email Notifications</span>
                    </div>
                    <Switch
                      checked={notificationSettings.email}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({ ...prev, email: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Push Notifications</span>
                    </div>
                    <Switch
                      checked={notificationSettings.push}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({ ...prev, push: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div>
                <h4 className="font-medium mb-3">Categories</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Team Updates</span>
                    <Switch
                      checked={notificationSettings.teamUpdates}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({ ...prev, teamUpdates: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Security Alerts</span>
                    <Switch
                      checked={notificationSettings.securityAlerts}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({ ...prev, securityAlerts: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Payment Notifications</span>
                    <Switch
                      checked={notificationSettings.paymentNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({ ...prev, paymentNotifications: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Event Updates</span>
                    <Switch
                      checked={notificationSettings.eventUpdates}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({ ...prev, eventUpdates: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={saveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Total Notifications</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Unread</span>
                  <span className="font-medium">{stats.unread}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Today</span>
                  <span className="font-medium">{stats.today}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}