import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Bell, Check, Trash2, Settings, Mail, Smartphone, AlertTriangle } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  read: boolean
  timestamp: string
  category: string
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'New team member joined',
      message: 'Sarah Johnson accepted the invitation to join as Check-in Staff',
      type: 'success',
      read: false,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      category: 'team'
    },
    {
      id: '2',
      title: 'Duplicate ticket detected',
      message: 'Multiple check-in attempts detected for ticket #12345',
      type: 'warning',
      read: false,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      category: 'security'
    },
    {
      id: '3',
      title: 'Payment processed',
      message: 'Payment of $150 successfully processed for Tech Conference tickets',
      type: 'success',
      read: true,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      category: 'payment'
    },
    {
      id: '4',
      title: 'Event published',
      message: 'Summer Music Festival has been published and is now live',
      type: 'info',
      read: true,
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      category: 'event'
    },
    {
      id: '5',
      title: 'Low ticket inventory',
      message: 'Only 5 VIP tickets remaining for Summer Music Festival',
      type: 'warning',
      read: false,
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      category: 'inventory'
    }
  ])

  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    teamUpdates: true,
    securityAlerts: true,
    paymentNotifications: true,
    eventUpdates: false
  })

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

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
                          {new Date(notification.timestamp).toLocaleString()} • {notification.category}
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

              <Button className="w-full">
                Save Settings
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
                  <span className="font-medium">{notifications.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Unread</span>
                  <span className="font-medium">{unreadCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Today</span>
                  <span className="font-medium">
                    {notifications.filter(n => 
                      new Date(n.timestamp).toDateString() === new Date().toDateString()
                    ).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}