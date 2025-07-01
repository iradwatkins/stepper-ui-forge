/**
 * Team Communication Service for Epic 4.0
 * 
 * Provides real-time communication features for event teams including:
 * - Team chat/messaging
 * - Event announcements
 * - Status updates
 * - Emergency alerts
 */

import { supabase } from '@/lib/supabase'

export interface TeamMessage {
  id: string
  event_id: string
  sender_id: string
  sender_name: string
  sender_role: string
  message_type: 'chat' | 'announcement' | 'alert' | 'status_update'
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  channel: 'general' | 'security' | 'customer_service' | 'management'
  read_by: string[] // Array of user IDs who have read the message
  created_at: string
  updated_at: string
  metadata?: {
    alert_type?: 'security' | 'technical' | 'medical' | 'weather'
    mentioned_users?: string[]
    reply_to?: string
    attachments?: string[]
  }
}

export interface TeamAnnouncement {
  id: string
  event_id: string
  title: string
  content: string
  author_id: string
  author_name: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  target_roles: string[] // Which roles should see this announcement
  acknowledgment_required: boolean
  acknowledged_by: string[]
  expires_at?: string
  created_at: string
}

export interface TeamStatus {
  user_id: string
  user_name: string
  role: string
  status: 'online' | 'away' | 'busy' | 'offline'
  current_activity: string
  location?: string
  last_seen: string
  session_id?: string
}

export interface NotificationPreferences {
  user_id: string
  event_id: string
  enable_chat_notifications: boolean
  enable_announcement_notifications: boolean
  enable_alert_notifications: boolean
  notification_sound: boolean
  notification_channels: ('email' | 'push' | 'sms')[]
  quiet_hours_start?: string
  quiet_hours_end?: string
}

export class TeamCommunicationService {
  private static messageSubscribers: ((message: TeamMessage) => void)[] = []
  private static announcementSubscribers: ((announcement: TeamAnnouncement) => void)[] = []
  private static statusSubscribers: ((statuses: TeamStatus[]) => void)[] = []

  /**
   * Subscribe to real-time team messages
   */
  static subscribeToMessages(
    eventId: string,
    callback: (message: TeamMessage) => void
  ): () => void {
    this.messageSubscribers.push(callback)

    // Set up Supabase real-time subscription
    const subscription = supabase
      .channel(`team_messages_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          const message = payload.new as TeamMessage
          callback(message)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
      const index = this.messageSubscribers.indexOf(callback)
      if (index > -1) this.messageSubscribers.splice(index, 1)
    }
  }

  /**
   * Send a team message
   */
  static async sendMessage(
    eventId: string,
    content: string,
    messageType: TeamMessage['message_type'] = 'chat',
    channel: TeamMessage['channel'] = 'general',
    priority: TeamMessage['priority'] = 'normal',
    metadata?: TeamMessage['metadata']
  ): Promise<{ success: boolean; message?: TeamMessage; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Get user's team member info
      const { data: teamMember } = await supabase
        .from('team_members')
        .select(`
          role_type,
          user_profile:profiles!team_members_user_id_fkey (full_name)
        `)
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single()

      if (!teamMember) {
        return { success: false, error: 'User is not a team member for this event' }
      }

      const message: Omit<TeamMessage, 'id'> = {
        event_id: eventId,
        sender_id: user.id,
        sender_name: teamMember.user_profile?.full_name || 'Unknown',
        sender_role: teamMember.role_type,
        message_type: messageType,
        content: content.trim(),
        priority,
        channel,
        read_by: [user.id], // Sender has read their own message
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata
      }

      const { data, error } = await supabase
        .from('team_messages')
        .insert(message)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, message: data }

    } catch (error) {
      console.error('TeamCommunicationService.sendMessage failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      }
    }
  }

  /**
   * Get team messages for a channel
   */
  static async getMessages(
    eventId: string,
    channel: TeamMessage['channel'] = 'general',
    limit: number = 50,
    before?: string
  ): Promise<{ success: boolean; messages: TeamMessage[]; error?: string }> {
    try {
      let query = supabase
        .from('team_messages')
        .select('*')
        .eq('event_id', eventId)
        .eq('channel', channel)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (before) {
        query = query.lt('created_at', before)
      }

      const { data, error } = await query

      if (error) {
        return { success: false, messages: [], error: error.message }
      }

      return { success: true, messages: (data || []).reverse() }

    } catch (error) {
      console.error('TeamCommunicationService.getMessages failed:', error)
      return {
        success: false,
        messages: [],
        error: error instanceof Error ? error.message : 'Failed to fetch messages'
      }
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(
    messageIds: string[],
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // This would require updating the read_by array in PostgreSQL
      // For now, we'll use a simplified approach
      const { error } = await supabase
        .rpc('mark_messages_read', {
          message_ids: messageIds,
          user_id: userId
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }

    } catch (error) {
      console.error('TeamCommunicationService.markMessagesAsRead failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark messages as read'
      }
    }
  }

  /**
   * Send team announcement
   */
  static async sendAnnouncement(
    eventId: string,
    title: string,
    content: string,
    priority: TeamAnnouncement['priority'] = 'normal',
    targetRoles: string[] = [],
    requireAcknowledgment: boolean = false,
    expiresAt?: string
  ): Promise<{ success: boolean; announcement?: TeamAnnouncement; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Get user's info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const announcement: Omit<TeamAnnouncement, 'id'> = {
        event_id: eventId,
        title: title.trim(),
        content: content.trim(),
        author_id: user.id,
        author_name: profile?.full_name || 'Unknown',
        priority,
        target_roles: targetRoles,
        acknowledgment_required: requireAcknowledgment,
        acknowledged_by: [],
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('team_announcements')
        .insert(announcement)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Notify subscribers
      this.announcementSubscribers.forEach(callback => callback(data))

      return { success: true, announcement: data }

    } catch (error) {
      console.error('TeamCommunicationService.sendAnnouncement failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send announcement'
      }
    }
  }

  /**
   * Get team announcements
   */
  static async getAnnouncements(
    eventId: string,
    activeOnly: boolean = true
  ): Promise<{ success: boolean; announcements: TeamAnnouncement[]; error?: string }> {
    try {
      let query = supabase
        .from('team_announcements')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (activeOnly) {
        const now = new Date().toISOString()
        query = query.or(`expires_at.is.null,expires_at.gt.${now}`)
      }

      const { data, error } = await query

      if (error) {
        return { success: false, announcements: [], error: error.message }
      }

      return { success: true, announcements: data || [] }

    } catch (error) {
      console.error('TeamCommunicationService.getAnnouncements failed:', error)
      return {
        success: false,
        announcements: [],
        error: error instanceof Error ? error.message : 'Failed to fetch announcements'
      }
    }
  }

  /**
   * Acknowledge an announcement
   */
  static async acknowledgeAnnouncement(
    announcementId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .rpc('acknowledge_announcement', {
          announcement_id: announcementId,
          user_id: userId
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }

    } catch (error) {
      console.error('TeamCommunicationService.acknowledgeAnnouncement failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to acknowledge announcement'
      }
    }
  }

  /**
   * Update team member status
   */
  static async updateStatus(
    eventId: string,
    status: TeamStatus['status'],
    activity: string,
    location?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Update or insert status
      const { error } = await supabase
        .from('team_status')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          status,
          current_activity: activity,
          location,
          last_seen: new Date().toISOString()
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }

    } catch (error) {
      console.error('TeamCommunicationService.updateStatus failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status'
      }
    }
  }

  /**
   * Get team member statuses
   */
  static async getTeamStatuses(
    eventId: string
  ): Promise<{ success: boolean; statuses: TeamStatus[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('team_status')
        .select(`
          *,
          user_profile:profiles!team_status_user_id_fkey (full_name),
          team_member:team_members!inner (role_type)
        `)
        .eq('event_id', eventId)
        .eq('team_members.event_id', eventId)

      if (error) {
        return { success: false, statuses: [], error: error.message }
      }

      const statuses: TeamStatus[] = (data || []).map(item => ({
        user_id: item.user_id,
        user_name: item.user_profile?.full_name || 'Unknown',
        role: item.team_member?.role_type || 'member',
        status: item.status,
        current_activity: item.current_activity,
        location: item.location,
        last_seen: item.last_seen,
        session_id: item.session_id
      }))

      return { success: true, statuses }

    } catch (error) {
      console.error('TeamCommunicationService.getTeamStatuses failed:', error)
      return {
        success: false,
        statuses: [],
        error: error instanceof Error ? error.message : 'Failed to fetch team statuses'
      }
    }
  }

  /**
   * Send emergency alert
   */
  static async sendEmergencyAlert(
    eventId: string,
    alertType: 'security' | 'technical' | 'medical' | 'weather',
    message: string,
    location?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.sendMessage(
        eventId,
        message,
        'alert',
        'general',
        'urgent',
        {
          alert_type: alertType,
          ...(location && { location })
        }
      )

      if (!result.success) {
        return result
      }

      // Also create an announcement for persistent visibility
      await this.sendAnnouncement(
        eventId,
        `${alertType.toUpperCase()} ALERT`,
        message,
        'urgent',
        [], // All roles
        true, // Require acknowledgment
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expires in 24 hours
      )

      return { success: true }

    } catch (error) {
      console.error('TeamCommunicationService.sendEmergencyAlert failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send emergency alert'
      }
    }
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(
    eventId: string,
    userId: string,
    channel?: TeamMessage['channel']
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      let query = supabase
        .from('team_messages')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .not('read_by', 'cs', `{${userId}}`) // Not in read_by array

      if (channel) {
        query = query.eq('channel', channel)
      }

      const { count, error } = await query

      if (error) {
        return { success: false, count: 0, error: error.message }
      }

      return { success: true, count: count || 0 }

    } catch (error) {
      console.error('TeamCommunicationService.getUnreadCount failed:', error)
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Failed to get unread count'
      }
    }
  }
}