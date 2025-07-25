import { supabase } from '@/lib/supabase'

export type NotificationType = 'info' | 'warning' | 'success' | 'error'
export type NotificationCategory = 'team' | 'security' | 'payment' | 'event' | 'inventory' | 'follower' | 'ticket' | 'system'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  category: NotificationCategory
  read: boolean
  metadata?: Record<string, any>
  event_id?: string
  order_id?: string
  ticket_id?: string
  created_at: string
  updated_at: string
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  teamUpdates: boolean
  securityAlerts: boolean
  paymentNotifications: boolean
  eventUpdates: boolean
}

export class NotificationService {
  /**
   * Get user's notifications
   */
  static async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean
      category?: NotificationCategory
      limit?: number
      offset?: number
    }
  ): Promise<Notification[]> {
    try {
      let query = supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (options?.unreadOnly) {
        query = query.eq('read', false)
      }

      if (options?.category) {
        query = query.eq('category', options.category)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  }

  /**
   * Get notification counts
   */
  static async getNotificationCounts(userId: string): Promise<{
    total: number
    unread: number
    today: number
    byCategory: Record<NotificationCategory, number>
  }> {
    try {
      // Get total and unread counts
      const [totalResult, unreadResult, todayResult] = await Promise.all([
        supabase
          .from('user_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('user_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false),
        supabase
          .from('user_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', new Date().toISOString().split('T')[0])
      ])

      // Get counts by category
      const { data: categoryData } = await supabase
        .from('user_notifications')
        .select('category')
        .eq('user_id', userId)

      const byCategory = (categoryData || []).reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {} as Record<NotificationCategory, number>)

      return {
        total: totalResult.count || 0,
        unread: unreadResult.count || 0,
        today: todayResult.count || 0,
        byCategory
      }
    } catch (error) {
      console.error('Error fetching notification counts:', error)
      return {
        total: 0,
        unread: 0,
        today: 0,
        byCategory: {} as Record<NotificationCategory, number>
      }
    }
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(userId: string, notificationIds?: string[]): Promise<boolean> {
    try {
      if (notificationIds && notificationIds.length > 0) {
        // Mark specific notifications as read
        const { error } = await supabase
          .from('user_notifications')
          .update({ read: true, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .in('id', notificationIds)

        if (error) throw error
      } else {
        // Mark all as read
        const { error } = await supabase
          .from('user_notifications')
          .update({ read: true, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('read', false)

        if (error) throw error
      }

      return true
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      return false
    }
  }

  /**
   * Delete notifications
   */
  static async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', userId)
        .eq('id', notificationId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  }

  /**
   * Get notification settings from user profile
   */
  static async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single()

      if (error) throw error

      const prefs = data?.notification_preferences || {}
      
      return {
        email: prefs.emailUpdates !== false,
        push: prefs.pushNotifications !== false,
        teamUpdates: prefs.teamUpdates !== false,
        securityAlerts: prefs.securityAlerts !== false,
        paymentNotifications: prefs.paymentNotifications !== false,
        eventUpdates: prefs.eventUpdates !== false
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
      return {
        email: true,
        push: true,
        teamUpdates: true,
        securityAlerts: true,
        paymentNotifications: true,
        eventUpdates: false
      }
    }
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(
    userId: string,
    settings: NotificationSettings
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: {
            emailUpdates: settings.email,
            pushNotifications: settings.push,
            teamUpdates: settings.teamUpdates,
            securityAlerts: settings.securityAlerts,
            paymentNotifications: settings.paymentNotifications,
            eventUpdates: settings.eventUpdates
          }
        })
        .eq('id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating notification settings:', error)
      return false
    }
  }

  /**
   * Create a notification (typically called from server-side)
   */
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'info',
    category: NotificationCategory = 'system',
    metadata?: Record<string, any>,
    relatedIds?: {
      eventId?: string
      orderId?: string
      ticketId?: string
    }
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_title: title,
        p_message: message,
        p_type: type,
        p_category: category,
        p_metadata: metadata || {},
        p_event_id: relatedIds?.eventId || null,
        p_order_id: relatedIds?.orderId || null,
        p_ticket_id: relatedIds?.ticketId || null
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating notification:', error)
      return null
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  static subscribeToNotifications(
    userId: string,
    onNewNotification: (notification: Notification) => void
  ) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onNewNotification(payload.new as Notification)
        }
      )
      .subscribe()
  }
}