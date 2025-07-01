// React hook for checking user permissions across the application
// Provides utilities for permission checking and conditional UI rendering

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FollowerService, UserPermissions } from '@/lib/services/FollowerService'

export interface UserPermissionState {
  // Permission flags
  canSellTickets: boolean
  canWorkEvents: boolean
  isCoOrganizer: boolean
  isEventOwner: boolean
  
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
  const { user } = useAuth()
  const [permissionState, setPermissionState] = useState<UserPermissionState>({
    canSellTickets: false,
    canWorkEvents: false,
    isCoOrganizer: false,
    isEventOwner: false,
    sellingPermissions: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    if (user) {
      loadUserPermissions()
    } else {
      // Reset permissions when user logs out
      setPermissionState({
        canSellTickets: false,
        canWorkEvents: false,
        isCoOrganizer: false,
        isEventOwner: false,
        sellingPermissions: [],
        loading: false,
        error: null
      })
    }
  }, [user])

  const loadUserPermissions = async () => {
    if (!user) return

    setPermissionState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Load selling permissions
      const sellingPermissions = await FollowerService.getUserSellingPermissions(user.id)
      
      // Check if user has any permissions at all
      const hasAnyPermissions = await FollowerService.hasAnyPermissions(user.id)
      
      // TODO: Implement checks for team and co-organizer permissions
      // For now, we'll use simplified logic
      const canSellTickets = sellingPermissions.length > 0
      const canWorkEvents = false // TODO: Check team permissions
      const isCoOrganizer = false // TODO: Check co-organizer permissions
      const isEventOwner = false // TODO: Check if user owns any events

      setPermissionState({
        canSellTickets,
        canWorkEvents,
        isCoOrganizer,
        isEventOwner,
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
    if (!user) {
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
    if (!user) return false

    switch (action) {
      case 'sell_tickets':
        return permissionState.canSellTickets
      
      case 'work_events':
        return permissionState.canWorkEvents
      
      case 'manage_events':
        return permissionState.isCoOrganizer || permissionState.isEventOwner
      
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
    if (!user) return false

    try {
      return await FollowerService.isFollowing(user.id, organizerId)
    } catch (error) {
      console.error('Failed to check follow status:', error)
      return false
    }
  }, [user])

  // Refresh permissions (useful after permission changes)
  const refreshPermissions = useCallback(() => {
    if (user) {
      loadUserPermissions()
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
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<UserPermissions>({
    can_sell_tickets: false,
    can_work_events: false,
    is_co_organizer: false,
    commission_rate: 0
  })
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)

  useEffect(() => {
    if (user && organizerId) {
      loadOrganizerPermissions()
    } else {
      setLoading(false)
    }
  }, [user, organizerId])

  const loadOrganizerPermissions = async () => {
    if (!user || !organizerId) return

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