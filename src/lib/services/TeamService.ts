/**
 * Team Service for managing event team members, invitations, and roles
 * 
 * This service provides functionality for Epic 4.0 team management including:
 * - Team member invitation workflow
 * - Role-based permission management
 * - Check-in session tracking
 * - Team activity monitoring
 */

import { supabase } from '@/lib/supabase'
import { EmailService, EmailResult } from './EmailService'

// Team role types matching database enum
export type TeamRole = 
  | 'event_manager'
  | 'check_in_staff' 
  | 'customer_service'
  | 'security'
  | 'vendor_coordinator'

export interface TeamMember {
  id: string
  event_id: string
  user_id: string
  role_type: TeamRole
  permissions: Record<string, boolean>
  invited_by: string
  invited_at: string
  accepted_at: string | null
  last_active: string | null
  device_info: Record<string, any>
  notification_preferences: {
    email_notifications: boolean
    push_notifications: boolean
    sms_notifications: boolean
  }
  user_profile?: {
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface TeamInvitation {
  id: string
  event_id: string
  invited_email: string
  invited_by: string
  role: TeamRole
  permissions: Record<string, boolean>
  invitation_token: string
  invitation_message: string | null
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at: string
  updated_at: string
  invited_by_profile?: {
    full_name: string | null
    email: string
  }
  event_details?: {
    title: string
    date: string
    time: string
    location: string
  }
}

export interface CheckInSession {
  id: string
  event_id: string
  staff_member_id: string
  device_info: Record<string, any>
  session_start: string
  session_end: string | null
  is_active: boolean
  offline_sync_pending: boolean
  created_at: string
  updated_at: string
  staff_profile?: {
    full_name: string | null
    email: string
  }
}

export interface TeamStats {
  total_members: number
  active_sessions: number
  roles_breakdown: Record<TeamRole, number>
  recent_activity: {
    new_members: number
    check_ins_today: number
    pending_invitations: number
  }
}

export interface ServiceResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export class TeamService {
  /**
   * Get all team members for an event
   */
  static async getEventTeamMembers(eventId: string): Promise<ServiceResult<TeamMember[]>> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          user_profile:profiles!team_members_user_id_fkey (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to fetch team members'
        }
      }

      return {
        success: true,
        data: data || [],
        message: `Found ${data?.length || 0} team members`
      }
    } catch (error) {
      console.error('TeamService.getEventTeamMembers failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch team members'
      }
    }
  }

  /**
   * Invite a team member to an event
   */
  static async inviteTeamMember(
    eventId: string,
    invitedEmail: string,
    role: TeamRole,
    invitationMessage?: string
  ): Promise<ServiceResult<TeamInvitation>> {
    try {
      // Check if user is already a team member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id, user_profile:profiles!team_members_user_id_fkey (email)')
        .eq('event_id', eventId)
        .eq('user_profile.email', invitedEmail)
        .single()

      if (existingMember) {
        return {
          success: false,
          error: 'User is already a team member',
          message: 'This person is already part of the team'
        }
      }

      // Check for existing pending invitation
      const { data: existingInvitation } = await supabase
        .from('team_invitations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('invited_email', invitedEmail)
        .eq('status', 'pending')
        .single()

      if (existingInvitation) {
        return {
          success: false,
          error: 'Invitation already pending',
          message: 'An invitation is already pending for this email'
        }
      }

      // Create new invitation
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      const { data: invitation, error } = await supabase
        .from('team_invitations')
        .insert({
          event_id: eventId,
          invited_email: invitedEmail,
          role: role,
          invitation_message: invitationMessage,
          expires_at: expiresAt.toISOString()
        })
        .select(`
          *,
          invited_by_profile:profiles!team_invitations_invited_by_fkey (
            full_name,
            email
          ),
          event_details:events!team_invitations_event_id_fkey (
            title,
            date,
            time,
            location
          )
        `)
        .single()

      if (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to create invitation'
        }
      }

      // Send invitation email
      await this.sendInvitationEmail(invitation)

      return {
        success: true,
        data: invitation,
        message: 'Team invitation sent successfully'
      }
    } catch (error) {
      console.error('TeamService.inviteTeamMember failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to send team invitation'
      }
    }
  }

  /**
   * Accept a team invitation
   */
  static async acceptInvitation(invitationToken: string): Promise<ServiceResult<TeamMember>> {
    try {
      // Get invitation details
      const { data: invitation, error: invitationError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('invitation_token', invitationToken)
        .eq('status', 'pending')
        .single()

      if (invitationError || !invitation) {
        return {
          success: false,
          error: 'Invalid or expired invitation',
          message: 'This invitation is not valid or has expired'
        }
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('team_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id)

        return {
          success: false,
          error: 'Invitation expired',
          message: 'This invitation has expired'
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          message: 'Please log in to accept the invitation'
        }
      }

      // Check if the email matches
      if (user.email !== invitation.invited_email) {
        return {
          success: false,
          error: 'Email mismatch',
          message: 'This invitation was sent to a different email address'
        }
      }

      // Create team member record
      const { data: teamMember, error: memberError } = await supabase
        .from('team_members')
        .insert({
          event_id: invitation.event_id,
          user_id: user.id,
          role_type: invitation.role,
          permissions: invitation.permissions,
          invited_by: invitation.invited_by,
          accepted_at: new Date().toISOString()
        })
        .select(`
          *,
          user_profile:profiles!team_members_user_id_fkey (
            email,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (memberError) {
        return {
          success: false,
          error: memberError.message,
          message: 'Failed to join team'
        }
      }

      // Update invitation status
      await supabase
        .from('team_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id
        })
        .eq('id', invitation.id)

      return {
        success: true,
        data: teamMember,
        message: 'Successfully joined the team'
      }
    } catch (error) {
      console.error('TeamService.acceptInvitation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to accept invitation'
      }
    }
  }

  /**
   * Remove a team member from an event
   */
  static async removeTeamMember(eventId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId)

      if (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to remove team member'
        }
      }

      return {
        success: true,
        message: 'Team member removed successfully'
      }
    } catch (error) {
      console.error('TeamService.removeTeamMember failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to remove team member'
      }
    }
  }

  /**
   * Update team member role
   */
  static async updateTeamMemberRole(
    eventId: string,
    userId: string,
    newRole: TeamRole
  ): Promise<ServiceResult<TeamMember>> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .update({
          role_type: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .select(`
          *,
          user_profile:profiles!team_members_user_id_fkey (
            email,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to update team member role'
        }
      }

      return {
        success: true,
        data: data,
        message: 'Team member role updated successfully'
      }
    } catch (error) {
      console.error('TeamService.updateTeamMemberRole failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update team member role'
      }
    }
  }

  /**
   * Start a check-in session for a team member
   */
  static async startCheckInSession(
    eventId: string,
    deviceInfo: Record<string, any> = {}
  ): Promise<ServiceResult<CheckInSession>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          message: 'Please log in to start check-in session'
        }
      }

      // End any existing active sessions for this user/event
      await supabase
        .from('check_in_sessions')
        .update({
          session_end: new Date().toISOString(),
          is_active: false
        })
        .eq('event_id', eventId)
        .eq('staff_member_id', user.id)
        .eq('is_active', true)

      // Create new session
      const { data: session, error } = await supabase
        .from('check_in_sessions')
        .insert({
          event_id: eventId,
          staff_member_id: user.id,
          device_info: deviceInfo,
          is_active: true
        })
        .select(`
          *,
          staff_profile:profiles!check_in_sessions_staff_member_id_fkey (
            full_name,
            email
          )
        `)
        .single()

      if (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to start check-in session'
        }
      }

      return {
        success: true,
        data: session,
        message: 'Check-in session started successfully'
      }
    } catch (error) {
      console.error('TeamService.startCheckInSession failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to start check-in session'
      }
    }
  }

  /**
   * End a check-in session
   */
  static async endCheckInSession(sessionId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('check_in_sessions')
        .update({
          session_end: new Date().toISOString(),
          is_active: false
        })
        .eq('id', sessionId)

      if (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to end check-in session'
        }
      }

      return {
        success: true,
        message: 'Check-in session ended successfully'
      }
    } catch (error) {
      console.error('TeamService.endCheckInSession failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to end check-in session'
      }
    }
  }

  /**
   * Get team statistics for an event
   */
  static async getTeamStats(eventId: string): Promise<ServiceResult<TeamStats>> {
    try {
      // Get team members count and roles breakdown
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('role_type')
        .eq('event_id', eventId)
        .not('accepted_at', 'is', null)

      if (teamError) {
        return {
          success: false,
          error: teamError.message,
          message: 'Failed to fetch team statistics'
        }
      }

      // Get active sessions count
      const { count: activeSessions, error: sessionsError } = await supabase
        .from('check_in_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('is_active', true)

      if (sessionsError) {
        return {
          success: false,
          error: sessionsError.message,
          message: 'Failed to fetch session statistics'
        }
      }

      // Get pending invitations count
      const { count: pendingInvitations, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'pending')

      if (invitationsError) {
        return {
          success: false,
          error: invitationsError.message,
          message: 'Failed to fetch invitation statistics'
        }
      }

      // Calculate roles breakdown
      const rolesBreakdown: Record<TeamRole, number> = {
        event_manager: 0,
        check_in_staff: 0,
        customer_service: 0,
        security: 0,
        vendor_coordinator: 0
      }

      teamMembers?.forEach(member => {
        if (member.role_type in rolesBreakdown) {
          rolesBreakdown[member.role_type as TeamRole]++
        }
      })

      const stats: TeamStats = {
        total_members: teamMembers?.length || 0,
        active_sessions: activeSessions || 0,
        roles_breakdown: rolesBreakdown,
        recent_activity: {
          new_members: 0, // Would need additional query for time-based data
          check_ins_today: 0, // Would need additional query for today's check-ins
          pending_invitations: pendingInvitations || 0
        }
      }

      return {
        success: true,
        data: stats,
        message: 'Team statistics retrieved successfully'
      }
    } catch (error) {
      console.error('TeamService.getTeamStats failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch team statistics'
      }
    }
  }

  /**
   * Check if user has permission for an event
   */
  static async checkUserPermission(
    eventId: string,
    permissionName: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return {
          success: true,
          data: false,
          message: 'User not authenticated'
        }
      }

      const { data, error } = await supabase
        .rpc('user_has_event_permission', {
          user_id: user.id,
          event_id: eventId,
          permission_name: permissionName
        })

      if (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to check user permission'
        }
      }

      return {
        success: true,
        data: data,
        message: data ? 'Permission granted' : 'Permission denied'
      }
    } catch (error) {
      console.error('TeamService.checkUserPermission failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to check user permission'
      }
    }
  }

  /**
   * Send invitation email to team member
   */
  private static async sendInvitationEmail(invitation: TeamInvitation): Promise<EmailResult> {
    try {
      const inviteUrl = `${window.location.origin}/team/accept/${invitation.invitation_token}`
      const roleName = this.getRoleDisplayName(invitation.role)
      
      // For now, log the invitation details (mock email service)
      console.log('📧 Team Invitation Email:')
      console.log(`To: ${invitation.invited_email}`)
      console.log(`Role: ${roleName}`)
      console.log(`Event: ${invitation.event_details?.title}`)
      console.log(`Invitation URL: ${inviteUrl}`)
      console.log(`Expires: ${new Date(invitation.expires_at).toLocaleDateString()}`)
      
      // Mock successful email sending
      return {
        success: true,
        messageId: `team_invite_${Date.now()}`
      }
    } catch (error) {
      console.error('TeamService.sendInvitationEmail failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitation email'
      }
    }
  }

  /**
   * Get display name for team role
   */
  static getRoleDisplayName(role: TeamRole): string {
    const roleNames: Record<TeamRole, string> = {
      event_manager: 'Event Manager',
      check_in_staff: 'Check-in Staff',
      customer_service: 'Customer Service',
      security: 'Security',
      vendor_coordinator: 'Vendor Coordinator'
    }
    return roleNames[role] || role
  }

  /**
   * Get role permissions
   */
  static getRolePermissions(role: TeamRole): Record<string, boolean> {
    const permissions: Record<TeamRole, Record<string, boolean>> = {
      event_manager: {
        view_event: true,
        edit_event: true,
        manage_team: true,
        view_analytics: true,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: true,
        handle_refunds: true
      },
      check_in_staff: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: false,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: false,
        handle_refunds: false
      },
      customer_service: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: false,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: false,
        handle_refunds: true
      },
      security: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: true,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: false,
        handle_refunds: false
      },
      vendor_coordinator: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: false,
        check_in_tickets: false,
        view_attendees: false,
        manage_seating: true,
        handle_refunds: false
      }
    }
    return permissions[role] || {}
  }

  /**
   * Get team member assignments for a user
   */
  static async fetchAssignments(userId: string): Promise<ServiceResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          events!team_members_event_id_fkey (
            id,
            title,
            date,
            venue,
            location,
            organizer_id,
            profiles!events_organizer_id_fkey (
              full_name
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to fetch team assignments'
        }
      }

      // Transform the data to match expected format
      const assignments = data?.map(member => ({
        event_id: member.event_id,
        event_title: member.events?.title || 'Unknown Event',
        event_date: member.events?.date || '',
        event_time: '19:00', // Default time - could be extracted from event data
        event_location: member.events?.venue || member.events?.location || 'TBD',
        organizer_name: member.events?.profiles?.full_name || 'Unknown Organizer',
        role: this.getRoleDisplayName(member.role_type),
        permissions: Object.keys(member.permissions || {}).filter(key => member.permissions[key])
      })) || []

      return {
        success: true,
        data: assignments,
        message: 'Team assignments fetched successfully'
      }
    } catch (error) {
      console.error('TeamService.fetchAssignments failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch team assignments'
      }
    }
  }

  /**
   * Get team member statistics
   */
  static async getTeamMemberStats(userId: string): Promise<ServiceResult<any>> {
    try {
      // Get basic team member data
      const { data: assignments, error: assignError } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', userId)

      if (assignError) {
        return {
          success: false,
          error: assignError.message,
          message: 'Failed to fetch team statistics'
        }
      }

      // Count various metrics
      const now = new Date()
      const upcomingEvents = assignments?.filter(a => {
        // This would need proper date comparison in real implementation
        return true // For now, assume all are upcoming
      }).length || 0

      const stats = {
        eventsWorked: assignments?.length || 0,
        ticketsScanned: 0, // Would require check-in data
        hoursWorked: 0, // Would require session tracking data
        upcomingEvents
      }

      return {
        success: true,
        data: stats,
        message: 'Team statistics fetched successfully'
      }
    } catch (error) {
      console.error('TeamService.getTeamMemberStats failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch team statistics'
      }
    }
  }
}