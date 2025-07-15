import { supabase } from '@/lib/supabase'
import { SellerPayout, SellerPayoutInsert, PayoutMethod } from '@/types/database'

export interface UnpaidCommissions {
  seller_id: string
  seller_name: string
  seller_email: string
  total_unpaid: number
  unpaid_count: number
  commission_ids: string[]
}

export interface PayoutSummary {
  total_paid: number
  total_pending: number
  total_sellers: number
  recent_payouts: SellerPayout[]
}

export class PayoutService {
  /**
   * Get all unpaid commissions for an event, grouped by seller
   */
  static async getUnpaidCommissionsBySeller(eventId: string, organizerId: string): Promise<UnpaidCommissions[]> {
    const { data, error } = await supabase
      .rpc('get_unpaid_commissions_by_seller', {
        event_id_param: eventId,
        organizer_id_param: organizerId
      })

    if (error) {
      console.error('Error fetching unpaid commissions:', error)
      throw new Error('Failed to fetch unpaid commissions')
    }

    return data || []
  }

  /**
   * Get detailed unpaid commissions for a specific seller
   */
  static async getSellerUnpaidCommissions(sellerId: string, eventId: string): Promise<{
    total_unpaid: number
    unpaid_count: number
    commission_ids: string[]
  }> {
    const { data, error } = await supabase
      .rpc('get_unpaid_commissions', {
        seller_uuid: sellerId,
        event_uuid: eventId
      })

    if (error) {
      console.error('Error fetching seller unpaid commissions:', error)
      throw new Error('Failed to fetch seller commissions')
    }

    return data?.[0] || { total_unpaid: 0, unpaid_count: 0, commission_ids: [] }
  }

  /**
   * Create a new seller payout
   */
  static async createPayout(payoutData: SellerPayoutInsert): Promise<SellerPayout> {
    const { data, error } = await supabase
      .from('seller_payouts')
      .insert(payoutData)
      .select()
      .single()

    if (error) {
      console.error('Error creating payout:', error)
      throw new Error('Failed to create payout')
    }

    // Mark related commissions as paid
    if (payoutData.commission_earnings_ids && payoutData.commission_earnings_ids.length > 0) {
      await this.markCommissionsAsPaid(data.id, payoutData.commission_earnings_ids)
    }

    return data
  }

  /**
   * Mark commission earnings as paid
   */
  static async markCommissionsAsPaid(payoutId: string, commissionIds: string[]): Promise<void> {
    const { error } = await supabase
      .rpc('mark_commissions_paid', {
        payout_uuid: payoutId,
        commission_ids: commissionIds
      })

    if (error) {
      console.error('Error marking commissions as paid:', error)
      throw new Error('Failed to mark commissions as paid')
    }
  }

  /**
   * Get payout history for an organizer
   */
  static async getOrganizerPayouts(organizerId: string, eventId?: string): Promise<SellerPayout[]> {
    let query = supabase
      .from('seller_payouts')
      .select(`
        *,
        seller:profiles!seller_id(full_name, email),
        event:events(title)
      `)
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching organizer payouts:', error)
      throw new Error('Failed to fetch payouts')
    }

    return data || []
  }

  /**
   * Get payout history for a seller
   */
  static async getSellerPayouts(sellerId: string): Promise<SellerPayout[]> {
    const { data, error } = await supabase
      .from('seller_payouts')
      .select(`
        *,
        organizer:profiles!organizer_id(full_name, email),
        event:events(title)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching seller payouts:', error)
      throw new Error('Failed to fetch seller payouts')
    }

    return data || []
  }

  /**
   * Get payout summary for an organizer
   */
  static async getPayoutSummary(organizerId: string, eventId?: string): Promise<PayoutSummary> {
    let query = supabase
      .from('seller_payouts')
      .select('amount, status, created_at')
      .eq('organizer_id', organizerId)

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data: payouts, error } = await query

    if (error) {
      console.error('Error fetching payout summary:', error)
      throw new Error('Failed to fetch payout summary')
    }

    const summary: PayoutSummary = {
      total_paid: 0,
      total_pending: 0,
      total_sellers: 0,
      recent_payouts: []
    }

    if (payouts) {
      summary.total_paid = payouts
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0)
      
      summary.total_pending = payouts
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0)
      
      summary.total_sellers = new Set(payouts.map(p => p.seller_id)).size
    }

    // Get recent payouts with details
    const { data: recentPayouts } = await supabase
      .from('seller_payouts')
      .select(`
        *,
        seller:profiles!seller_id(full_name),
        event:events(title)
      `)
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false })
      .limit(5)

    summary.recent_payouts = recentPayouts || []

    return summary
  }

  /**
   * Update payout status
   */
  static async updatePayoutStatus(payoutId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('seller_payouts')
      .update({ status })
      .eq('id', payoutId)

    if (error) {
      console.error('Error updating payout status:', error)
      throw new Error('Failed to update payout status')
    }
  }

  /**
   * Get total earnings for a seller (all time)
   */
  static async getSellerTotalEarnings(sellerId: string): Promise<{
    total_earned: number
    total_paid: number
    total_pending: number
  }> {
    // Get commission earnings
    const { data: commissions, error: commissionError } = await supabase
      .from('commission_earnings')
      .select('commission_amount, status')
      .eq('follower_id', sellerId)
      .eq('status', 'confirmed')

    if (commissionError) {
      console.error('Error fetching seller earnings:', commissionError)
      throw new Error('Failed to fetch seller earnings')
    }

    // Get payouts
    const { data: payouts, error: payoutError } = await supabase
      .from('seller_payouts')
      .select('amount, status')
      .eq('seller_id', sellerId)

    if (payoutError) {
      console.error('Error fetching seller payouts:', payoutError)
      throw new Error('Failed to fetch seller payouts')
    }

    const total_earned = commissions?.reduce((sum, c) => sum + c.commission_amount, 0) || 0
    const total_paid = payouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0
    const total_pending = total_earned - total_paid

    return {
      total_earned,
      total_paid,
      total_pending
    }
  }
}

// Database function to get unpaid commissions by seller (to be added to migration)
export const unpaidCommissionsBySellerFunction = `
CREATE OR REPLACE FUNCTION get_unpaid_commissions_by_seller(
  event_id_param UUID,
  organizer_id_param UUID
)
RETURNS TABLE (
  seller_id UUID,
  seller_name TEXT,
  seller_email TEXT,
  total_unpaid DECIMAL(10,2),
  unpaid_count INTEGER,
  commission_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.follower_id as seller_id,
    p.full_name as seller_name,
    p.email as seller_email,
    SUM(ce.commission_amount) as total_unpaid,
    COUNT(ce.id)::INTEGER as unpaid_count,
    ARRAY_AGG(ce.id) as commission_ids
  FROM commission_earnings ce
  JOIN profiles p ON p.id = ce.follower_id
  WHERE ce.event_id = event_id_param
  AND ce.organizer_id = organizer_id_param
  AND ce.status = 'confirmed'
  AND ce.payout_id IS NULL
  GROUP BY ce.follower_id, p.full_name, p.email
  HAVING SUM(ce.commission_amount) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`