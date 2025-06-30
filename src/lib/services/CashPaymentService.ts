// Cash Payment Service for handling in-person cash transactions
// Manages verification codes, order states, and cash payment confirmation

import { supabase } from '@/integrations/supabase/client'

// Type assertion for supabase client to work with our database
const db = supabase as any

export interface CashPaymentRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  totalAmount: number;
  expirationHours?: number; // Default 24 hours
}

export interface CashPaymentCode {
  verificationCode: string;
  orderId: string;
  expiresAt: Date;
  isExpired: boolean;
}

export interface CashPaymentConfirmation {
  orderId: string;
  verificationCode: string;
  confirmedBy: string; // organizer/reseller ID
  confirmedAt: Date;
}

export interface CashPaymentResult {
  success: boolean;
  verificationCode?: string;
  expiresAt?: Date;
  error?: string;
}

export interface CashConfirmationResult {
  success: boolean;
  order?: any;
  tickets?: any[];
  error?: string;
}

export class CashPaymentService {
  /**
   * Generate a verification code for cash payment
   */
  static generateVerificationCode(): string {
    // Generate a 8-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Exclude O and 0 for clarity
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a cash payment request with verification code
   */
  static async createCashPayment(request: CashPaymentRequest): Promise<CashPaymentResult> {
    try {
      const verificationCode = this.generateVerificationCode();
      const expirationHours = request.expirationHours || 24;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      // Store verification code in database
      const codeData = {
        verification_code: verificationCode,
        order_id: request.orderId,
        expires_at: expiresAt.toISOString(),
        customer_email: request.customerEmail,
        customer_name: request.customerName,
        total_amount: request.totalAmount
      };

      const { data, error } = await db
        .from('cash_payment_codes')
        .insert(codeData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create verification code: ${error.message}`);
      }

      // Send verification code via email
      await this.sendVerificationCodeEmail({
        email: request.customerEmail,
        name: request.customerName,
        verificationCode,
        totalAmount: request.totalAmount,
        expiresAt
      });

      return {
        success: true,
        verificationCode,
        expiresAt
      };

    } catch (error) {
      console.error('Failed to create cash payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate and confirm a cash payment using verification code
   */
  static async confirmCashPayment(
    verificationCode: string, 
    confirmedBy: string
  ): Promise<CashConfirmationResult> {
    try {
      // Use the database function to confirm cash payment
      const { data, error } = await db.rpc('confirm_cash_payment', {
        p_verification_code: verificationCode,
        p_confirmed_by: confirmedBy
      });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error
        };
      }

      // Generate tickets now that payment is confirmed
      const tickets = await this.generateTicketsForCashOrder(data.order_id);

      return {
        success: true,
        order: { id: data.order_id, status: data.order_status },
        tickets
      };

    } catch (error) {
      console.error('Failed to confirm cash payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get verification code details
   */
  private static async getVerificationCode(code: string): Promise<CashPaymentCode | null> {
    try {
      const { data, error } = await db
        .from('cash_payment_codes')
        .select('*')
        .eq('verification_code', code)
        .is('used_at', null) // Only get unused codes
        .single();

      if (error || !data) {
        return null;
      }

      return {
        verificationCode: data.verification_code,
        orderId: data.order_id,
        expiresAt: new Date(data.expires_at),
        isExpired: new Date(data.expires_at) < new Date()
      };
    } catch (error) {
      console.error('Failed to get verification code:', error);
      return null;
    }
  }

  /**
   * Mark verification code as used
   */
  private static async markCodeAsUsed(code: string, confirmedBy: string): Promise<void> {
    const { error } = await db
      .from('cash_payment_codes')
      .update({
        used_at: new Date().toISOString(),
        confirmed_by: confirmedBy
      })
      .eq('verification_code', code);

    if (error) {
      throw new Error(`Failed to mark code as used: ${error.message}`);
    }
  }

  /**
   * Generate tickets for cash order
   */
  private static async generateTicketsForCashOrder(orderId: string): Promise<any[]> {
    try {
      // Get order details
      const { data: order, error: orderError } = await db
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      // Get order items
      const { data: orderItems, error: itemsError } = await db
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) {
        throw new Error('Failed to fetch order items');
      }

      // Import TicketService dynamically to avoid circular imports
      const { TicketService } = await import('./TicketService');
      
      // Generate tickets using the existing TicketService
      const ticketResult = await TicketService.generateTickets({
        order,
        orderItems: orderItems || []
      });

      if (!ticketResult.success) {
        throw new Error(ticketResult.error || 'Failed to generate tickets');
      }

      return ticketResult.tickets || [];
    } catch (error) {
      console.error('Failed to generate tickets for cash order:', error);
      throw error;
    }
  }

  /**
   * Send verification code via email
   */
  private static async sendVerificationCodeEmail(params: {
    email: string;
    name: string;
    verificationCode: string;
    totalAmount: number;
    expiresAt: Date;
  }): Promise<void> {
    // TODO: Integrate with EmailService
    const emailContent = `
      Dear ${params.name},
      
      Your ticket order is ready for cash payment!
      
      Verification Code: ${params.verificationCode}
      Total Amount: $${params.totalAmount.toFixed(2)}
      Expires: ${params.expiresAt.toLocaleDateString()} at ${params.expiresAt.toLocaleTimeString()}
      
      Please provide this verification code when paying cash to the event organizer.
      Your tickets will be generated and sent after payment confirmation.
      
      Thank you!
    `;

    console.log('Cash payment verification email:', emailContent);
  }

  /**
   * Check if verification code is valid and not expired
   */
  static async isValidCode(code: string): Promise<boolean> {
    const codeData = await this.getVerificationCode(code);
    return codeData ? !codeData.isExpired : false;
  }

  /**
   * Get pending cash payments for organizer dashboard
   */
  static async getPendingCashPayments(organizerId: string): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('cash_payment_codes')
        .select(`
          id,
          verification_code,
          customer_name,
          customer_email,
          total_amount,
          expires_at,
          orders!inner(
            id,
            order_status,
            events!inner(
              title,
              owner_id
            )
          )
        `)
        .is('used_at', null) // Only unused codes
        .eq('orders.events.owner_id', organizerId)
        .eq('orders.order_status', 'awaiting_cash_payment');

      if (error) {
        throw new Error(`Failed to fetch pending payments: ${error.message}`);
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        verificationCode: item.verification_code,
        customerName: item.customer_name,
        customerEmail: item.customer_email,
        totalAmount: parseFloat(item.total_amount),
        expiresAt: new Date(item.expires_at),
        eventTitle: item.orders.events.title,
        isExpired: new Date(item.expires_at) < new Date()
      }));
    } catch (error) {
      console.error('Failed to get pending cash payments:', error);
      throw error;
    }
  }
}