/**
 * Team Permissions Hook for Epic 4.0 role-based access control
 * 
 * This hook provides a convenient way to check team member permissions
 * and conditionally render UI elements based on user roles
 */

import { useState, useEffect, useCallback } from 'react'
import { TeamService, TeamRole } from '@/lib/services/TeamService'
import { useAuth } from '@/contexts/AuthContext'

export type Permission = 
  | 'view_event'
  | 'edit_event'
  | 'manage_team'
  | 'view_analytics'
  | 'check_in_tickets'
  | 'view_attendees'
  | 'manage_seating'
  | 'handle_refunds'

export interface TeamPermissions {
  // Individual permission checks
  canViewEvent: boolean
  canEditEvent: boolean
  canManageTeam: boolean
  canViewAnalytics: boolean
  canCheckInTickets: boolean
  canViewAttendees: boolean
  canManageSeating: boolean
  canHandleRefunds: boolean
  
  // Role information
  userRole: TeamRole | null
  isEventOwner: boolean
  isTeamMember: boolean
  
  // Utility functions
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  
  // Loading state
  loading: boolean
  error: string | null
}

interface UseTeamPermissionsOptions {
  eventId: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useTeamPermissions({ 
  eventId, 
  autoRefresh = false, 
  refreshInterval = 30000 
}: UseTeamPermissionsOptions): TeamPermissions {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<Record<Permission, boolean>>({
    view_event: false,
    edit_event: false,
    manage_team: false,
    view_analytics: false,
    check_in_tickets: false,
    view_attendees: false,
    manage_seating: false,
    handle_refunds: false
  })
  const [userRole, setUserRole] = useState<TeamRole | null>(null)
  const [isEventOwner, setIsEventOwner] = useState(false)
  const [isTeamMember, setIsTeamMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPermissions = useCallback(async () => {
    if (!user || !eventId) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      // Check if user is event owner first
      // Note: This would require an additional service method to check event ownership
      // For now, we'll assume it's handled by the permission check

      // Get team members to determine user's role
      const teamResult = await TeamService.getEventTeamMembers(eventId)
      
      if (teamResult.success && teamResult.data) {
        const userMember = teamResult.data.find(member => member.user_id === user.id)
        
        if (userMember) {
          setIsTeamMember(true)
          setUserRole(userMember.role_type)
          
          // Get permissions for the user's role
          const rolePermissions = TeamService.getRolePermissions(userMember.role_type)
          setPermissions(rolePermissions)
        } else {
          // User is not a team member, check if they're the event owner
          // This would require checking against the events table
          setIsTeamMember(false)
          setUserRole(null)
          setPermissions({
            view_event: false,
            edit_event: false,
            manage_team: false,
            view_analytics: false,
            check_in_tickets: false,
            view_attendees: false,
            manage_seating: false,
            handle_refunds: false
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions')
      console.error('useTeamPermissions.loadPermissions failed:', err)
    } finally {
      setLoading(false)
    }
  }, [user, eventId])

  // Load permissions on mount and when dependencies change
  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(loadPermissions, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadPermissions])

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (isEventOwner) return true // Event owners have all permissions
    return permissions[permission] || false
  }, [permissions, isEventOwner])

  const hasAnyPermission = useCallback((permissionList: Permission[]): boolean => {
    if (isEventOwner) return true
    return permissionList.some(permission => permissions[permission])
  }, [permissions, isEventOwner])

  const hasAllPermissions = useCallback((permissionList: Permission[]): boolean => {
    if (isEventOwner) return true
    return permissionList.every(permission => permissions[permission])
  }, [permissions, isEventOwner])

  return {
    // Individual permission checks
    canViewEvent: hasPermission('view_event'),
    canEditEvent: hasPermission('edit_event'),
    canManageTeam: hasPermission('manage_team'),
    canViewAnalytics: hasPermission('view_analytics'),
    canCheckInTickets: hasPermission('check_in_tickets'),
    canViewAttendees: hasPermission('view_attendees'),
    canManageSeating: hasPermission('manage_seating'),
    canHandleRefunds: hasPermission('handle_refunds'),
    
    // Role information
    userRole,
    isEventOwner,
    isTeamMember,
    
    // Utility functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Loading state
    loading,
    error
  }
}

/**
 * Hook for checking a single permission
 */
export function usePermission(eventId: string, permission: Permission): {
  hasPermission: boolean
  loading: boolean
  error: string | null
} {
  const permissions = useTeamPermissions({ eventId })
  
  return {
    hasPermission: permissions.hasPermission(permission),
    loading: permissions.loading,
    error: permissions.error
  }
}

/**
 * Hook for checking multiple permissions
 */
export function usePermissions(eventId: string, requiredPermissions: Permission[]): {
  hasAllPermissions: boolean
  hasAnyPermission: boolean
  permissions: Record<Permission, boolean>
  loading: boolean
  error: string | null
} {
  const teamPermissions = useTeamPermissions({ eventId })
  
  const permissionChecks = requiredPermissions.reduce((acc, permission) => {
    acc[permission] = teamPermissions.hasPermission(permission)
    return acc
  }, {} as Record<Permission, boolean>)
  
  return {
    hasAllPermissions: teamPermissions.hasAllPermissions(requiredPermissions),
    hasAnyPermission: teamPermissions.hasAnyPermission(requiredPermissions),
    permissions: permissionChecks,
    loading: teamPermissions.loading,
    error: teamPermissions.error
  }
}