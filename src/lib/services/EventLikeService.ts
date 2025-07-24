import { supabase } from '../supabase';
import { withProfileCheck } from '@/utils/profileHelper';

export interface EventLike {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
  updated_at: string;
}

export interface EventWithLikeInfo {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  image_url?: string;
  organizer_name: string;
  like_count: number;
  is_liked: boolean;
}

export interface LikedEvent {
  event_id: string;
  event_title: string;
  event_description?: string;
  event_date: string;
  event_location?: string;
  event_image_url?: string;
  organizer_name: string;
  liked_at: string;
}

export class EventLikeService {
  /**
   * Like an event
   */
  static async likeEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'Authentication required' };
      }

      // Ensure profile exists before liking
      return await withProfileCheck(user.id, async () => {
        const { error } = await supabase
          .from('event_likes')
          .insert({
            user_id: user.id,
            event_id: eventId
          });

        if (error) {
          // Handle duplicate key error (user already liked the event)
          if (error.code === '23505') {
            return { success: false, error: 'Event already liked' };
          }
          // Handle foreign key constraint error
          if (error.code === '23503' && error.message?.includes('profiles')) {
            console.error('Profile not found for user:', user.id);
            return { success: false, error: 'User profile not found. Please try logging out and back in.' };
          }
          throw error;
        }

        return { success: true };
      });
    } catch (error) {
      console.error('Error liking event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to like event';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Unlike an event
   */
  static async unlikeEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'Authentication required' };
      }

      const { error } = await supabase
        .from('event_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', eventId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error unliking event:', error);
      return { success: false, error: 'Failed to unlike event' };
    }
  }

  /**
   * Toggle like status for an event (like if not liked, unlike if already liked)
   */
  static async toggleEventLike(eventId: string): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, isLiked: false, error: 'Authentication required' };
      }

      // Ensure profile exists before toggling like
      return await withProfileCheck(user.id, async () => {
        const { data, error } = await supabase.rpc('toggle_event_like', {
          user_uuid: user.id,
          event_uuid: eventId
        });

        if (error) {
          // Handle specific foreign key constraint error
          if (error.code === '23503' && error.message?.includes('profiles')) {
            console.error('Profile not found for user:', user.id);
            throw new Error('User profile not found. Please try logging out and back in.');
          }
          throw error;
        }

        return { success: true, isLiked: data as boolean };
      });
    } catch (error) {
      console.error('Error toggling event like:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle event like';
      return { success: false, isLiked: false, error: errorMessage };
    }
  }

  /**
   * Check if current user has liked an event
   */
  static async isEventLiked(eventId: string): Promise<{ isLiked: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { isLiked: false };
      }

      const { data, error } = await supabase.rpc('is_event_liked', {
        user_uuid: user.id,
        event_uuid: eventId
      });

      if (error) {
        // Handle missing function gracefully (404 = PGRST116, function not found)
        if (error.code === 'PGRST202' || error.code === 'PGRST116' || error.message?.includes('404')) {
          console.warn('Event like function not available, returning false');
          return { isLiked: false };
        }
        throw error;
      }

      return { isLiked: data as boolean };
    } catch (error) {
      console.error('Error checking if event is liked:', error);
      // Handle network errors or 404s that don't get caught above
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
        console.warn('Event like function not available, returning false');
        return { isLiked: false };
      }
      return { isLiked: false, error: 'Failed to check like status' };
    }
  }

  /**
   * Get like count for an event
   */
  static async getEventLikeCount(eventId: string): Promise<{ count: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('get_event_like_count', {
        event_uuid: eventId
      });

      if (error) {
        // Handle missing function gracefully (404 = PGRST116, function not found)
        if (error.code === 'PGRST202' || error.code === 'PGRST116' || error.message?.includes('404')) {
          console.warn('Event like count function not available, returning 0');
          return { count: 0 };
        }
        throw error;
      }

      return { count: data as number };
    } catch (error) {
      console.error('Error getting event like count:', error);
      // Handle network errors or 404s that don't get caught above
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
        console.warn('Event like count function not available, returning 0');
        return { count: 0 };
      }
      return { count: 0, error: 'Failed to get like count' };
    }
  }

  /**
   * Get all events liked by the current user
   */
  static async getUserLikedEvents(limit: number = 20): Promise<{ events: LikedEvent[]; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { events: [], error: 'Authentication required' };
      }

      const { data, error } = await supabase.rpc('get_user_liked_events', {
        user_uuid: user.id,
        limit_count: limit
      });

      if (error) {
        throw error;
      }

      return { events: data as LikedEvent[] };
    } catch (error) {
      console.error('Error getting user liked events:', error);
      return { events: [], error: 'Failed to get liked events' };
    }
  }

  /**
   * Get events with like counts and user like status
   */
  static async getEventsWithLikes(limit: number = 20): Promise<{ events: EventWithLikeInfo[]; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('get_events_with_likes', {
        user_uuid: user?.id || null,
        limit_count: limit
      });

      if (error) {
        throw error;
      }

      return { events: data as EventWithLikeInfo[] };
    } catch (error) {
      console.error('Error getting events with likes:', error);
      return { events: [], error: 'Failed to get events with likes' };
    }
  }

  /**
   * Get like count and user like status for multiple events
   */
  static async getEventLikeInfo(eventIds: string[]): Promise<{ eventLikes: { [eventId: string]: { count: number; isLiked: boolean } }; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get like counts for all events
      const { data: likeCounts, error: countError } = await supabase
        .from('event_likes')
        .select('event_id')
        .in('event_id', eventIds);

      if (countError) {
        throw countError;
      }

      // Count likes per event
      const counts = eventIds.reduce((acc, eventId) => {
        acc[eventId] = likeCounts.filter(like => like.event_id === eventId).length;
        return acc;
      }, {} as { [eventId: string]: number });

      // Get user's like status if authenticated
      let userLikes: { [eventId: string]: boolean } = {};
      if (user) {
        const { data: userLikeData, error: userLikeError } = await supabase
          .from('event_likes')
          .select('event_id')
          .eq('user_id', user.id)
          .in('event_id', eventIds);

        if (userLikeError) {
          throw userLikeError;
        }

        userLikes = eventIds.reduce((acc, eventId) => {
          acc[eventId] = userLikeData.some(like => like.event_id === eventId);
          return acc;
        }, {} as { [eventId: string]: boolean });
      } else {
        userLikes = eventIds.reduce((acc, eventId) => {
          acc[eventId] = false;
          return acc;
        }, {} as { [eventId: string]: boolean });
      }

      // Combine counts and user like status
      const eventLikes = eventIds.reduce((acc, eventId) => {
        acc[eventId] = {
          count: counts[eventId] || 0,
          isLiked: userLikes[eventId] || false
        };
        return acc;
      }, {} as { [eventId: string]: { count: number; isLiked: boolean } });

      return { eventLikes };
    } catch (error) {
      console.error('Error getting event like info:', error);
      return { eventLikes: {}, error: 'Failed to get event like info' };
    }
  }
}