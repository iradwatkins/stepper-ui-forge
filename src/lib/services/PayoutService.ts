// Payout Service for managing payout requests and processing
// Handles payout request creation, approval workflow, and commission reconciliation

import { supabase } from '@/lib/supabase'
import { CommissionService } from './CommissionService'
import { BankingService } from './BankingService'

export interface PayoutRequest {
  id: string
  organizer_id: string
  amount: number
  payout_method: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  platform_fees: number
  net_amount: number
  commission_deductions: number
  requested_at: string
  processed_at: string | null
  completed_at: string | null
  notes: string | null
}

export interface PayoutSummary {
  available_balance: number
  pending_balance: number
  total_earned: number
  total_paid: number
  pending_requests: number
  last_payout_date: string | null
}

export interface PayoutEligibility {
  isEligible: boolean
  reasons: string[]
  available_amount: number
  minimum_payout: number
}

export class PayoutService {
  // Minimum payout amount (in dollars)
  private static readonly MINIMUM_PAYOUT = 25.00
  
  // Platform fee percentage (e.g., 2.9% + $0.30)
  private static readonly PLATFORM_FEE_RATE = 0.029
  private static readonly PLATFORM_FEE_FIXED = 0.30

  /**
   * Calculate platform fees for a payout amount
   */
  static calculatePlatformFees(amount: number): number {
    return Math.round((amount * this.PLATFORM_FEE_RATE + this.PLATFORM_FEE_FIXED) * 100) / 100
  }

  /**
   * Calculate net payout amount after fees
   */
  static calculateNetAmount(amount: number): number {
    const fees = this.calculatePlatformFees(amount)
    return Math.round((amount - fees) * 100) / 100
  }

  /**
   * Check if organizer is eligible for payout
   */
  static async checkPayoutEligibility(organizerId: string): Promise<PayoutEligibility> {
    try {
      const reasons: string[] = []

      // Check if banking info is verified
      const hasVerifiedBanking = await BankingService.hasVerifiedBankingInfo(organizerId)
      if (!hasVerifiedBanking) {
        reasons.push('Banking information not verified')
      }

      // Get available commission balance
      const { totalOwed } = await CommissionService.getOrganizerCommissionLiability(
        organizerId,
        'confirmed'
      )

      // Check minimum payout amount
      if (totalOwed < this.MINIMUM_PAYOUT) {
        reasons.push(`Minimum payout amount is $${this.MINIMUM_PAYOUT}`)
      }

      // Check for pending payout requests
      const { data: pendingRequests } = await supabase
        .from('payout_requests')
        .select('id')
        .eq('organizer_id', organizerId)
        .in('status', ['pending', 'processing'])

      if (pendingRequests && pendingRequests.length > 0) {
        reasons.push('Previous payout request is still pending')
      }

      return {
        isEligible: reasons.length === 0,
        reasons,
        available_amount: totalOwed,
        minimum_payout: this.MINIMUM_PAYOUT
      }
    } catch (error) {
      console.error('Failed to check payout eligibility:', error)
      return {
        isEligible: false,
        reasons: ['Error checking eligibility'],
        available_amount: 0,
        minimum_payout: this.MINIMUM_PAYOUT
      }
    }
  }

  /**
   * Request a payout for an organizer
   */
  static async requestPayout(
    organizerId: string,
    requestedAmount?: number
  ): Promise<{ success: boolean; payoutRequest?: PayoutRequest; errors?: string[] }> {
    try {
      // Check eligibility
      const eligibility = await this.checkPayoutEligibility(organizerId)
      if (!eligibility.isEligible) {
        return { success: false, errors: eligibility.reasons }
      }

      // Use available amount if no specific amount requested
      const amount = requestedAmount || eligibility.available_amount

      // Validate requested amount
      if (amount > eligibility.available_amount) {
        return { 
          success: false, 
          errors: [`Requested amount exceeds available balance of $${eligibility.available_amount}`] 
        }
      }

      if (amount < this.MINIMUM_PAYOUT) {
        return { 
          success: false, 
          errors: [`Minimum payout amount is $${this.MINIMUM_PAYOUT}`] 
        }
      }

      // Get banking info for payout method
      const { bankingInfo } = await BankingService.getBankingInfo(organizerId)
      if (!bankingInfo) {
        return { success: false, errors: ['Banking information not found'] }
      }

      // Calculate fees and net amount
      const platformFees = this.calculatePlatformFees(amount)
      const netAmount = this.calculateNetAmount(amount)

      // Create payout request
      const { data, error } = await supabase
        .from('payout_requests')
        .insert({
          organizer_id: organizerId,
          amount,
          payout_method: bankingInfo.payout_method,
          platform_fees: platformFees,
          net_amount: netAmount,
          commission_deductions: 0, // Could be used for adjustments
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating payout request:', error)
        return { success: false, errors: [error.message] }
      }

      return { success: true, payoutRequest: data }
    } catch (error) {
      console.error('Failed to request payout:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Get payout summary for an organizer
   */
  static async getPayoutSummary(organizerId: string): Promise<PayoutSummary> {
    try {
      // Get commission earnings summary
      const commissionSummary = await CommissionService.getFollowerCommissionSummary(organizerId)

      // Get payout history
      const { data: payouts } = await supabase
        .from('payout_requests')
        .select('amount, status, completed_at')
        .eq('organizer_id', organizerId)
        .order('completed_at', { ascending: false })

      const totalPaid = (payouts || [])
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)

      const pendingRequests = (payouts || [])
        .filter(p => ['pending', 'processing'].includes(p.status))
        .length

      const lastPayoutDate = (payouts || [])
        .find(p => p.status === 'completed' && p.completed_at)?.completed_at || null

      const pendingBalance = (payouts || [])
        .filter(p => ['pending', 'processing'].includes(p.status))
        .reduce((sum, p) => sum + p.amount, 0)

      return {
        available_balance: commissionSummary.confirmed_amount - pendingBalance,
        pending_balance: pendingBalance,
        total_earned: commissionSummary.total_earnings,
        total_paid: totalPaid,
        pending_requests: pendingRequests,
        last_payout_date: lastPayoutDate
      }
    } catch (error) {
      console.error('Failed to get payout summary:', error)
      return {
        available_balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_paid: 0,
        pending_requests: 0,
        last_payout_date: null
      }
    }
  }

  /**
   * Get payout history for an organizer
   */
  static async getPayoutHistory(
    organizerId: string,
    limit = 50,
    offset = 0
  ): Promise<PayoutRequest[]> {
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('organizer_id', organizerId)
        .order('requested_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching payout history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to get payout history:', error)
      return []
    }
  }

  /**
   * Cancel a pending payout request
   */
  static async cancelPayoutRequest(
    requestId: string,
    organizerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify the request belongs to the organizer and is cancellable
      const { data: request, error: fetchError } = await supabase
        .from('payout_requests')
        .select('status')
        .eq('id', requestId)
        .eq('organizer_id', organizerId)
        .single()

      if (fetchError || !request) {
        return { success: false, error: 'Payout request not found' }
      }

      if (request.status !== 'pending') {
        return { success: false, error: 'Can only cancel pending requests' }
      }

      // Update status to failed (cancelled)
      const { error } = await supabase
        .from('payout_requests')
        .update({
          status: 'failed',
          notes: 'Cancelled by organizer',
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) {
        console.error('Error cancelling payout request:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to cancel payout request:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Process a payout request (admin function)
   */
  static async processPayoutRequest(
    requestId: string,
    status: 'processing' | 'completed' | 'failed',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        status,
        processed_at: new Date().toISOString()
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      if (notes) {
        updateData.notes = notes
      }

      const { error } = await supabase
        .from('payout_requests')
        .update(updateData)
        .eq('id', requestId)

      if (error) {
        console.error('Error processing payout request:', error)
        return { success: false, error: error.message }
      }

      // If completed, mark related commissions as paid
      if (status === 'completed') {
        // Get the payout request details
        const { data: request } = await supabase
          .from('payout_requests')
          .select('organizer_id, amount')
          .eq('id', requestId)
          .single()

        if (request) {
          // Get confirmed commissions for this organizer up to the payout amount
          const { earnings } = await CommissionService.getOrganizerCommissionLiability(
            request.organizer_id,
            'confirmed'
          )

          // Mark commissions as paid (up to the payout amount)
          let remainingAmount = request.amount
          const commissionIds: string[] = []

          for (const earning of earnings) {
            if (remainingAmount <= 0) break
            if (earning.commission_amount <= remainingAmount) {
              commissionIds.push(earning.id)
              remainingAmount -= earning.commission_amount
            }
          }

          if (commissionIds.length > 0) {
            await CommissionService.markCommissionsAsPaid(commissionIds)
          }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to process payout request:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get all payout requests (admin function)
   */
  static async getAllPayoutRequests(
    status?: string,
    limit = 100,
    offset = 0
  ): Promise<Array<PayoutRequest & {
    organizer_name: string
    organizer_email: string
  }>> {
    try {
      let query = supabase
        .from('payout_requests')
        .select(`
          *,
          profiles:organizer_id (
            full_name,
            email,
            organization
          )
        `)
        .order('requested_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching all payout requests:', error)
        return []
      }

      return (data || []).map((item: any) => ({
        ...item,
        organizer_name: item.profiles?.full_name || item.profiles?.organization || 'Unknown',
        organizer_email: item.profiles?.email || 'Unknown'
      }))
    } catch (error) {
      console.error('Failed to get all payout requests:', error)
      return []
    }
  }

  /**
   * Get payout statistics (admin function)
   */
  static async getPayoutStatistics(): Promise<{
    total_requested: number
    total_paid: number
    pending_amount: number
    processing_count: number
    completed_count: number
    failed_count: number
  }> {
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('amount, status')

      if (error) {
        console.error('Error fetching payout statistics:', error)
        return {
          total_requested: 0,
          total_paid: 0,
          pending_amount: 0,
          processing_count: 0,
          completed_count: 0,
          failed_count: 0
        }
      }

      const requests = data || []
      
      return {
        total_requested: requests.reduce((sum, r) => sum + r.amount, 0),
        total_paid: requests
          .filter(r => r.status === 'completed')
          .reduce((sum, r) => sum + r.amount, 0),
        pending_amount: requests
          .filter(r => ['pending', 'processing'].includes(r.status))
          .reduce((sum, r) => sum + r.amount, 0),
        processing_count: requests.filter(r => r.status === 'processing').length,
        completed_count: requests.filter(r => r.status === 'completed').length,
        failed_count: requests.filter(r => r.status === 'failed').length
      }
    } catch (error) {
      console.error('Failed to get payout statistics:', error)
      return {
        total_requested: 0,
        total_paid: 0,
        pending_amount: 0,
        processing_count: 0,
        completed_count: 0,
        failed_count: 0
      }
    }
  }
}