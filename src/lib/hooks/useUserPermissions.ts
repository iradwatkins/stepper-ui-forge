// React hook for checking user permissions across the application
// Provides utilities for permission checking and conditional UI rendering
// CRITICAL: Only executes after user authentication is complete

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FollowerService, UserPermissions } from '@/lib/services/FollowerService'
import { EventsService } from '@/lib/events-db'

export interface UserPermissionState {
  // Permission flags
  canSellTickets: boolean
  canWorkEvents: boolean
  isCoOrganizer: boolean
  isEventOwner: boolean
  isOrganizer: boolean // Added to track organizer permission
  userPermission: 'regular_user' | 'seller' | 'team_member' | 'co_organizer' | 'organizer' | 'admin' | null
  
  // Permission details
  sellingPermissions: Array<{
    organizer_id: string
    organizer_name: string
    commission_rate: number
    can_sell_tickets: boolean
  }>
  
  // Loading states
  loading: boolean
  error: string | null
}

export interface PermissionCheckOptions {
  organizerId?: string
  eventId?: string
  requireAll?: boolean // If true, user must have ALL specified permissions
}

export const useUserPermissions = () => {
  const { user, loading: authLoading } = useAuth()
  const [permissionState, setPermissionState] = useState<UserPermissionState>({
    canSellTickets: false,
    canWorkEvents: false,
    isCoOrganizer: false,
    isEventOwner: false,
    isOrganizer: false,
    userPermission: null,
    sellingPermissions: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    // CRITICAL: Only run after authentication is complete
    if (authLoading) {
      // Keep loading state while auth is being determined
      setPermissionState(prev => ({ ...prev, loading: true }))
      return
    }

    if (user) {
      // User is authenticated, load permissions
      loadUserPermissions()
    } else {
      // User is not authenticated, reset permissions immediately
      setPermissionState({
        canSellTickets: false,
        canWorkEvents: false,
        isCoOrganizer: false,
        isEventOwner: false,
        isOrganizer: false,
        userPermission: null,
        sellingPermissions: [],
        loading: false,
        error: null
      })
    }
  }, [user, authLoading])

  const loadUserPermissions = async () => {
    // CRITICAL: Double-check authentication before loading permissions
    if (!user) {
      console.debug('🔒 loadUserPermissions: User not authenticated, skipping')
      return
    }

    setPermissionState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // First, check if user is admin
      const { supabase } = await import('@/integrations/supabase/client')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        console.error('Failed to load user profile:', profileError)
      }
      
      // Determine user permission level based on admin status
      const isAdmin = profile?.is_admin || false
      const userPermission = isAdmin ? 'admin' : 'regular_user'
      const isOrganizer = isAdmin // For now, admins are considered organizers
      
      // Load selling permissions - FollowerService will handle auth checks
      const sellingPermissions = await FollowerService.getUserSellingPermissions(user.id)
      
      // Check if user has any permissions at all
      const hasAnyPermissions = await FollowerService.hasAnyPermissions(user.id)
      
      // Check if user owns any events
      const userEvents = await EventsService.getUserEvents(user.id)
      const isEventOwner = userEvents.length > 0
      
      // Check team member permissions across all events
      const teamMemberPermissions = await FollowerService.getUserTeamPermissions(user.id)
      
      // Check co-organizer status
      const coOrganizerStatus = await FollowerService.getUserCoOrganizerStatus(user.id)
      
      const canSellTickets = sellingPermissions.length > 0 || userPermission === 'seller'
      const canWorkEvents = teamMemberPermissions.length > 0 || userPermission === 'team_member'
      const isCoOrganizer = coOrganizerStatus.length > 0 || userPermission === 'co_organizer'

      setPermissionState({
        canSellTickets,
        canWorkEvents,
        isCoOrganizer,
        isEventOwner,
        isOrganizer,
        userPermission,
        sellingPermissions,
        loading: false,
        error: null
      })

    } catch (error) {
      console.error('Failed to load user permissions:', error)
      setPermissionState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load permissions'
      }))
    }
  }

  // Check specific permissions for an organizer
  const checkOrganizerPermissions = useCallback(async (
    organizerId: string
  ): Promise<UserPermissions> => {
    // CRITICAL: Only check permissions for authenticated users
    if (!user) {
      console.debug('🔒 checkOrganizerPermissions: User not authenticated')
      return {
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0
      }
    }

    try {
      return await FollowerService.getUserPermissions(user.id, organizerId)
    } catch (error) {
      console.error('Failed to check organizer permissions:', error)
      return {
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0
      }
    }
  }, [user])

  // Check if user can perform a specific action
  const canPerformAction = useCallback((
    action: 'sell_tickets' | 'work_events' | 'manage_events' | 'create_events',
    options?: PermissionCheckOptions
  ): boolean => {
    // CRITICAL: Only authenticated users can perform actions
    if (!user) {
      console.debug(`🔒 canPerformAction(${action}): User not authenticated`)
      return false
    }

    switch (action) {
      case 'sell_tickets':
        return permissionState.canSellTickets
      
      case 'work_events':
        return permissionState.canWorkEvents
      
      case 'manage_events':
        return permissionState.isCoOrganizer || permissionState.isEventOwner || permissionState.isOrganizer
      
      case 'create_events':
        return !!user // Any authenticated user can create events
      
      default:
        return false
    }
  }, [user, permissionState])

  // Get commission rate for a specific organizer
  const getCommissionRate = useCallback((organizerId: string): number => {
    const permission = permissionState.sellingPermissions.find(
      p => p.organizer_id === organizerId
    )
    return permission?.commission_rate || 0
  }, [permissionState.sellingPermissions])

  // Check if user is following an organizer
  const checkFollowStatus = useCallback(async (organizerId: string): Promise<boolean> => {
    // CRITICAL: Only authenticated users can check follow status
    if (!user) {
      console.debug('🔒 checkFollowStatus: User not authenticated')
      return false
    }

    try {
      return await FollowerService.isFollowing(user.id, organizerId)
    } catch (error) {
      console.error('Failed to check follow status:', error)
      return false
    }
  }, [user])

  // Refresh permissions (useful after permission changes)
  const refreshPermissions = useCallback(() => {
    // CRITICAL: Only refresh permissions for authenticated users
    if (user) {
      loadUserPermissions()
    } else {
      console.debug('🔒 refreshPermissions: User not authenticated')
    }
  }, [user])

  return {
    ...permissionState,
    checkOrganizerPermissions,
    canPerformAction,
    getCommissionRate,
    checkFollowStatus,
    refreshPermissions,
    isAuthenticated: !!user
  }
}

// Hook for checking permissions with loading states
export const usePermissionCheck = (
  action: 'sell_tickets' | 'work_events' | 'manage_events' | 'create_events',
  options?: PermissionCheckOptions
) => {
  const { canPerformAction, loading, error } = useUserPermissions()
  
  const hasPermission = canPerformAction(action, options)
  
  return {
    hasPermission,
    loading,
    error,
    canAccess: hasPermission && !loading && !error
  }
}

// Hook for organizer-specific permissions
export const useOrganizerPermissions = (organizerId: string | null) => {
  const { user, loading: authLoading } = useAuth()
  const [permissions, setPermissions] = useState<UserPermissions>({
    can_sell_tickets: false,
    can_work_events: false,
    is_co_organizer: false,
    commission_rate: 0
  })
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)

  useEffect(() => {
    // CRITICAL: Only run after authentication is complete
    if (authLoading) {
      setLoading(true)
      return
    }

    if (user && organizerId) {
      loadOrganizerPermissions()
    } else {
      // Reset permissions for anonymous users
      setPermissions({
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0
      })
      setIsFollowing(false)
      setLoading(false)
    }
  }, [user, organizerId, authLoading])

  const loadOrganizerPermissions = async () => {
    // CRITICAL: Double-check authentication
    if (!user || !organizerId) {
      console.debug('🔒 loadOrganizerPermissions: User not authenticated or no organizer ID')
      return
    }

    setLoading(true)
    try {
      const [perms, following] = await Promise.all([
        FollowerService.getUserPermissions(user.id, organizerId),
        FollowerService.isFollowing(user.id, organizerId)
      ])

      setPermissions(perms)
      setIsFollowing(following)
    } catch (error) {
      console.error('Failed to load organizer permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    permissions,
    isFollowing,
    loading,
    canSellTickets: permissions.can_sell_tickets,
    canWorkEvents: permissions.can_work_events,
    isCoOrganizer: permissions.is_co_organizer,
    commissionRate: permissions.commission_rate,
    refreshPermissions: loadOrganizerPermissions
  }
}