import { supabase } from '@/integrations/supabase/client'
import { EventLike, EventLikeInsert } from '@/types/database'

export class EventLikesService {
  /**
   * Like an event
   */
  static async likeEvent(userId: string, eventId: string): Promise<EventLike> {
    const likeData: EventLikeInsert = {
      user_id: userId,
      event_id: eventId
    }

    const { data, error } = await supabase
      .from('event_likes')
      .insert(likeData)
      .select()
      .single()

    if (error) {
      console.error('Error liking event:', error)
      throw new Error('Failed to like event')
    }

    return data
  }

  /**
   * Unlike an event
   */
  static async unlikeEvent(userId: string, eventId: string): Promise<void> {
    const { error } = await supabase
      .from('event_likes')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)

    if (error) {
      console.error('Error unliking event:', error)
      throw new Error('Failed to unlike event')
    }
  }

  /**
   * Check if user has liked an event
   */
  static async hasUserLikedEvent(userId: string, eventId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('event_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single()

    if (error) {
      // If no record found, user hasn't liked the event
      if (error.code === 'PGRST116') {
        return false
      }
      console.error('Error checking like status:', error)
      throw new Error('Failed to check like status')
    }

    return !!data
  }

  /**
   * Get all events liked by a user
   */
  static async getUserLikedEvents(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('event_likes')
      .select(`
        created_at,
        event:events (
          id,
          title,
          description,
          date,
          time,
          location,
          categories,
          event_type,
          status,
          images,
          display_price,
          owner:profiles!owner_id (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching liked events:', error)
      throw new Error('Failed to fetch liked events')
    }

    return data?.map(item => item.event).filter(Boolean) || []
  }

  /**
   * Get events liked by a user, separated by upcoming and past
   */
  static async getUserLikedEventsCategorized(userId: string): Promise<{
    upcoming: any[]
    past: any[]
  }> {
    const allEvents = await this.getUserLikedEvents(userId)
    const now = new Date()
    
    const upcoming: any[] = []
    const past: any[] = []
    
    allEvents.forEach(event => {
      const eventDate = new Date(event.date)
      if (eventDate >= now) {
        upcoming.push(event)
      } else {
        past.push(event)
      }
    })
    
    // Sort upcoming events by date ascending (nearest first)
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // Sort past events by date descending (most recent first)
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    return { upcoming, past }
  }

  /**
   * Get like count for an event
   */
  static async getEventLikeCount(eventId: string): Promise<number> {
    const { count, error } = await supabase
      .from('event_likes')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    if (error) {
      console.error('Error getting like count:', error)
      throw new Error('Failed to get like count')
    }

    return count || 0
  }

  /**
   * Get events with like counts and user like status
   */
  static async getEventsWithLikeInfo(userId?: string): Promise<any[]> {
    // First get all events with like counts
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        *,
        owner:profiles!owner_id (
          full_name,
          avatar_url
        ),
        like_count:event_likes(count)
      `)
      .eq('status', 'published')
      .eq('is_public', true)
      .order('date', { ascending: true })

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      throw new Error('Failed to fetch events')
    }

    if (!userId) {
      return events?.map(event => ({
        ...event,
        like_count: event.like_count?.length || 0,
        user_has_liked: false
      })) || []
    }

    // Get user's liked events if user is provided
    const { data: userLikes, error: likesError } = await supabase
      .from('event_likes')
      .select('event_id')
      .eq('user_id', userId)

    if (likesError) {
      console.error('Error fetching user likes:', likesError)
      // Continue without user like info
    }

    const userLikedEventIds = new Set(userLikes?.map(like => like.event_id) || [])

    return events?.map(event => ({
      ...event,
      like_count: event.like_count?.length || 0,
      user_has_liked: userLikedEventIds.has(event.id)
    })) || []
  }

  /**
   * Toggle like status for an event
   */
  static async toggleEventLike(userId: string, eventId: string): Promise<{ liked: boolean; likeCount: number }> {
    const hasLiked = await this.hasUserLikedEvent(userId, eventId)

    if (hasLiked) {
      await this.unlikeEvent(userId, eventId)
    } else {
      await this.likeEvent(userId, eventId)
    }

    const likeCount = await this.getEventLikeCount(eventId)

    return {
      liked: !hasLiked,
      likeCount
    }
  }
}