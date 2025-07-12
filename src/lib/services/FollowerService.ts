// Follower Service for managing follow relationships and promotions
// Handles following, unfollowing, promoting followers, and permission management

import { supabase } from '@/lib/supabase'
import type { 
  UserFollow, UserFollowInsert, 
  FollowerPromotion, FollowerPromotionInsert, FollowerPromotionUpdate,
  Profile 
} from '@/types/database'

// Type assertion for supabase client
const db = supabase as any

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
}

export class FollowerService {
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
   */
  static async isFollowing(followerId: string, organizerId: string): Promise<boolean> {
    try {
      const { data } = await db.rpc('is_following', {
        follower_uuid: followerId,
        organizer_uuid: organizerId
      });

      return Boolean(data);
    } catch (error) {
      console.error('Failed to check follow status:', error);
      return false;
    }
  }

  /**
   * Get follower count for organizer
   */
  static async getFollowerCount(organizerId: string): Promise<number> {
    try {
      const { data } = await db.rpc('get_follower_count', {
        organizer_uuid: organizerId
      });

      return data || 0;
    } catch (error) {
      console.error('Failed to get follower count:', error);
      return 0;
    }
  }

  /**
   * Get list of followers for an organizer with their permissions
   */
  static async getFollowersWithPermissions(organizerId: string): Promise<FollowerWithPermissions[]> {
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
            email,
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
      return [];
    }
  }

  /**
   * Promote a follower by granting permissions
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
        commission_rate: permissions.commission_rate || 0
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
   */
  static async getUserPermissions(userId: string, organizerId: string): Promise<UserPermissions> {
    try {
      const { data } = await db.rpc('get_user_permissions', {
        user_uuid: userId,
        organizer_uuid: organizerId
      });

      if (data && data.length > 0) {
        const permissions = data[0];
        return {
          can_sell_tickets: permissions.can_sell_tickets || false,
          can_work_events: permissions.can_work_events || false,
          is_co_organizer: permissions.is_co_organizer || false,
          commission_rate: parseFloat(permissions.commission_rate) || 0
        };
      }

      return {
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0
      };

    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return {
        can_sell_tickets: false,
        can_work_events: false,
        is_co_organizer: false,
        commission_rate: 0
      };
    }
  }

  /**
   * Get list of organizers that a user follows
   */
  static async getFollowedOrganizers(userId: string): Promise<Profile[]> {
    try {
      const { data, error } = await db
        .from('user_follows')
        .select(`
          created_at,
          profiles:organizer_id (
            id,
            email,
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
      return [];
    }
  }

  /**
   * Check if user has any permissions (for UI display purposes)
   */
  static async hasAnyPermissions(userId: string): Promise<boolean> {
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
      return false;
    }
  }

  /**
   * Get user's selling permissions across all organizers
   */
  static async getUserSellingPermissions(userId: string): Promise<Array<{
    organizer_id: string
    organizer_name: string
    commission_rate: number
    can_sell_tickets: boolean
  }>> {
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
      return [];
    }
  }

  /**
   * Get user's team member permissions across all events
   */
  static async getUserTeamPermissions(userId: string): Promise<Array<{
    event_id: string
    organizer_id: string
    organizer_name: string
    can_work_events: boolean
  }>> {
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
      return [];
    }
  }

  /**
   * Get user's co-organizer status across all organizers
   */
  static async getUserCoOrganizerStatus(userId: string): Promise<Array<{
    organizer_id: string
    organizer_name: string
    is_co_organizer: boolean
  }>> {
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
      return [];
    }
  }
}