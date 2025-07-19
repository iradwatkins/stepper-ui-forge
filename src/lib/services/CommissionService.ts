// Commission Service for managing earnings and commission tracking
// Handles commission calculation, earnings recording, and commission reporting

import { supabase } from '@/lib/supabase'

export interface CommissionEarning {
  id: string
  referral_code_id: string
  order_id: string
  follower_id: string
  organizer_id: string
  event_id: string
  sale_amount: number
  commission_rate: number
  commission_amount: number
  commission_type: 'percentage' | 'fixed'
  status: 'pending' | 'confirmed' | 'paid'
  created_at: string
  updated_at: string
}

export interface CommissionSummary {
  total_earnings: number
  pending_amount: number
  confirmed_amount: number
  paid_amount: number
  total_sales: number
  commission_count: number
}

export interface ReferralPerformance {
  referral_code: string
  code_id: string
  event_title: string
  clicks_count: number
  conversions_count: number
  total_sales: number
  total_commission: number
  conversion_rate: number
}

export class CommissionService {
  /**
   * Calculate commission amount based on sale and rate/fixed amount
   */
  static calculateCommission(
    saleAmount: number, 
    commissionRate: number, 
    commissionType: 'percentage' | 'fixed' = 'percentage',
    commissionFixedAmount: number = 0,
    ticketQuantity: number = 1
  ): number {
    if (commissionType === 'fixed') {
      // For fixed commissions, multiply by number of tickets
      return Math.round(commissionFixedAmount * ticketQuantity * 100) / 100
    }
    // For percentage, calculate based on total sale amount
    return Math.round(saleAmount * commissionRate * 100) / 100
  }

  /**
   * Create commission earning record when a referral sale occurs
   */
  static async createCommissionEarning(
    referralCodeId: string,
    orderId: string,
    followerId: string,
    organizerId: string,
    eventId: string,
    saleAmount: number,
    commissionRate: number,
    commissionType: 'percentage' | 'fixed' = 'percentage',
    commissionFixedAmount: number = 0,
    ticketQuantity: number = 1
  ): Promise<{ success: boolean; earning?: CommissionEarning; error?: string }> {
    try {
      const commissionAmount = this.calculateCommission(
        saleAmount, 
        commissionRate,
        commissionType,
        commissionFixedAmount,
        ticketQuantity
      )

      const { data, error } = await supabase
        .from('commission_earnings')
        .insert({
          referral_code_id: referralCodeId,
          order_id: orderId,
          follower_id: followerId,
          organizer_id: organizerId,
          event_id: eventId,
          sale_amount: saleAmount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          commission_type: commissionType,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating commission earning:', error)
        return { success: false, error: error.message }
      }

      return { success: true, earning: data }
    } catch (error) {
      console.error('Failed to create commission earning:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get commission earnings for a specific follower/seller
   */
  static async getFollowerEarnings(
    followerId: string,
    status?: string,
    limit = 50,
    offset = 0
  ): Promise<CommissionEarning[]> {
    try {
      let query = supabase
        .from('commission_earnings')
        .select(`
          *,
          referral_codes (
            code,
            referral_url
          ),
          events (
            title,
            date
          ),
          orders (
            customer_email,
            total_amount
          )
        `)
        .eq('follower_id', followerId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching follower earnings:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to get follower earnings:', error)
      return []
    }
  }

  /**
   * Get commission summary for a follower
   */
  static async getFollowerCommissionSummary(followerId: string): Promise<CommissionSummary> {
    try {
      const { data, error } = await supabase
        .from('commission_earnings')
        .select('commission_amount, sale_amount, status')
        .eq('follower_id', followerId)

      if (error) {
        console.error('Error fetching commission summary:', error)
        return {
          total_earnings: 0,
          pending_amount: 0,
          confirmed_amount: 0,
          paid_amount: 0,
          total_sales: 0,
          commission_count: 0
        }
      }

      const earnings = data || []
      
      return {
        total_earnings: earnings.reduce((sum, e) => sum + e.commission_amount, 0),
        pending_amount: earnings
          .filter(e => e.status === 'pending')
          .reduce((sum, e) => sum + e.commission_amount, 0),
        confirmed_amount: earnings
          .filter(e => e.status === 'confirmed')
          .reduce((sum, e) => sum + e.commission_amount, 0),
        paid_amount: earnings
          .filter(e => e.status === 'paid')
          .reduce((sum, e) => sum + e.commission_amount, 0),
        total_sales: earnings.reduce((sum, e) => sum + e.sale_amount, 0),
        commission_count: earnings.length
      }
    } catch (error) {
      console.error('Failed to get commission summary:', error)
      return {
        total_earnings: 0,
        pending_amount: 0,
        confirmed_amount: 0,
        paid_amount: 0,
        total_sales: 0,
        commission_count: 0
      }
    }
  }

  /**
   * Get referral performance analytics for a follower
   */
  static async getReferralPerformance(followerId: string): Promise<ReferralPerformance[]> {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select(`
          id,
          code,
          clicks_count,
          conversions_count,
          events (
            title
          ),
          commission_earnings (
            sale_amount,
            commission_amount
          )
        `)
        .eq('follower_id', followerId)
        .order('conversions_count', { ascending: false })

      if (error) {
        console.error('Error fetching referral performance:', error)
        return []
      }

      return (data || []).map((referral: any) => {
        const earnings = referral.commission_earnings || []
        const totalSales = earnings.reduce((sum: number, e: any) => sum + e.sale_amount, 0)
        const totalCommission = earnings.reduce((sum: number, e: any) => sum + e.commission_amount, 0)
        
        return {
          referral_code: referral.code,
          code_id: referral.id,
          event_title: referral.events?.title || 'Unknown Event',
          clicks_count: referral.clicks_count || 0,
          conversions_count: referral.conversions_count || 0,
          total_sales: totalSales,
          total_commission: totalCommission,
          conversion_rate: referral.clicks_count > 0 
            ? (referral.conversions_count / referral.clicks_count) * 100 
            : 0
        }
      })
    } catch (error) {
      console.error('Failed to get referral performance:', error)
      return []
    }
  }

  /**
   * Update commission status (pending → confirmed → paid)
   */
  static async updateCommissionStatus(
    commissionId: string,
    status: 'pending' | 'confirmed' | 'paid'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('commission_earnings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', commissionId)

      if (error) {
        console.error('Error updating commission status:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to update commission status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get commission earnings for an organizer (to track what they owe)
   */
  static async getOrganizerCommissionLiability(
    organizerId: string,
    status?: string
  ): Promise<{ totalOwed: number; earnings: CommissionEarning[] }> {
    try {
      let query = supabase
        .from('commission_earnings')
        .select(`
          *,
          profiles:follower_id (
            full_name,
            email
          ),
          referral_codes (
            code
          ),
          events (
            title
          )
        `)
        .eq('organizer_id', organizerId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching organizer commission liability:', error)
        return { totalOwed: 0, earnings: [] }
      }

      const earnings = data || []
      const totalOwed = earnings.reduce((sum, e) => sum + e.commission_amount, 0)

      return { totalOwed, earnings }
    } catch (error) {
      console.error('Failed to get organizer commission liability:', error)
      return { totalOwed: 0, earnings: [] }
    }
  }

  /**
   * Mark commissions as paid (used when payout is processed)
   */
  static async markCommissionsAsPaid(
    commissionIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('commission_earnings')
        .update({ 
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .in('id', commissionIds)

      if (error) {
        console.error('Error marking commissions as paid:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to mark commissions as paid:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get top performers for an organizer
   */
  static async getTopPerformers(
    organizerId: string,
    limit = 10
  ): Promise<Array<{
    follower_id: string
    follower_name: string
    total_sales: number
    total_commission: number
    conversion_count: number
  }>> {
    try {
      const { data, error } = await supabase
        .from('commission_earnings')
        .select(`
          follower_id,
          sale_amount,
          commission_amount,
          profiles:follower_id (
            full_name,
            email
          )
        `)
        .eq('organizer_id', organizerId)
        .eq('status', 'confirmed')

      if (error) {
        console.error('Error fetching top performers:', error)
        return []
      }

      // Group by follower and calculate totals
      const performerMap = new Map()
      
      data?.forEach((earning: any) => {
        const followerId = earning.follower_id
        if (!performerMap.has(followerId)) {
          performerMap.set(followerId, {
            follower_id: followerId,
            follower_name: earning.profiles?.full_name || earning.profiles?.email || 'Unknown',
            total_sales: 0,
            total_commission: 0,
            conversion_count: 0
          })
        }
        
        const performer = performerMap.get(followerId)
        performer.total_sales += earning.sale_amount
        performer.total_commission += earning.commission_amount
        performer.conversion_count += 1
      })

      return Array.from(performerMap.values())
        .sort((a, b) => b.total_commission - a.total_commission)
        .slice(0, limit)
    } catch (error) {
      console.error('Failed to get top performers:', error)
      return []
    }
  }
}