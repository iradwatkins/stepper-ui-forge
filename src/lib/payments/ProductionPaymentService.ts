// Simplified Production Payment Service
// Focused on real payment processing without complex gateway abstractions

import { PaymentConfigurationService } from '@/lib/services/PaymentConfigurationService';

export class ProductionPaymentService {
  private static instance: ProductionPaymentService;

  private constructor() {}

  static getInstance(): ProductionPaymentService {
    if (!ProductionPaymentService.instance) {
      ProductionPaymentService.instance = new ProductionPaymentService();
    }
    return ProductionPaymentService.instance;
  }

  // Get available payment methods from database configuration
  async getAvailablePaymentMethods() {
    try {
      return await PaymentConfigurationService.getAvailablePaymentMethods();
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      // Fallback to basic configuration if database is unavailable
      return [
        {
          id: 'paypal',
          name: 'PayPal',
          description: 'Pay with your PayPal account',
          available: false
        }
      ];
    }
  }

  // Process payment through Supabase Edge Functions
  async processPayment(paymentData: {
    amount: number;
    gateway: string;
    orderId: string;
    customerEmail: string;
  }) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-${paymentData.gateway}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'create_payment',
          ...paymentData
        }),
      });

      if (!response.ok) {
        throw new Error(`Payment failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Check payment status
  getStatus() {
    return {
      initialized: true,
      hasAvailableGateways: true
    };
  }
}

export const productionPaymentService = ProductionPaymentService.getInstance();