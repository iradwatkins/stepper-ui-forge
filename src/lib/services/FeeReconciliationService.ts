// Fee Reconciliation Service for managing service fees across payment types
// Tracks fees owed from cash transactions and deducts from online payments

import { supabase } from '@/integrations/supabase/client'

// Type assertion for supabase client to work with our database
const db = supabase as any

export interface FeeReconciliation {
  id: string;
  organizerId: string;
  cashFeesOwed: number;
  feesDeducted: number;
  lastReconciliationAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeeReconciliationSummary {
  organizerId: string;
  totalCashFeesOwed: number;
  totalFeesDeducted: number;
  netFeesOwed: number;
  lastReconciliationAt: Date | null;
}

export interface OnlinePaymentFeeDeduction {
  orderId: string;
  originalFee: number;
  additionalCashFeeDeducted: number;
  totalFeeDeducted: number;
  remainingCashFeesOwed: number;
}

export class FeeReconciliationService {
  private static readonly SERVICE_FEE_RATE = 0.03; // 3% service fee

  /**
   * Calculate service fee for a given amount
   */
  static calculateServiceFee(amount: number): number {
    return Math.round(amount * this.SERVICE_FEE_RATE * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Add cash fees to an organizer's reconciliation record
   */
  static async addCashFees(organizerId: string, cashAmount: number): Promise<boolean> {
    try {
      const cashFee = this.calculateServiceFee(cashAmount);

      const { error } = await db
        .from('fee_reconciliation')
        .upsert({
          organizer_id: organizerId,
          cash_fees_owed: db.raw(`COALESCE(cash_fees_owed, 0) + ${cashFee}`),
          updated_at: new Date().toISOString()
        })
        .eq('organizer_id', organizerId);

      if (error) {
        throw new Error(`Failed to add cash fees: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to add cash fees:', error);
      return false;
    }
  }

  /**
   * Get fee reconciliation status for an organizer
   */
  static async getReconciliationStatus(organizerId: string): Promise<FeeReconciliationSummary | null> {
    try {
      const { data, error } = await db
        .from('fee_reconciliation')
        .select('*')
        .eq('organizer_id', organizerId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to get reconciliation status: ${error.message}`);
      }

      if (!data) {
        // No reconciliation record exists yet
        return {
          organizerId,
          totalCashFeesOwed: 0,
          totalFeesDeducted: 0,
          netFeesOwed: 0,
          lastReconciliationAt: null
        };
      }

      const netFeesOwed = Math.max(0, data.cash_fees_owed - data.fees_deducted);

      return {
        organizerId: data.organizer_id,
        totalCashFeesOwed: parseFloat(data.cash_fees_owed || 0),
        totalFeesDeducted: parseFloat(data.fees_deducted || 0),
        netFeesOwed,
        lastReconciliationAt: data.last_reconciliation_at ? new Date(data.last_reconciliation_at) : null
      };
    } catch (error) {
      console.error('Failed to get reconciliation status:', error);
      return null;
    }
  }

  /**
   * Process fee deduction from an online payment
   * This should be called when processing online payments to deduct accumulated cash fees
   */
  static async processOnlinePaymentFeeDeduction(
    organizerId: string,
    orderId: string,
    paymentAmount: number
  ): Promise<OnlinePaymentFeeDeduction> {
    try {
      // Calculate standard service fee for this online payment
      const standardFee = this.calculateServiceFee(paymentAmount);

      // Get current reconciliation status
      const reconciliation = await this.getReconciliationStatus(organizerId);
      
      if (!reconciliation) {
        throw new Error('Failed to get reconciliation status');
      }

      // Calculate how much additional cash fee to deduct
      const additionalCashFeeToDeduct = Math.min(
        reconciliation.netFeesOwed,
        paymentAmount * 0.05 // Don't deduct more than 5% of payment amount at once
      );

      const totalFeeDeducted = standardFee + additionalCashFeeToDeduct;

      // Update reconciliation record if we're deducting cash fees
      if (additionalCashFeeToDeduct > 0) {
        await this.recordFeeDeduction(organizerId, additionalCashFeeToDeduct);
      }

      const remainingCashFeesOwed = Math.max(0, reconciliation.netFeesOwed - additionalCashFeeToDeduct);

      return {
        orderId,
        originalFee: standardFee,
        additionalCashFeeDeducted: additionalCashFeeToDeduct,
        totalFeeDeducted,
        remainingCashFeesOwed
      };

    } catch (error) {
      console.error('Failed to process online payment fee deduction:', error);
      
      // Return minimal deduction on error
      const standardFee = this.calculateServiceFee(paymentAmount);
      return {
        orderId,
        originalFee: standardFee,
        additionalCashFeeDeducted: 0,
        totalFeeDeducted: standardFee,
        remainingCashFeesOwed: 0
      };
    }
  }

  /**
   * Record fee deduction in the reconciliation table
   */
  private static async recordFeeDeduction(organizerId: string, deductedAmount: number): Promise<void> {
    const { error } = await db
      .from('fee_reconciliation')
      .update({
        fees_deducted: db.raw(`COALESCE(fees_deducted, 0) + ${deductedAmount}`),
        last_reconciliation_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('organizer_id', organizerId);

    if (error) {
      throw new Error(`Failed to record fee deduction: ${error.message}`);
    }
  }

  /**
   * Get reconciliation history for an organizer
   */
  static async getReconciliationHistory(organizerId: string, limit: number = 50): Promise<any[]> {
    try {
      // This would typically query a reconciliation_history table
      // For now, we'll return a simplified version based on orders
      const { data, error } = await db
        .from('orders')
        .select(`
          id,
          total_amount,
          payment_method,
          created_at,
          events!inner(owner_id)
        `)
        .eq('events.owner_id', organizerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get reconciliation history: ${error.message}`);
      }

      return (data || []).map((order: any) => ({
        orderId: order.id,
        amount: parseFloat(order.total_amount),
        paymentMethod: order.payment_method,
        serviceFee: this.calculateServiceFee(parseFloat(order.total_amount)),
        date: new Date(order.created_at)
      }));

    } catch (error) {
      console.error('Failed to get reconciliation history:', error);
      return [];
    }
  }

  /**
   * Generate reconciliation report for an organizer
   */
  static async generateReconciliationReport(organizerId: string): Promise<{
    summary: FeeReconciliationSummary;
    recentTransactions: any[];
    projectedNextDeduction: number;
  }> {
    try {
      const [summary, recentTransactions] = await Promise.all([
        this.getReconciliationStatus(organizerId),
        this.getReconciliationHistory(organizerId, 10)
      ]);

      if (!summary) {
        throw new Error('Failed to get reconciliation summary');
      }

      // Calculate projected next deduction based on average transaction size
      const averageTransactionSize = recentTransactions.length > 0 
        ? recentTransactions.reduce((sum, tx) => sum + tx.amount, 0) / recentTransactions.length
        : 0;

      const projectedNextDeduction = Math.min(
        summary.netFeesOwed,
        averageTransactionSize * 0.05
      );

      return {
        summary,
        recentTransactions,
        projectedNextDeduction
      };

    } catch (error) {
      console.error('Failed to generate reconciliation report:', error);
      throw error;
    }
  }

  /**
   * Check if an organizer has outstanding cash fees
   */
  static async hasOutstandingFees(organizerId: string): Promise<boolean> {
    const reconciliation = await this.getReconciliationStatus(organizerId);
    return reconciliation ? reconciliation.netFeesOwed > 0.01 : false; // Account for rounding
  }

  /**
   * Calculate total fees owed across all organizers
   */
  static async getTotalFeesOwedAcrossSystem(): Promise<{
    totalCashFeesOwed: number;
    totalFeesDeducted: number;
    netFeesOwed: number;
    organizersWithOutstandingFees: number;
  }> {
    try {
      const { data, error } = await db
        .from('fee_reconciliation')
        .select('cash_fees_owed, fees_deducted');

      if (error) {
        throw new Error(`Failed to get system fees overview: ${error.message}`);
      }

      const totals = (data || []).reduce((acc, row) => {
        const cashOwed = parseFloat(row.cash_fees_owed || 0);
        const feesDeducted = parseFloat(row.fees_deducted || 0);
        const netOwed = Math.max(0, cashOwed - feesDeducted);

        acc.totalCashFeesOwed += cashOwed;
        acc.totalFeesDeducted += feesDeducted;
        acc.netFeesOwed += netOwed;
        
        if (netOwed > 0.01) {
          acc.organizersWithOutstandingFees++;
        }

        return acc;
      }, {
        totalCashFeesOwed: 0,
        totalFeesDeducted: 0,
        netFeesOwed: 0,
        organizersWithOutstandingFees: 0
      });

      return totals;

    } catch (error) {
      console.error('Failed to get system fees overview:', error);
      throw error;
    }
  }
}