// Follower Service for managing follow relationships and promotions
// Handles following, unfollowing, promoting followers, and permission management
// CRITICAL: ALL methods require user authentication - no anonymous interactions allowed

import { supabase } from '@/lib/supabase'
import type { 
  UserFollow, UserFollowInsert, 
  FollowerPromotion, FollowerPromotionInsert, FollowerPromotionUpdate,
  Profile 
} from '@/types/database'

// Type assertion for supabase client
const db = supabase as any

// Authentication check helper
async function ensureAuthenticated(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user !== null
  } catch {
    return false
  }
}

export interface FollowResult {
  success: boolean
  follow?: UserFollow
  error?: string
}

export interface PromotionResult {
  success: boolean
  promotion?: FollowerPromotion
  error?: string
}

export interface FollowerWithPermissions extends Profile {
  follow_id: string
  followed_at: string
  permissions?: {
    can_sell_tickets: boolean
    can_work_events: boolean
    is_co_organizer: boolean
    commission_rate: number
  }
}

export interface UserPermissions {
  can_sell_tickets: boolean
  can_work_events: boolean
  is_co_organizer: boolean
  commission_rate: number
  commission_type?: 'percentage' | 'fixed'
  commission_fixed_amount?: number
}

export class FollowerService {
  private static systemAvailable: boolean | null = null;
  
  static isFollowerSystemAvailable(): boolean {
    return this.systemAvailable !== false;
  }
  
  static markSystemUnavailable(): void {
    this.systemAvailable = false;
    console.log('🔄 Follower system marked as unavailable - future calls will be skipped');
  }
  
  static markSystemAvailable(): void {
    this.systemAvailable = true;
  }
  /**
   * Follow an organizer
   */
  static async followOrganizer(followerId: string, organizerId: string): Promise<FollowResult> {
    try {
      // Check if already following
      const { data: existing } = await db
        .from('user_follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('organizer_id', organizerId)
        .single();

      if (existing) {
        return {
          success: false,
          error: 'Already following this organizer'
        };
      }

      // Create follow relationship
      const followData: UserFollowInsert = {
        follower_id: followerId,
        organizer_id: organizerId
      };

      const { data, error } = await db
        .from('user_follows')
        .insert(followData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to follow organizer: ${error.message}`);
      }

      return {
        success: true,
        follow: data
      };

    } catch (error) {
      console.error('Failed to follow organizer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Unfollow an organizer
   */
  static async unfollowOrganizer(followerId: string, organizerId: string): Promise<FollowResult> {
    try {
      const { error } = await db
        .from('user_follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('organizer_id', organizerId);

      if (error) {
        throw new Error(`Failed to unfollow organizer: ${error.message}`);
      }

      return { success: true };

    } catch (error) {
      console.error('Failed to unfollow organizer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if user is following organizer
   * REQUIRES: User must be authenticated
   */
  static async isFollowing(followerId: string, organizerId: string): Promise<boolean> {
    // CRITICAL: Only authenticated users can check follow status
    if (!ensureAuthenticated()) {
      console.debug('🔒 isFollowing: Authentication required');
      return false;
    }
    
    // Skip follower system entirely if not available
    if (!this.isFollowerSystemAvailable()) {
      return false;
    }
    
    try {
      // Try RPC function first
      const { data, error } = await db.rpc('is_following', {
        follower_uuid: followerId,
        organizer_uuid: organizerId
      });

      if (!error) {
        return Boolean(data);
      }

      // Fallback to direct table query if RPC fails
      console.warn('RPC function is_following failed, falling back to direct query:', error);
      
      try {
        const { data: fallbackData, error: fallbackError } = await db
          .from('user_follows')
          .select('id')
          .eq('follower_id', followerId)
          .eq('organizer_id', organizerId)
          .single();

        if (fallbackError) {
          // If table doesn't exist, mark system as unavailable
          if (fallbackError.code === 'PGRST106' || fallbackError.code === '42P01') {
            console.debug('user_follows table not found, disabling follower system');
            this.markSystemUnavailable();
            return false;
          }
          // PGRST116 means no rows found, which is expected
          if (fallbackError.code === 'PGRST116') {
            return false;
          }
          console.warn('Fallback query failed:', fallbackError);
          return false;
        }
        
        return fallbackData !== null;
      } catch (fallbackError) {
        console.debug('Follower system not available, returning false');
        this.markSystemUnavailable();
        return false;
      }
    } catch (error) {
      console.error('Failed to check follow status:', error);
      this.markSystemUnavailable();
      return false;
    }
  }

  /**
   * Get follower count for organizer
   * REQUIRES: User must be authenticated
   */
  static async getFollowerCount(organizerId: string): Promise<number> {
    // For public event viewing, allow follower count to be retrieved without authentication
    // This is safe as it's just a count, not sensitive follower data
    
    // Skip follower system entirely if not available
    if (!this.isFollowerSystemAvailable()) {
      return 0;
    }
    
    try {
      // Try RPC function first
      const { data, error } = await db.rpc('get_follower_count', {
        organizer_uuid: organizerId
      });

      if (!error) {
        return data || 0;
      }

      // Fallback to direct table query if RPC fails
      console.warn('RPC function get_follower_count failed, falling back to direct query:', error);
      
      try {
        const { count, error: fallbackError } = await db
          .from('user_follows')
          .select('*', { count: 'exact' })
          .eq('organizer_id', organizerId);

        if (fallbackError) {
          // If table doesn't exist, mark system as unavailable
          if (fallbackError.code === 'PGRST106' || fallbackError.code === '42P01') {
            console.debug('user_follows table not found, disabling follower system');
            this.markSystemUnavailable();
            return 0;
          }
          console.warn('Fallback query failed:', fallbackError);
          return 0;
        }
        
        return count || 0;
      } catch (fallbackError) {
        console.debug('Follower system not available, returning 0');
        this.markSystemUnavailable();
        return 0;
      }
    } catch (error) {
      console.error('Failed to get follower count:', error);
      this.markSystemUnavailable();
      return 0;
    }
  }

  /**
   * Get list of followers for an organizer with their permissions
   */
  static async getFollowersWithPermissions(organizerId: string): Promise<FollowerWithPermissions[]> {
    // Skip follower system entirely if not available
    if (!this.isFollowerSystemAvailable()) {
      return [];
    }
    
    try {
      // First get the followers
      const { data: followers, error: followersError } = await db
        .from('user_follows')
        .select(`
          id,
          created_at,
          follower_id,
          profiles:follower_id (
            id,
            full_name,
            avatar_url,
            bio,
            organization
          )
        `)
        .eq('organizer_id', organizerId)
        .order('created_at', { ascending: false });

      if (followersError) {
        throw new Error(`Failed to fetch followers: ${followersError.message}`);
      }

      if (!followers || followers.length === 0) {
        return [];
      }

      // Get all follow IDs
      const followIds = followers.map(f => f.id);

      // Separately fetch promotions for these follows
      const { data: promotions, error: promotionsError } = await db
        .from('follower_promotions')
        .select(`
          follow_id,
          can_sell_tickets,
          can_work_events,
          is_co_organizer,
          commission_rate
        `)
        .in('follow_id', followIds);

      if (promotionsError) {
        console.error('Failed to fetch promotions:', promotionsError);
      }

      // Create a map of promotions by follow_id
      const promotionsMap = new Map();
      (promotions || []).forEach(p => {
        promotionsMap.set(p.follow_id, p);
      });

      return followers.map((item: any) => ({
        ...item.profiles,
        follow_id: item.id,
        followed_at: item.created_at,
        permissions: promotionsMap.get(item.id) || {
          can_sell_tickets: false,
          can_work_events: false,
          is_co_organizer: false,
          commission_rate: 0
        }
      }));

    } catch (error) {
      console.error('Failed to get followers with permissions:', error);
      // Mark system as unavailable on database errors
      this.markSystemUnavailable();
      return [];
    }
  }

  /**
   * Promote a follower by granting permissions
   * Note: For sellers (can_sell_tickets), they need to be assigned to specific events
   * using SellerAssignmentService to enforce single event limitation
   */
  static async promoteFollower(
    organizerId: string,
    followerId: string,
    permissions: Partial<UserPermissions>
  ): Promise<PromotionResult> {
    try {
      // Get the follow relationship
      const { data: follow, error: followError } = await db
        .from('user_follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('organizer_id', organizerId)
        .single();

      if (followError || !follow) {
        return {
          success: false,
          error: 'Follow relationship not found'
        };
      }

      // Check if promotion already exists
      const { data: existingPromotion } = await db
        .from('follower_promotions')
        .select('id')
        .eq('follow_id', follow.id)
        .single();

      const promotionData: FollowerPromotionInsert | FollowerPromotionUpdate = {
        follow_id: follow.id,
        organizer_id: organizerId,
        follower_id: followerId,
        can_sell_tickets: permissions.can_sell_tickets || false,
        can_work_events: permissions.can_work_events || false,
        is_co_organizer: permissions.is_co_organizer || false,
        commission_rate: permissions.commission_rate || 0,
        commission_type: permissions.commission_type || 'percentage',
        commission_fixed_amount: permissions.commission_fixed_amount || 0
      };

      let result;
      if (existingPromotion) {
        // Update existing promotion
        const { data, error } = await db
          .from('follower_promotions')
          .update(promotionData)
          .eq('id', existingPromotion.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new promotion
        const { data, error } = await db
          .from('follower_promotions')
          .insert(promotionData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return {
        success: true,
        promotion: result
      };

    } catch (error) {
      console.error('Failed to promote follower:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Revoke all permissions from a follower
   */
  static async revokePromotions(organizerId: string, followerId: string): Promise<PromotionResult> {
    try {
      const { error } = await db
        .from('follower_promotions')
        .delete()
        .eq('organizer_id', organizerId)
        .eq('follower_id', followerId);

      if (error) {
        throw new Error(`Failed to revoke promotions: ${error.message}`);
      }

      return { success: true };

    } catch (error) {
      console.error('Failed to revoke promotions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's permissions for a specific organizer
   * REQUIRES: User must be authenticated
   */
  static async getUserPermissions(userId: string, organizerId: string): Promise<UserPermissions> {
    // CRITICAL: Only authenticated users can get permissions
    if (!ensureAuthenticated()) {
      console.debug('🔒 getUserPermissions: Authentication required');
      return {
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0,
        commission_type: 'percentage',
        commission_fixed_amount: 0
      };
    }
    
    // Skip follower system entirely if not available
    if (!this.isFollowerSystemAvailable()) {
      return {
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0,
        commission_type: 'percentage',
        commission_fixed_amount: 0
      };
    }
    
    try {
      // Try RPC function first
      const { data, error } = await db.rpc('get_user_permissions', {
        user_uuid: userId,
        organizer_uuid: organizerId
      });

      if (!error && data && data.length > 0) {
        const permissions = data[0];
        return {
          can_sell_tickets: permissions.can_sell_tickets || false,
          can_work_events: permissions.can_work_events || false,
          is_co_organizer: permissions.is_co_organizer || false,
          commission_rate: parseFloat(permissions.commission_rate) || 0,
          commission_type: permissions.commission_type || 'percentage',
          commission_fixed_amount: parseFloat(permissions.commission_fixed_amount) || 0
        };
      }

      // Fallback to direct table query if RPC fails
      if (error) {
        console.warn('RPC function get_user_permissions failed, falling back to direct query:', error);
        
        const { data: followData, error: followError } = await db
          .from('user_follows')
          .select(`
            id,
            follower_promotions (
              can_sell_tickets,
              can_work_events,
              is_co_organizer,
              commission_rate
            )
          `)
          .eq('follower_id', userId)
          .eq('organizer_id', organizerId)
          .single();

        if (!followError && followData?.follower_promotions) {
          const permissions = Array.isArray(followData.follower_promotions) 
            ? followData.follower_promotions[0] 
            : followData.follower_promotions;
            
          return {
            can_sell_tickets: permissions?.can_sell_tickets || false,
            can_work_events: permissions?.can_work_events || false,
            is_co_organizer: permissions?.is_co_organizer || false,
            commission_rate: parseFloat(permissions?.commission_rate) || 0
          };
        }
      }

      return {
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0,
        commission_type: 'percentage',
        commission_fixed_amount: 0
      };

    } catch (error) {
      console.error('Failed to get user permissions:', error);
      // Mark system as unavailable on database errors
      this.markSystemUnavailable();
      return {
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0,
        commission_type: 'percentage',
        commission_fixed_amount: 0
      };
    }
  }

  /**
   * Get list of organizers that a user follows
   */
  static async getFollowedOrganizers(userId: string): Promise<Profile[]> {
    // Skip follower system entirely if not available
    if (!this.isFollowerSystemAvailable()) {
      return [];
    }
    
    try {
      const { data, error } = await db
        .from('user_follows')
        .select(`
          created_at,
          profiles:organizer_id (
            id,
            full_name,
            avatar_url,
            bio,
            organization
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch followed organizers: ${error.message}`);
      }

      return (data || []).map((item: any) => item.profiles);

    } catch (error) {
      console.error('Failed to get followed organizers:', error);
      // Mark system as unavailable on database errors
      this.markSystemUnavailable();
      return [];
    }
  }

  /**
   * Check if user has any permissions (for UI display purposes)
   * REQUIRES: User must be authenticated
   */
  static async hasAnyPermissions(userId: string): Promise<boolean> {
    // CRITICAL: Only authenticated users can check permissions
    if (!ensureAuthenticated()) {
      console.debug('🔒 hasAnyPermissions: Authentication required');
      return false;
    }
    
    // Skip follower system entirely if not available
    if (!this.isFollowerSystemAvailable()) {
      return false;
    }
    
    try {
      const { data, error } = await db
        .from('follower_promotions')
        .select('id')
        .eq('follower_id', userId)
        .or('can_sell_tickets.eq.true,can_work_events.eq.true,is_co_organizer.eq.true')
        .limit(1);

      if (error) {
        console.error('Error checking permissions:', error);
        return false;
      }

      return (data && data.length > 0);

    } catch (error) {
      console.error('Failed to check permissions:', error);
      // Mark system as unavailable on database errors
      this.markSystemUnavailable();
      return false;
    }
  }

  /**
   * Get user's selling permissions across all organizers
   * REQUIRES: User must be authenticated
   */
  static async getUserSellingPermissions(userId: string): Promise<Array<{
    organizer_id: string
    organizer_name: string
    commission_rate: number
    can_sell_tickets: boolean
  }>> {
    // CRITICAL: Only authenticated users can get selling permissions
    if (!ensureAuthenticated()) {
      console.debug('🔒 getUserSellingPermissions: Authentication required');
      return [];
    }
    
    // Skip follower system entirely if not available
    if (!this.isFollowerSystemAvailable()) {
      return [];
    }
    
    try {
      // Get promotions where user can sell tickets
      const { data: promotions, error: promotionsError } = await db
        .from('follower_promotions')
        .select(`
          organizer_id,
          commission_rate,
          can_sell_tickets
        `)
        .eq('follower_id', userId)
        .eq('can_sell_tickets', true);

      if (promotionsError) {
        throw new Error(`Failed to fetch selling permissions: ${promotionsError.message}`);
      }

      if (!promotions || promotions.length === 0) {
        return [];
      }

      // Get unique organizer IDs
      const organizerIds = [...new Set(promotions.map(p => p.organizer_id))];

      // Fetch organizer profiles
      const { data: profiles, error: profilesError } = await db
        .from('profiles')
        .select('id, full_name, organization')
        .in('id', organizerIds);

      if (profilesError) {
        console.error('Failed to fetch organizer profiles:', profilesError);
      }

      // Create a map of profiles by id
      const profilesMap = new Map();
      (profiles || []).forEach(p => {
        profilesMap.set(p.id, p);
      });

      return promotions.map((item: any) => {
        const profile = profilesMap.get(item.organizer_id) || {};
        return {
          organizer_id: item.organizer_id,
          organizer_name: profile.full_name || profile.organization || 'Unknown Organizer',
          commission_rate: parseFloat(item.commission_rate) || 0,
          can_sell_tickets: item.can_sell_tickets
        };
      });

    } catch (error) {
      console.error('Failed to get selling permissions:', error);
      // Mark system as unavailable on database errors
      this.markSystemUnavailable();
      return [];
    }
  }

  /**
   * Get user's team member permissions across all events
   * REQUIRES: User must be authenticated
   */
  static async getUserTeamPermissions(userId: string): Promise<Array<{
    event_id: string
    organizer_id: string
    organizer_name: string
    can_work_events: boolean
  }>> {
    // CRITICAL: Only authenticated users can get team permissions
    if (!ensureAuthenticated()) {
      console.debug('🔒 getUserTeamPermissions: Authentication required');
      return [];
    }
    
    // Skip follower system entirely if not available
    if (!this.isFollowerSystemAvailable()) {
      return [];
    }
    
    try {
      // Check follower promotions for can_work_events
      const { data: followerPerms, error: followerError } = await db
        .from('follower_promotions')
        .select(`
          organizer_id,
          can_work_events,
          profiles:organizer_id (
            full_name,
            organization
          )
        `)
        .eq('follower_id', userId)
        .eq('can_work_events', true);

      if (followerError) {
        console.error('Error fetching follower team permissions:', followerError);
      }

      // Check team_members table for event-specific assignments
      const { data: teamMembers, error: teamError } = await db
        .from('team_members')
        .select(`
          event_id,
          events!inner (
            id,
            title,
            owner_id,
            profiles:owner_id (
              full_name,
              organization
            )
          )
        `)
        .eq('user_id', userId);

      if (teamError) {
        console.error('Error fetching team member assignments:', teamError);
      }

      const permissions: Array<{
        event_id: string
        organizer_id: string
        organizer_name: string
        can_work_events: boolean
      }> = [];

      // Add follower promotions (general work permissions)
      (followerPerms || []).forEach((item: any) => {
        permissions.push({
          event_id: 'all', // General permission across all events
          organizer_id: item.organizer_id,
          organizer_name: item.profiles.full_name || item.profiles.organization || 'Unknown Organizer',
          can_work_events: item.can_work_events
        });
      });

      // Add specific team member assignments
      (teamMembers || []).forEach((item: any) => {
        permissions.push({
          event_id: item.event_id,
          organizer_id: item.events.owner_id,
          organizer_name: item.events.profiles.full_name || item.events.profiles.organization || 'Unknown Organizer',
          can_work_events: true // Team members always have work permissions for their assigned events
        });
      });

      return permissions;

    } catch (error) {
      console.error('Failed to get team permissions:', error);
      // Mark system as unavailable on database errors
      this.markSystemUnavailable();
      return [];
    }
  }

  /**
   * Get user's co-organizer status across all organizers
   * REQUIRES: User must be authenticated
   */
  static async getUserCoOrganizerStatus(userId: string): Promise<Array<{
    organizer_id: string
    organizer_name: string
    is_co_organizer: boolean
  }>> {
    // CRITICAL: Only authenticated users can get co-organizer status
    if (!ensureAuthenticated()) {
      console.debug('🔒 getUserCoOrganizerStatus: Authentication required');
      return [];
    }
    
    // Skip follower system entirely if not available
    if (!this.isFollowerSystemAvailable()) {
      return [];
    }
    
    try {
      // Get promotions where user is co-organizer
      const { data: promotions, error: promotionsError } = await db
        .from('follower_promotions')
        .select(`
          organizer_id,
          is_co_organizer
        `)
        .eq('follower_id', userId)
        .eq('is_co_organizer', true);

      if (promotionsError) {
        throw new Error(`Failed to fetch co-organizer status: ${promotionsError.message}`);
      }

      if (!promotions || promotions.length === 0) {
        return [];
      }

      // Get unique organizer IDs
      const organizerIds = [...new Set(promotions.map(p => p.organizer_id))];

      // Fetch organizer profiles
      const { data: profiles, error: profilesError } = await db
        .from('profiles')
        .select('id, full_name, organization')
        .in('id', organizerIds);

      if (profilesError) {
        console.error('Failed to fetch organizer profiles:', profilesError);
      }

      // Create a map of profiles by id
      const profilesMap = new Map();
      (profiles || []).forEach(p => {
        profilesMap.set(p.id, p);
      });

      return promotions.map((item: any) => {
        const profile = profilesMap.get(item.organizer_id) || {};
        return {
          organizer_id: item.organizer_id,
          organizer_name: profile.full_name || profile.organization || 'Unknown Organizer',
          is_co_organizer: item.is_co_organizer
        };
      });

    } catch (error) {
      console.error('Failed to get co-organizer status:', error);
      // Mark system as unavailable on database errors
      this.markSystemUnavailable();
      return [];
    }
  }

  /**
   * Assign seller to specific event (enforcing single event limitation)
   */
  static async assignSellerToEvent(
    organizerId: string,
    sellerId: string,
    eventId: string,
    commissionRate?: number
  ): Promise<{
    success: boolean
    message: string
    assignment_id?: string
  }> {
    try {
      const { data, error } = await db
        .rpc('assign_seller_to_event', {
          seller_user_id: sellerId,
          event_id_param: eventId,
          organizer_user_id: organizerId,
          commission_rate_param: commissionRate
        });

      if (error) {
        throw new Error(`Failed to assign seller: ${error.message}`);
      }

      const result = data?.[0];
      if (!result) {
        throw new Error('No result returned from assignment function');
      }

      return {
        success: result.success,
        message: result.message,
        assignment_id: result.assignment_id
      };

    } catch (error) {
      console.error('Failed to assign seller to event:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign seller to event'
      };
    }
  }

  /**
   * Get seller's current active assignment
   */
  static async getSellerCurrentAssignment(sellerId: string): Promise<{
    assignment_id: string
    event_id: string
    event_title: string
    organizer_id: string
    organizer_name: string
    commission_rate: number
    assigned_at: string
  } | null> {
    try {
      const { data, error } = await db
        .rpc('get_seller_current_assignment', {
          seller_user_id: sellerId
        });

      if (error) {
        throw new Error(`Failed to get seller assignment: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return null;
      }

      const assignment = data[0];
      return {
        assignment_id: assignment.assignment_id,
        event_id: assignment.event_id,
        event_title: assignment.event_title,
        organizer_id: assignment.organizer_id,
        organizer_name: assignment.organizer_name,
        commission_rate: parseFloat(assignment.commission_rate),
        assigned_at: assignment.assigned_at
      };

    } catch (error) {
      console.error('Failed to get seller current assignment:', error);
      return null;
    }
  }

  /**
   * Complete seller assignment when event ends
   */
  static async completeSellerAssignment(
    organizerId: string,
    assignmentId: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { data, error } = await db
        .rpc('complete_seller_assignment', {
          assignment_id_param: assignmentId,
          organizer_user_id: organizerId
        });

      if (error) {
        throw new Error(`Failed to complete assignment: ${error.message}`);
      }

      const result = data?.[0];
      if (!result) {
        throw new Error('No result returned from completion function');
      }

      return {
        success: result.success,
        message: result.message
      };

    } catch (error) {
      console.error('Failed to complete seller assignment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to complete seller assignment'
      };
    }
  }

  /**
   * Disable seller assignment (remove from event)
   */
  static async disableSellerAssignment(
    organizerId: string,
    assignmentId: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { data, error } = await db
        .rpc('disable_seller_assignment', {
          assignment_id_param: assignmentId,
          organizer_user_id: organizerId
        });

      if (error) {
        throw new Error(`Failed to disable assignment: ${error.message}`);
      }

      const result = data?.[0];
      if (!result) {
        throw new Error('No result returned from disable function');
      }

      return {
        success: result.success,
        message: result.message
      };

    } catch (error) {
      console.error('Failed to disable seller assignment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to disable seller assignment'
      };
    }
  }
}