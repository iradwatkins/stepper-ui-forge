// Event Like Service - Refactored with standardized error handling
// Example of how to implement the new ServiceResponse pattern

import { supabase } from '../supabase'
import { 
  BaseService, 
  ServiceResponse, 
  ServiceResponseBuilder, 
  ErrorCodes,
  ServiceLogger 
} from '../utils/ServiceResponse'

export interface EventLike {
  id: string
  user_id: string
  event_id: string
  created_at: string
  updated_at: string
}

export interface LikeToggleResult {
  isLiked: boolean
  newCount: number
}

export interface LikeStatus {
  isLiked: boolean
  canLike: boolean
}

export interface LikeCount {
  count: number
  eventId: string
}

/**
 * Event Like Service with standardized error handling
 */
export class EventLikeServiceV2 extends BaseService {
  protected static serviceName = 'EventLikeService'

  /**
   * Toggle like status for an event
   */
  static async toggleEventLike(eventId: string): Promise<ServiceResponse<LikeToggleResult>> {
    return this.executeOperation('toggleEventLike', async () => {
      // Validate required parameters
      const validation = this.validateRequired({ eventId })
      if (validation) throw validation

      // Validate authentication
      const authResult = await this.validateAuth()
      if (!authResult.success) throw authResult

      const userId = authResult.data!.userId

      ServiceLogger.info(this.serviceName, 'toggleEventLike', `Toggling like for event ${eventId}`)

      // Check current like status
      const { data: existingLike } = await supabase
        .from('event_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single()

      let isLiked: boolean
      
      if (existingLike) {
        // Unlike the event
        const { error } = await supabase
          .from('event_likes')
          .delete()
          .eq('id', existingLike.id)

        if (error) {
          throw ServiceResponseBuilder.fromSupabaseError(error, 'Failed to unlike event')
        }

        isLiked = false
        ServiceLogger.info(this.serviceName, 'toggleEventLike', `Event ${eventId} unliked`)
      } else {
        // Like the event
        const { error } = await supabase
          .from('event_likes')
          .insert({
            user_id: userId,
            event_id: eventId
          })

        if (error) {
          throw ServiceResponseBuilder.fromSupabaseError(error, 'Failed to like event')
        }

        isLiked = true
        ServiceLogger.info(this.serviceName, 'toggleEventLike', `Event ${eventId} liked`)
      }

      // Get updated count
      const countResult = await this.getEventLikeCount(eventId)
      if (!countResult.success) {
        ServiceLogger.warn(this.serviceName, 'toggleEventLike', 'Failed to get updated count, using estimate')
      }

      const newCount = countResult.success ? countResult.data!.count : 0

      return {
        isLiked,
        newCount
      }
    }, { eventId })
  }

  /**
   * Check if user has liked an event
   */
  static async isEventLiked(eventId: string): Promise<ServiceResponse<LikeStatus>> {
    return this.executeOperation('isEventLiked', async () => {
      // Validate required parameters
      const validation = this.validateRequired({ eventId })
      if (validation) throw validation

      // Check authentication (but don't require it)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return {
          isLiked: false,
          canLike: false
        }
      }

      const { data, error } = await supabase
        .from('event_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw ServiceResponseBuilder.fromSupabaseError(error, 'Failed to check like status')
      }

      return {
        isLiked: !!data,
        canLike: true
      }
    }, { eventId })
  }

  /**
   * Get like count for an event
   */
  static async getEventLikeCount(eventId: string): Promise<ServiceResponse<LikeCount>> {
    return this.executeOperation('getEventLikeCount', async () => {
      // Validate required parameters
      const validation = this.validateRequired({ eventId })
      if (validation) throw validation

      const { count, error } = await supabase
        .from('event_likes')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)

      if (error) {
        throw ServiceResponseBuilder.fromSupabaseError(error, 'Failed to get like count')
      }

      return {
        count: count || 0,
        eventId
      }
    }, { eventId })
  }

  /**
   * Get user's liked events
   */
  static async getUserLikedEvents(userId?: string): Promise<ServiceResponse<EventLike[]>> {
    return this.executeOperation('getUserLikedEvents', async () => {
      let targetUserId = userId

      // If no userId provided, get from auth
      if (!targetUserId) {
        const authResult = await this.validateAuth()
        if (!authResult.success) throw authResult
        targetUserId = authResult.data!.userId
      }

      const { data, error } = await supabase
        .from('event_likes')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })

      if (error) {
        throw ServiceResponseBuilder.fromSupabaseError(error, 'Failed to get liked events')
      }

      return data || []
    }, { userId })
  }

  /**
   * Unlike an event (direct unlike operation)
   */
  static async unlikeEvent(eventId: string): Promise<ServiceResponse<boolean>> {
    return this.executeOperation('unlikeEvent', async () => {
      // Validate required parameters
      const validation = this.validateRequired({ eventId })
      if (validation) throw validation

      // Validate authentication
      const authResult = await this.validateAuth()
      if (!authResult.success) throw authResult

      const userId = authResult.data!.userId

      const { error } = await supabase
        .from('event_likes')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId)

      if (error) {
        throw ServiceResponseBuilder.fromSupabaseError(error, 'Failed to unlike event')
      }

      ServiceLogger.info(this.serviceName, 'unlikeEvent', `Event ${eventId} unliked by user ${userId}`)
      return true
    }, { eventId })
  }

  /**
   * Like an event (direct like operation)
   */
  static async likeEvent(eventId: string): Promise<ServiceResponse<EventLike>> {
    return this.executeOperation('likeEvent', async () => {
      // Validate required parameters
      const validation = this.validateRequired({ eventId })
      if (validation) throw validation

      // Validate authentication
      const authResult = await this.validateAuth()
      if (!authResult.success) throw authResult

      const userId = authResult.data!.userId

      // Check if already liked to prevent duplicates
      const existingCheck = await this.isEventLiked(eventId)
      if (existingCheck.success && existingCheck.data!.isLiked) {
        throw ServiceResponseBuilder.error(
          ErrorCodes.ALREADY_EXISTS,
          'Event is already liked',
          'business_logic',
          { userMessage: 'You have already liked this event' }
        )
      }

      const { data, error } = await supabase
        .from('event_likes')
        .insert({
          user_id: userId,
          event_id: eventId
        })
        .select()
        .single()

      if (error) {
        throw ServiceResponseBuilder.fromSupabaseError(error, 'Failed to like event')
      }

      ServiceLogger.info(this.serviceName, 'likeEvent', `Event ${eventId} liked by user ${userId}`)
      return data
    }, { eventId })
  }

  /**
   * Get events with like information for a user
   */
  static async getEventsWithLikeInfo(
    eventIds: string[], 
    userId?: string
  ): Promise<ServiceResponse<Record<string, LikeStatus>>> {
    return this.executeOperation('getEventsWithLikeInfo', async () => {
      // Validate required parameters
      const validation = this.validateRequired({ eventIds })
      if (validation) throw validation

      if (eventIds.length === 0) {
        return {}
      }

      // Get current user if not provided
      const { data: { user } } = await supabase.auth.getUser()
      const targetUserId = userId || user?.id

      if (!targetUserId) {
        // Return all events as not liked if no user
        return eventIds.reduce((acc, eventId) => {
          acc[eventId] = { isLiked: false, canLike: false }
          return acc
        }, {} as Record<string, LikeStatus>)
      }

      const { data, error } = await supabase
        .from('event_likes')
        .select('event_id')
        .eq('user_id', targetUserId)
        .in('event_id', eventIds)

      if (error) {
        throw ServiceResponseBuilder.fromSupabaseError(error, 'Failed to get like information')
      }

      const likedEventIds = new Set(data?.map(like => like.event_id) || [])

      return eventIds.reduce((acc, eventId) => {
        acc[eventId] = {
          isLiked: likedEventIds.has(eventId),
          canLike: true
        }
        return acc
      }, {} as Record<string, LikeStatus>)
    }, { eventIds, userId })
  }
}