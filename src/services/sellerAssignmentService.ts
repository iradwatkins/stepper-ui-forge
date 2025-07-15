/**
 * Seller Assignment Service
 * 
 * Manages single event limitation for sellers where each seller can only
 * work one event at a time. This enforces the business rule that sellers
 * must complete one event before being assigned to another.
 */

import { supabase } from '@/lib/supabase'

export interface SellerAssignment {
  id: string
  seller_id: string
  organizer_id: string
  event_id: string
  promotion_id: string
  assigned_at: string
  status: 'active' | 'disabled' | 'completed'
  commission_rate: number
  created_at: string
  updated_at: string
}

export interface SellerCurrentAssignment {
  assignment_id: string
  event_id: string
  event_title: string
  organizer_id: string
  organizer_name: string
  commission_rate: number
  assigned_at: string
}

export interface EventSellerAssignment {
  assignment_id: string
  seller_id: string
  seller_name: string
  seller_email: string
  commission_rate: number
  status: string
  assigned_at: string
  tickets_sold: number
  total_earnings: number
}

export interface AssignmentResult {
  success: boolean
  message: string
  assignment_id?: string
}

export class SellerAssignmentService {
  /**
   * Assign seller to a specific event (enforcing single event limitation)
   */
  static async assignSellerToEvent(
    sellerId: string,
    eventId: string,
    organizerId: string,
    commissionRate?: number
  ): Promise<AssignmentResult> {
    try {
      const { data, error } = await supabase
        .rpc('assign_seller_to_event', {
          seller_user_id: sellerId,
          event_id_param: eventId,
          organizer_user_id: organizerId,
          commission_rate_param: commissionRate
        })

      if (error) {
        console.error('Error assigning seller to event:', error)
        throw new Error('Failed to assign seller to event')
      }

      const result = data?.[0]
      if (!result) {
        throw new Error('No result returned from assignment function')
      }

      return {
        success: result.success,
        message: result.message,
        assignment_id: result.assignment_id
      }

    } catch (error) {
      console.error('SellerAssignmentService.assignSellerToEvent failed:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign seller to event'
      }
    }
  }

  /**
   * Complete seller assignment when event ends
   */
  static async completeSellerAssignment(
    assignmentId: string,
    organizerId: string
  ): Promise<AssignmentResult> {
    try {
      const { data, error } = await supabase
        .rpc('complete_seller_assignment', {
          assignment_id_param: assignmentId,
          organizer_user_id: organizerId
        })

      if (error) {
        console.error('Error completing seller assignment:', error)
        throw new Error('Failed to complete seller assignment')
      }

      const result = data?.[0]
      if (!result) {
        throw new Error('No result returned from completion function')
      }

      return {
        success: result.success,
        message: result.message
      }

    } catch (error) {
      console.error('SellerAssignmentService.completeSellerAssignment failed:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to complete seller assignment'
      }
    }
  }

  /**
   * Disable seller assignment (remove from event)
   */
  static async disableSellerAssignment(
    assignmentId: string,
    organizerId: string
  ): Promise<AssignmentResult> {
    try {
      const { data, error } = await supabase
        .rpc('disable_seller_assignment', {
          assignment_id_param: assignmentId,
          organizer_user_id: organizerId
        })

      if (error) {
        console.error('Error disabling seller assignment:', error)
        throw new Error('Failed to disable seller assignment')
      }

      const result = data?.[0]
      if (!result) {
        throw new Error('No result returned from disable function')
      }

      return {
        success: result.success,
        message: result.message
      }

    } catch (error) {
      console.error('SellerAssignmentService.disableSellerAssignment failed:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to disable seller assignment'
      }
    }
  }

  /**
   * Get seller's current active assignment
   */
  static async getSellerCurrentAssignment(sellerId: string): Promise<SellerCurrentAssignment | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_seller_current_assignment', {
          seller_user_id: sellerId
        })

      if (error) {
        console.error('Error fetching seller current assignment:', error)
        throw new Error('Failed to fetch seller current assignment')
      }

      if (!data || data.length === 0) {
        return null
      }

      const assignment = data[0]
      return {
        assignment_id: assignment.assignment_id,
        event_id: assignment.event_id,
        event_title: assignment.event_title,
        organizer_id: assignment.organizer_id,
        organizer_name: assignment.organizer_name,
        commission_rate: parseFloat(assignment.commission_rate),
        assigned_at: assignment.assigned_at
      }

    } catch (error) {
      console.error('SellerAssignmentService.getSellerCurrentAssignment failed:', error)
      return null
    }
  }

  /**
   * Get all seller assignments for an event
   */
  static async getEventSellerAssignments(
    eventId: string,
    organizerId: string
  ): Promise<EventSellerAssignment[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_event_seller_assignments', {
          event_id_param: eventId,
          organizer_user_id: organizerId
        })

      if (error) {
        console.error('Error fetching event seller assignments:', error)
        throw new Error('Failed to fetch event seller assignments')
      }

      return (data || []).map((item: any) => ({
        assignment_id: item.assignment_id,
        seller_id: item.seller_id,
        seller_name: item.seller_name,
        seller_email: item.seller_email,
        commission_rate: parseFloat(item.commission_rate),
        status: item.status,
        assigned_at: item.assigned_at,
        tickets_sold: item.tickets_sold,
        total_earnings: parseFloat(item.total_earnings || 0)
      }))

    } catch (error) {
      console.error('SellerAssignmentService.getEventSellerAssignments failed:', error)
      return []
    }
  }

  /**
   * Check if seller can be assigned to an event
   */
  static async canSellerBeAssigned(sellerId: string): Promise<{
    canAssign: boolean
    currentAssignment?: SellerCurrentAssignment
    reason?: string
  }> {
    try {
      const currentAssignment = await this.getSellerCurrentAssignment(sellerId)
      
      if (currentAssignment) {
        return {
          canAssign: false,
          currentAssignment,
          reason: `Already assigned to ${currentAssignment.event_title}`
        }
      }

      return {
        canAssign: true
      }

    } catch (error) {
      console.error('SellerAssignmentService.canSellerBeAssigned failed:', error)
      return {
        canAssign: false,
        reason: 'Error checking seller availability'
      }
    }
  }

  /**
   * Get seller assignment by ID
   */
  static async getSellerAssignment(assignmentId: string): Promise<SellerAssignment | null> {
    try {
      const { data, error } = await supabase
        .from('seller_event_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Assignment not found
        }
        console.error('Error fetching seller assignment:', error)
        throw new Error('Failed to fetch seller assignment')
      }

      return {
        id: data.id,
        seller_id: data.seller_id,
        organizer_id: data.organizer_id,
        event_id: data.event_id,
        promotion_id: data.promotion_id,
        assigned_at: data.assigned_at,
        status: data.status,
        commission_rate: parseFloat(data.commission_rate),
        created_at: data.created_at,
        updated_at: data.updated_at
      }

    } catch (error) {
      console.error('SellerAssignmentService.getSellerAssignment failed:', error)
      return null
    }
  }

  /**
   * Update seller assignment commission rate
   */
  static async updateCommissionRate(
    assignmentId: string,
    newCommissionRate: number,
    organizerId: string
  ): Promise<AssignmentResult> {
    try {
      // Verify organizer owns this assignment
      const assignment = await this.getSellerAssignment(assignmentId)
      if (!assignment || assignment.organizer_id !== organizerId) {
        return {
          success: false,
          message: 'Assignment not found or you do not have permission'
        }
      }

      const { error } = await supabase
        .from('seller_event_assignments')
        .update({ 
          commission_rate: newCommissionRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)

      if (error) {
        console.error('Error updating commission rate:', error)
        throw new Error('Failed to update commission rate')
      }

      return {
        success: true,
        message: 'Commission rate updated successfully'
      }

    } catch (error) {
      console.error('SellerAssignmentService.updateCommissionRate failed:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update commission rate'
      }
    }
  }

  /**
   * Get all assignments for a seller (history)
   */
  static async getSellerAssignmentHistory(sellerId: string): Promise<SellerAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('seller_event_assignments')
        .select('*')
        .eq('seller_id', sellerId)
        .order('assigned_at', { ascending: false })

      if (error) {
        console.error('Error fetching seller assignment history:', error)
        throw new Error('Failed to fetch seller assignment history')
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        seller_id: item.seller_id,
        organizer_id: item.organizer_id,
        event_id: item.event_id,
        promotion_id: item.promotion_id,
        assigned_at: item.assigned_at,
        status: item.status,
        commission_rate: parseFloat(item.commission_rate),
        created_at: item.created_at,
        updated_at: item.updated_at
      }))

    } catch (error) {
      console.error('SellerAssignmentService.getSellerAssignmentHistory failed:', error)
      return []
    }
  }
}