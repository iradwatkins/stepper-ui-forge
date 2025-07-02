// Banking Service for managing organizer banking information and payout methods
// Handles secure storage of banking details for commission payouts

import { supabase } from '@/lib/supabase'

export type PayoutMethod = 'paypal' | 'zelle' | 'cashapp' | 'bank_transfer'

export interface BankingInfo {
  id: string
  organizer_id: string
  payout_method: PayoutMethod
  payout_details_encrypted: string
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface PayoutDetails {
  paypal?: {
    email: string
  }
  zelle?: {
    email: string
    phone?: string
  }
  cashapp?: {
    cashtag: string
  }
  bank_transfer?: {
    account_holder_name: string
    bank_name: string
    routing_number: string
    account_number: string
    account_type: 'checking' | 'savings'
  }
}

export interface BankingValidationResult {
  isValid: boolean
  errors: string[]
}

export class BankingService {
  /**
   * Simple encryption for demonstration (use proper encryption in production)
   * In production, use a proper encryption service or library
   */
  private static encryptPayoutDetails(details: PayoutDetails): string {
    // WARNING: This is basic encoding, not secure encryption
    // In production, use proper encryption like AES with secure key management
    return btoa(JSON.stringify(details))
  }

  /**
   * Simple decryption for demonstration
   */
  private static decryptPayoutDetails(encrypted: string): PayoutDetails {
    try {
      return JSON.parse(atob(encrypted))
    } catch (error) {
      console.error('Failed to decrypt payout details:', error)
      return {}
    }
  }

  /**
   * Validate payout details based on method
   */
  static validatePayoutDetails(method: PayoutMethod, details: PayoutDetails): BankingValidationResult {
    const errors: string[] = []

    switch (method) {
      case 'paypal':
        if (!details.paypal?.email) {
          errors.push('PayPal email is required')
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.paypal.email)) {
          errors.push('Valid PayPal email is required')
        }
        break

      case 'zelle':
        if (!details.zelle?.email && !details.zelle?.phone) {
          errors.push('Zelle email or phone number is required')
        }
        if (details.zelle?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.zelle.email)) {
          errors.push('Valid email is required for Zelle')
        }
        if (details.zelle?.phone && !/^\+?[\d\s\-\(\)]+$/.test(details.zelle.phone)) {
          errors.push('Valid phone number is required for Zelle')
        }
        break

      case 'cashapp':
        if (!details.cashapp?.cashtag) {
          errors.push('Cash App $cashtag is required')
        } else if (!details.cashapp.cashtag.startsWith('$')) {
          errors.push('Cash App cashtag must start with $')
        }
        break

      case 'bank_transfer':
        const bank = details.bank_transfer
        if (!bank?.account_holder_name) errors.push('Account holder name is required')
        if (!bank?.bank_name) errors.push('Bank name is required')
        if (!bank?.routing_number) errors.push('Routing number is required')
        if (!bank?.account_number) errors.push('Account number is required')
        if (!bank?.account_type) errors.push('Account type is required')
        
        if (bank?.routing_number && !/^\d{9}$/.test(bank.routing_number)) {
          errors.push('Routing number must be 9 digits')
        }
        if (bank?.account_number && !/^\d{8,17}$/.test(bank.account_number)) {
          errors.push('Account number must be 8-17 digits')
        }
        break

      default:
        errors.push('Invalid payout method')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Save or update banking information for an organizer
   */
  static async saveBankingInfo(
    organizerId: string,
    payoutMethod: PayoutMethod,
    payoutDetails: PayoutDetails
  ): Promise<{ success: boolean; bankingInfo?: BankingInfo; errors?: string[] }> {
    try {
      // Validate the payout details
      const validation = this.validatePayoutDetails(payoutMethod, payoutDetails)
      if (!validation.isValid) {
        return { success: false, errors: validation.errors }
      }

      // Encrypt the payout details
      const encryptedDetails = this.encryptPayoutDetails(payoutDetails)

      // Check if banking info already exists
      const { data: existing } = await supabase
        .from('organizer_banking_info')
        .select('id')
        .eq('organizer_id', organizerId)
        .single()

      let result
      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('organizer_banking_info')
          .update({
            payout_method: payoutMethod,
            payout_details_encrypted: encryptedDetails,
            is_verified: false, // Reset verification when details change
            updated_at: new Date().toISOString()
          })
          .eq('organizer_id', organizerId)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('organizer_banking_info')
          .insert({
            organizer_id: organizerId,
            payout_method: payoutMethod,
            payout_details_encrypted: encryptedDetails,
            is_verified: false
          })
          .select()
          .single()

        if (error) throw error
        result = data
      }

      return { success: true, bankingInfo: result }
    } catch (error) {
      console.error('Failed to save banking info:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Get banking information for an organizer
   */
  static async getBankingInfo(organizerId: string): Promise<{
    bankingInfo: BankingInfo | null
    payoutDetails: PayoutDetails | null
  }> {
    try {
      const { data, error } = await supabase
        .from('organizer_banking_info')
        .select('*')
        .eq('organizer_id', organizerId)
        .single()

      if (error || !data) {
        return { bankingInfo: null, payoutDetails: null }
      }

      const payoutDetails = this.decryptPayoutDetails(data.payout_details_encrypted)

      return {
        bankingInfo: data,
        payoutDetails
      }
    } catch (error) {
      console.error('Failed to get banking info:', error)
      return { bankingInfo: null, payoutDetails: null }
    }
  }

  /**
   * Verify banking information (admin function)
   */
  static async verifyBankingInfo(
    organizerId: string,
    isVerified: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('organizer_banking_info')
        .update({
          is_verified: isVerified,
          updated_at: new Date().toISOString()
        })
        .eq('organizer_id', organizerId)

      if (error) {
        console.error('Error verifying banking info:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to verify banking info:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Delete banking information
   */
  static async deleteBankingInfo(organizerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('organizer_banking_info')
        .delete()
        .eq('organizer_id', organizerId)

      if (error) {
        console.error('Error deleting banking info:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to delete banking info:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get all organizers with banking info (admin function)
   */
  static async getAllBankingInfo(): Promise<Array<BankingInfo & {
    organizer_name: string
    organizer_email: string
  }>> {
    try {
      const { data, error } = await supabase
        .from('organizer_banking_info')
        .select(`
          *,
          profiles:organizer_id (
            full_name,
            email,
            organization
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all banking info:', error)
        return []
      }

      return (data || []).map((item: any) => ({
        ...item,
        organizer_name: item.profiles?.full_name || item.profiles?.organization || 'Unknown',
        organizer_email: item.profiles?.email || 'Unknown'
      }))
    } catch (error) {
      console.error('Failed to get all banking info:', error)
      return []
    }
  }

  /**
   * Check if organizer has verified banking info
   */
  static async hasVerifiedBankingInfo(organizerId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('organizer_banking_info')
        .select('is_verified')
        .eq('organizer_id', organizerId)
        .eq('is_verified', true)
        .single()

      return !!data
    } catch (error) {
      return false
    }
  }

  /**
   * Get supported payout methods with their requirements
   */
  static getPayoutMethods(): Array<{
    id: PayoutMethod
    name: string
    description: string
    requirements: string[]
    processingTime: string
    fees: string
  }> {
    return [
      {
        id: 'paypal',
        name: 'PayPal',
        description: 'Receive payments through PayPal',
        requirements: ['Valid PayPal email address'],
        processingTime: '1-2 business days',
        fees: 'No additional fees'
      },
      {
        id: 'zelle',
        name: 'Zelle',
        description: 'Direct bank transfer via Zelle',
        requirements: ['Bank account enrolled in Zelle', 'Email or phone number'],
        processingTime: 'Within minutes',
        fees: 'No fees'
      },
      {
        id: 'cashapp',
        name: 'Cash App',
        description: 'Receive payments through Cash App',
        requirements: ['Valid Cash App $cashtag'],
        processingTime: 'Instant',
        fees: 'Standard Cash App fees may apply'
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Direct deposit to your bank account',
        requirements: [
          'Valid bank account',
          'Routing number',
          'Account number',
          'Account holder name'
        ],
        processingTime: '3-5 business days',
        fees: 'No additional fees'
      }
    ]
  }
}