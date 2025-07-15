// Unified Permission Service - Single source of truth for all permission checking
// Consolidates admin permissions, user permissions, and organizer relationships

import { supabase } from '@/lib/supabase'
import { FollowerService, UserPermissions } from './FollowerService'

export interface UnifiedPermissions {
  // User identification
  userId: string
  
  // Admin permissions (highest level)
  isAdmin: boolean
  adminLevel: number
  canManageUsers: boolean
  canManageEvents: boolean
  canViewAnalytics: boolean
  canManageSystem: boolean
  canManageBilling: boolean
  
  // User/follower permissions
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
  
  teamPermissions: Array<{
    event_id: string
    organizer_id: string
    organizer_name: string
    can_work_events: boolean
  }>
  
  coOrganizerPermissions: Array<{
    organizer_id: string
    organizer_name: string
    is_co_organizer: boolean
  }>
  
  // Meta information
  lastUpdated: Date
  loading: boolean
  error: string | null
}

export interface PermissionCheckOptions {
  organizerId?: string
  eventId?: string
  requireAdmin?: boolean
  requireOwnership?: boolean
  minimumAdminLevel?: number
}

export class UnifiedPermissionService {
  private static permissionsCache = new Map<string, UnifiedPermissions>()
  private static cacheTimeout = 5 * 60 * 1000 // 5 minutes

  /**
   * Get comprehensive permissions for a user
   */
  static async getUserPermissions(userId: string): Promise<UnifiedPermissions> {
    // Check cache first
    const cached = this.getCachedPermissions(userId)
    if (cached) {
      return cached
    }

    const permissions: UnifiedPermissions = {
      userId,
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
      loading: false,
      error: null
    }

    try {
      // 1. Check admin permissions first (highest priority)
      const adminPerms = await this.checkAdminPermissions(userId)
      Object.assign(permissions, adminPerms)

      // 2. If not admin, check user permissions (unless admin already grants everything)
      if (!permissions.isAdmin) {
        const userPerms = await this.checkUserPermissions(userId)
        Object.assign(permissions, userPerms)
      } else {
        // Admins automatically get all user permissions
        permissions.canSellTickets = true
        permissions.canWorkEvents = true
        permissions.isCoOrganizer = true
        permissions.isEventOwner = true
      }

      // 3. Check event ownership (always check, even for admins)
      permissions.isEventOwner = await this.checkEventOwnership(userId)

      // Cache the result
      this.setCachedPermissions(userId, permissions)
      
      return permissions

    } catch (error) {
      console.error('Failed to load unified permissions:', error)
      return {
        ...permissions,
        error: error instanceof Error ? error.message : 'Failed to load permissions'
      }
    }
  }

  /**
   * Check if user can perform a specific action
   */
  static async canPerformAction(
    userId: string, 
    action: string, 
    options?: PermissionCheckOptions
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId)
    
    // If there's an error loading permissions, deny access
    if (permissions.error) {
      return false
    }

    // Admin override (except for ownership-specific checks)
    if (permissions.isAdmin && !options?.requireOwnership) {
      // Check minimum admin level if specified
      if (options?.minimumAdminLevel) {
        return permissions.adminLevel >= options.minimumAdminLevel
      }
      return true
    }

    switch (action) {
      case 'manage_users':
        return permissions.canManageUsers

      case 'manage_system':
        return permissions.canManageSystem

      case 'view_analytics':
        return permissions.canViewAnalytics

      case 'manage_billing':
        return permissions.canManageBilling

      case 'sell_tickets':
        if (options?.organizerId) {
          return permissions.sellingPermissions.some(
            p => p.organizer_id === options.organizerId && p.can_sell_tickets
          )
        }
        return permissions.canSellTickets

      case 'work_events':
        if (options?.eventId) {
          return permissions.teamPermissions.some(
            p => p.event_id === options.eventId && p.can_work_events
          )
        }
        return permissions.canWorkEvents

      case 'manage_events':
        if (options?.organizerId) {
          return permissions.coOrganizerPermissions.some(
            p => p.organizer_id === options.organizerId && p.is_co_organizer
          ) || permissions.isEventOwner
        }
        return permissions.isCoOrganizer || permissions.isEventOwner

      case 'create_events':
        return true // Any authenticated user can create events

      case 'own_events':
        return permissions.isEventOwner

      default:
        return false
    }
  }

  /**
   * Get organizer-specific permissions
   */
  static async getOrganizerPermissions(userId: string, organizerId: string): Promise<UserPermissions> {
    try {
      const permissions = await this.getUserPermissions(userId)
      
      // Admin override
      if (permissions.isAdmin) {
        return {
          can_sell_tickets: true,
          can_work_events: true,
          is_co_organizer: true,
          commission_rate: 0 // Admins don't earn commission
        }
      }

      // Use FollowerService for organizer-specific permissions (fallback included)
      return await FollowerService.getUserPermissions(userId, organizerId)
    } catch (error) {
      console.error('Failed to get organizer permissions:', error)
      return {
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0
      }
    }
  }

  /**
   * Check admin permissions with fallback
   */
  private static async checkAdminPermissions(userId: string): Promise<Partial<UnifiedPermissions>> {
    try {
      // Get user profile to check for designated admin email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, is_admin, admin_level')
        .eq('id', userId)
        .single()

      // Designated admin email bypass
      if (profile?.email === 'iradwatkins@gmail.com') {
        return {
          isAdmin: true,
          adminLevel: 3,
          canManageUsers: true,
          canManageEvents: true,
          canViewAnalytics: true,
          canManageSystem: true,
          canManageBilling: true
        }
      }

      // Try RPC function first
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_permissions', {
          user_uuid: userId
        })

        if (!rpcError && rpcData?.[0]) {
          const adminData = rpcData[0]
          return {
            isAdmin: adminData.is_admin || false,
            adminLevel: adminData.admin_level || 0,
            canManageUsers: adminData.can_manage_users || false,
            canManageEvents: adminData.can_manage_events || false,
            canViewAnalytics: adminData.can_view_analytics || false,
            canManageSystem: adminData.can_manage_system || false,
            canManageBilling: adminData.can_manage_billing || false
          }
        }
      } catch (rpcError) {
        console.warn('RPC function get_admin_permissions failed, using fallback:', rpcError)
      }

      // Fallback to profile data
      if (profile) {
        const adminLevel = profile.admin_level || 0
        return {
          isAdmin: profile.is_admin || false,
          adminLevel,
          canManageUsers: adminLevel >= 2,
          canManageEvents: adminLevel >= 1,
          canViewAnalytics: adminLevel >= 1,
          canManageSystem: adminLevel >= 3,
          canManageBilling: adminLevel >= 3
        }
      }

      return {
        isAdmin: false,
        adminLevel: 0,
        canManageUsers: false,
        canManageEvents: false,
        canViewAnalytics: false,
        canManageSystem: false,
        canManageBilling: false
      }

    } catch (error) {
      console.error('Failed to check admin permissions:', error)
      return {
        isAdmin: false,
        adminLevel: 0,
        canManageUsers: false,
        canManageEvents: false,
        canViewAnalytics: false,
        canManageSystem: false,
        canManageBilling: false
      }
    }
  }

  /**
   * Check user permissions via FollowerService
   */
  private static async checkUserPermissions(userId: string): Promise<Partial<UnifiedPermissions>> {
    try {
      const [
        sellingPermissions,
        teamPermissions,
        coOrganizerPermissions
      ] = await Promise.all([
        FollowerService.getUserSellingPermissions(userId),
        FollowerService.getUserTeamPermissions(userId),
        FollowerService.getUserCoOrganizerStatus(userId)
      ])

      return {
        canSellTickets: sellingPermissions.length > 0,
        canWorkEvents: teamPermissions.length > 0,
        isCoOrganizer: coOrganizerPermissions.length > 0,
        sellingPermissions,
        teamPermissions,
        coOrganizerPermissions
      }
    } catch (error) {
      console.error('Failed to check user permissions:', error)
      return {
        canSellTickets: false,
        canWorkEvents: false,
        isCoOrganizer: false,
        sellingPermissions: [],
        teamPermissions: [],
        coOrganizerPermissions: []
      }
    }
  }

  /**
   * Check if user owns any events
   */
  private static async checkEventOwnership(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)

      return !error && (data?.length > 0)
    } catch (error) {
      console.error('Failed to check event ownership:', error)
      return false
    }
  }

  /**
   * Cache management
   */
  private static getCachedPermissions(userId: string): UnifiedPermissions | null {
    const cached = this.permissionsCache.get(userId)
    if (cached && Date.now() - cached.lastUpdated.getTime() < this.cacheTimeout) {
      return cached
    }
    return null
  }

  private static setCachedPermissions(userId: string, permissions: UnifiedPermissions): void {
    this.permissionsCache.set(userId, permissions)
  }

  /**
   * Clear cache for a user (useful after permission changes)
   */
  static clearUserCache(userId: string): void {
    this.permissionsCache.delete(userId)
  }

  /**
   * Clear all cached permissions
   */
  static clearAllCache(): void {
    this.permissionsCache.clear()
  }
}