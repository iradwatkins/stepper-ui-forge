// Secure API Payment Service
// Uses server-side API endpoints instead of direct client-side processing

import {
  PaymentRequest,
  PaymentResult,
  PaymentMethod,
  RefundRequest,
  RefundResponse,
  PaymentGateway as PaymentGatewayType,
} from './types';

export class ApiPaymentService {
  private static instance: ApiPaymentService;
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ApiPaymentService {
    if (!ApiPaymentService.instance) {
      ApiPaymentService.instance = new ApiPaymentService();
    }
    return ApiPaymentService.instance;
  }

  /**
   * Initialize payment service (minimal setup for API-based approach)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check API endpoints are available
      const healthChecks = await Promise.allSettled([
        this.checkGatewayHealth('paypal'),
        this.checkGatewayHealth('square'),
      ]);

      console.log('API Payment Service health checks:', healthChecks);
      this.initialized = true;
      console.log('✅ API Payment Service initialized successfully');

    } catch (error) {
      console.error('❌ API Payment Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check gateway health via Supabase Edge Functions
   */
  private async checkGatewayHealth(gateway: string): Promise<boolean> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-${gateway}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      const data = await response.json();
      return data.status === 'ok' && data.configured;
    } catch (error) {
      console.warn(`Gateway ${gateway} health check failed:`, error);
      return false;
    }
  }

  /**
   * Get available payment methods
   */
  getAvailablePaymentMethods(): PaymentMethod[] {
    const methods: PaymentMethod[] = [];

    // Always show available methods - API will handle configuration
    methods.push({
      id: 'paypal',
      name: 'PayPal',
      type: 'paypal',
      icon: '💳',
      description: 'Pay with your PayPal account',
      fees: {
        percentage: 2.9,
        fixed: 0.30
      }
    });

    methods.push({
      id: 'square',
      name: 'Credit/Debit Card',
      type: 'square',
      icon: '💳',
      description: 'Pay with credit or debit card',
      fees: {
        percentage: 2.6,
        fixed: 0.10
      }
    });

    methods.push({
      id: 'cashapp',
      name: 'Cash App Pay',
      type: 'cashapp',
      icon: '💰',
      description: 'Pay with Cash App',
      fees: {
        percentage: 2.75,
        fixed: 0.00
      }
    });

    return methods;
  }

  /**
   * Process PayPal payment via Supabase Edge Function
   */
  async processPayPalPayment(amount: number, currency: string = 'USD'): Promise<PaymentResult> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-paypal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'create_order',
          amount,
          currency,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'PayPal payment failed');
      }

      const data = await response.json();
      
      return {
        success: true,
        paymentId: data.order.id,
        status: 'pending',
        amount,
        currency,
        gatewayType: 'paypal',
        gatewayResponse: data.order,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        gatewayType: 'paypal',
      };
    }
  }

  /**
   * Capture PayPal payment via Supabase Edge Function
   */
  async capturePayPalPayment(orderId: string): Promise<PaymentResult> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-paypal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'capture_order',
          orderId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'PayPal capture failed');
      }

      const data = await response.json();
      
      return {
        success: true,
        paymentId: data.capture.id,
        status: 'completed',
        gatewayType: 'paypal',
        gatewayResponse: data.capture,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        gatewayType: 'paypal',
      };
    }
  }

  /**
   * Process Square payment via Supabase Edge Function
   */
  async processSquarePayment(sourceId: string, amount: number, currency: string = 'USD'): Promise<PaymentResult> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-square`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'create_payment',
          sourceId,
          amount,
          currency,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Square payment failed');
      }

      const data = await response.json();
      
      return {
        success: true,
        paymentId: data.payment.payment.id,
        status: data.payment.payment.status === 'COMPLETED' ? 'completed' : 'pending',
        amount,
        currency,
        gatewayType: 'square',
        gatewayResponse: data.payment,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        gatewayType: 'square',
      };
    }
  }

  /**
   * Process payment with gateway selection
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (!this.initialized) {
      throw new Error('API Payment service not initialized');
    }

    switch (request.gatewayType) {
      case 'paypal':
        return this.processPayPalPayment(request.amount, request.currency);
      
      case 'square':
        if (!request.sourceId) {
          throw new Error('Source ID required for Square payments');
        }
        return this.processSquarePayment(request.sourceId, request.amount, request.currency);
      
      case 'cashapp':
        // Cash App uses Square's payment system
        if (!request.sourceId) {
          throw new Error('Source ID required for Cash App payments');
        }
        return this.processSquarePayment(request.sourceId, request.amount, request.currency);
      
      default:
        throw new Error(`Unsupported payment gateway: ${request.gatewayType}`);
    }
  }

  /**
   * Process refund via Supabase Edge Function
   */
  async processRefund(request: RefundRequest, gatewayType: PaymentGatewayType): Promise<RefundResponse> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-${gatewayType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'refund_payment',
          paymentId: request.paymentId,
          amount: request.amount,
          reason: request.reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Refund failed');
      }

      const data = await response.json();
      
      return {
        success: true,
        refundId: data.refund.id || data.refund.refund?.id,
        status: 'completed',
        amount: request.amount,
        gatewayResponse: data.refund,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get payment service status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    gatewayHealth: Record<PaymentGatewayType, boolean>;
    hasAvailableGateways: boolean;
  }> {
    const gatewayHealth = {
      paypal: await this.checkGatewayHealth('paypal'),
      square: await this.checkGatewayHealth('square'),
      cashapp: await this.checkGatewayHealth('square'), // Cash App uses Square
    };

    const hasAvailableGateways = Object.values(gatewayHealth).some(Boolean);

    return {
      initialized: this.initialized,
      gatewayHealth,
      hasAvailableGateways,
    };
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const apiPaymentService = ApiPaymentService.getInstance();