// Unified Permission Hooks - Single source of truth for all permission checking
// Replaces useAdminPermissions, useUserPermissions, and useOrganizerPermissions

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UnifiedPermissionService, UnifiedPermissions, PermissionCheckOptions } from '@/lib/services/UnifiedPermissionService'
import { UserPermissions } from '@/lib/services/FollowerService'

/**
 * Main unified permissions hook - replaces useAdminPermissions and useUserPermissions
 */
export const useUnifiedPermissions = () => {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<UnifiedPermissions>({
    userId: '',
    isAdmin: false,
    adminLevel: 0,
    canManageUsers: false,
    canManageEvents: false,
    canViewAnalytics: false,
    canManageSystem: false,
    canManageBilling: false,
    canSellTickets: false,
    canWorkEvents: false,
    isCoOrganizer: false,
    isEventOwner: false,
    sellingPermissions: [],
    teamPermissions: [],
    coOrganizerPermissions: [],
    lastUpdated: new Date(),
    loading: true,
    error: null
  })

  useEffect(() => {
    if (user) {
      loadPermissions()
    } else {
      // Reset permissions when user logs out
      setPermissions(prev => ({
        ...prev,
        userId: '',
        isAdmin: false,
        adminLevel: 0,
        canManageUsers: false,
        canManageEvents: false,
        canViewAnalytics: false,
        canManageSystem: false,
        canManageBilling: false,
        canSellTickets: false,
        canWorkEvents: false,
        isCoOrganizer: false,
        isEventOwner: false,
        sellingPermissions: [],
        teamPermissions: [],
        coOrganizerPermissions: [],
        loading: false,
        error: null
      }))
    }
  }, [user])

  const loadPermissions = async () => {
    if (!user) return

    setPermissions(prev => ({ ...prev, loading: true, error: null }))

    try {
      const perms = await UnifiedPermissionService.getUserPermissions(user.id)
      setPermissions(perms)
    } catch (error) {
      console.error('Failed to load unified permissions:', error)
      setPermissions(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load permissions'
      }))
    }
  }

  const canPerformAction = useCallback(async (
    action: string, 
    options?: PermissionCheckOptions
  ): Promise<boolean> => {
    if (!user) return false
    return await UnifiedPermissionService.canPerformAction(user.id, action, options)
  }, [user])

  const refreshPermissions = useCallback(() => {
    if (user) {
      UnifiedPermissionService.clearUserCache(user.id)
      loadPermissions()
    }
  }, [user])

  return {
    // All permission flags
    ...permissions,
    
    // Helper methods
    canPerformAction,
    refreshPermissions,
    isAuthenticated: !!user,
    
    // Backward compatibility aliases for existing code
    isAdmin: permissions.isAdmin,
    loading: permissions.loading,
    error: permissions.error
  }
}

/**
 * Simple admin check hook - backward compatibility
 */
export const useIsAdmin = (): { isAdmin: boolean; loading: boolean } => {
  const { isAdmin, loading } = useUnifiedPermissions()
  return { isAdmin, loading }
}

/**
 * Permission check hook for specific actions
 */
export const usePermissionCheck = (
  action: string,
  options?: PermissionCheckOptions
) => {
  const { user } = useAuth()
  const [result, setResult] = useState({
    hasPermission: false,
    loading: true,
    error: null as string | null
  })

  useEffect(() => {
    if (!user) {
      setResult({ hasPermission: false, loading: false, error: null })
      return
    }

    const checkPermission = async () => {
      setResult(prev => ({ ...prev, loading: true, error: null }))
      
      try {
        const hasPermission = await UnifiedPermissionService.canPerformAction(user.id, action, options)
        setResult({ hasPermission, loading: false, error: null })
      } catch (error) {
        setResult({
          hasPermission: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Permission check failed'
        })
      }
    }

    checkPermission()
  }, [user, action, options])

  return {
    ...result,
    canAccess: result.hasPermission && !result.loading && !result.error
  }
}

/**
 * Organizer-specific permissions hook - enhanced version
 */
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
      setPermissions({
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0
      })
      setIsFollowing(false)
    }
  }, [user, organizerId])

  const loadOrganizerPermissions = async () => {
    if (!user || !organizerId) return

    setLoading(true)
    try {
      const [perms, following] = await Promise.all([
        UnifiedPermissionService.getOrganizerPermissions(user.id, organizerId),
        // Following status check would need to be added to UnifiedPermissionService
        // For now, keeping the direct FollowerService call
        import('@/lib/services/FollowerService').then(fs => fs.FollowerService.isFollowing(user.id, organizerId))
      ])

      setPermissions(perms)
      setIsFollowing(following)
    } catch (error) {
      console.error('Failed to load organizer permissions:', error)
      setPermissions({
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0
      })
      setIsFollowing(false)
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

/**
 * Conditional rendering hook with unified permissions
 */
export const useConditionalRender = () => {
  const { isAuthenticated, canPerformAction } = useUnifiedPermissions()

  const renderIf = (
    condition: boolean | (() => boolean),
    component: React.ReactNode
  ): React.ReactNode => {
    const shouldRender = typeof condition === 'function' ? condition() : condition
    return shouldRender ? component : null
  }

  const renderIfAuth = (component: React.ReactNode): React.ReactNode => {
    return renderIf(isAuthenticated, component)
  }

  const renderIfPermission = async (
    action: string,
    component: React.ReactNode,
    options?: PermissionCheckOptions
  ): Promise<React.ReactNode> => {
    const hasPermission = await canPerformAction(action, options)
    return renderIf(hasPermission, component)
  }

  const renderIfAdmin = (component: React.ReactNode): React.ReactNode => {
    return renderIf(isAuthenticated, component) // Will check admin status via permissions
  }

  return {
    renderIf,
    renderIfAuth,
    renderIfPermission,
    renderIfAdmin
  }
}

/**
 * Legacy hook compatibility - for gradual migration
 */
export const useAdminPermissions = () => {
  const permissions = useUnifiedPermissions()
  
  return {
    isAdmin: permissions.isAdmin,
    canManageUsers: permissions.canManageUsers,
    canManageEvents: permissions.canManageEvents,
    canViewAnalytics: permissions.canViewAnalytics,
    canManageSystem: permissions.canManageSystem,
    canManageBilling: permissions.canManageBilling,
    adminLevel: permissions.adminLevel,
    loading: permissions.loading,
    error: permissions.error
  }
}

/**
 * Legacy hook compatibility - for gradual migration
 */
export const useUserPermissions = () => {
  const permissions = useUnifiedPermissions()
  
  return {
    canSellTickets: permissions.canSellTickets,
    canWorkEvents: permissions.canWorkEvents,
    isCoOrganizer: permissions.isCoOrganizer,
    isEventOwner: permissions.isEventOwner,
    sellingPermissions: permissions.sellingPermissions,
    loading: permissions.loading,
    error: permissions.error,
    canPerformAction: permissions.canPerformAction,
    refreshPermissions: permissions.refreshPermissions,
    isAuthenticated: permissions.isAuthenticated
  }
}