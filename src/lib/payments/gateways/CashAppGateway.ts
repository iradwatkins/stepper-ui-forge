// Cash App Payment Gateway Implementation
// Implements PaymentGateway interface for Cash App Pay via Square's infrastructure

import { PaymentGateway } from '../PaymentGateway';
import {
  PaymentGateway as PaymentGatewayType,
  PaymentRequest,
  PaymentResponse,
  PaymentResult,
  PaymentError,
  RefundRequest,
  RefundResponse,
  WebhookPayload,
  PaymentMethod,
  GatewayInitOptions,
  PaymentStatus
} from '../types';

export class CashAppGateway extends PaymentGateway {
  private applicationId: string;
  private accessToken: string;
  private locationId: string;
  private baseUrl: string;
  private payments: any; // Square Web SDK payments object

  constructor(options: GatewayInitOptions) {
    super('cashapp', options);
    
    // Cash App Pay uses Square's infrastructure
    this.applicationId = options.credentials.clientId || ''; // Same as Square application ID
    this.accessToken = options.credentials.accessToken || '';
    this.locationId = options.credentials.locationId || '';
    this.baseUrl = options.environment === 'production' 
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
  }

  async initialize(): Promise<void> {
    try {
      if (!this.applicationId || !this.accessToken || !this.locationId) {
        throw new Error('Cash App Pay requires Square application ID, access token, and location ID');
      }

      // Initialize Square Web SDK for Cash App Pay
      if (typeof window !== 'undefined') {
        // Check if Square Web SDK is loaded
        if (!window.Square) {
          throw new Error('Square Web SDK not loaded. Cash App Pay requires Square Web SDK.');
        }

        this.payments = window.Square.payments(this.applicationId, this.locationId);
        
        // Verify Cash App Pay is available
        const cashAppPay = await this.payments.cashAppPay({
          redirectURL: window.location.origin,
          referenceId: 'test-reference'
        });
        
        if (!cashAppPay) {
          throw new Error('Cash App Pay not available in this environment');
        }
      }

      // Test API connectivity
      await this.testApiConnection();
      
      this.isInitialized = true;
      this.logPaymentEvent('Cash App gateway initialized', {
        environment: this.options.environment,
        baseUrl: this.baseUrl,
        locationId: this.locationId
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Cash App initialization failed', { error: errorMessage });
      throw this.createError(
        'CASHAPP_INIT_FAILED',
        `Cash App initialization failed: ${errorMessage}`,
        error,
        false,
        'Cash App Pay is temporarily unavailable. Please try another payment method.'
      );
    }
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      // Validate payment request
      const validationError = this.validatePaymentRequest(request);
      if (validationError) {
        return { success: false, error: validationError };
      }

      this.logPaymentEvent('Processing Cash App payment', {
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency
      });

      // For Cash App Pay, we need to handle payment on the client side first
      // This implementation assumes the token is generated client-side via Square SDK
      const response: PaymentResponse = {
        transactionId: `cashapp-${Date.now()}`, // Temporary ID until actual payment
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        gateway: 'cashapp',
        metadata: {
          requiresClientSideProcessing: true,
          cashAppRequest: {
            amount: Math.round(request.amount * 100), // Convert to cents
            currency: request.currency,
            orderId: request.orderId,
            description: request.description,
            redirectURL: window.location.origin,
            referenceId: request.orderId
          }
        }
      };

      this.logPaymentEvent('Cash App payment prepared for client processing', {
        transactionId: response.transactionId,
        amount: request.amount
      });

      return {
        success: true,
        payment: response,
        requiresAction: true,
        actionUrl: undefined // Client-side processing via Square SDK
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Cash App payment failed', { error: errorMessage });
      
      const paymentError = this.mapCashAppError(error);
      return { success: false, error: paymentError };
    }
  }

  /**
   * Process payment with Cash App token (called after client-side tokenization)
   */
  async processPaymentWithToken(token: string, request: PaymentRequest): Promise<PaymentResult> {
    try {
      const payment = await this.createSquarePayment({
        source_id: token,
        amount_money: {
          amount: Math.round(request.amount * 100), // Convert to cents
          currency: request.currency
        },
        idempotency_key: `${request.orderId}-${Date.now()}`,
        order_id: request.orderId,
        note: `Cash App Pay: ${request.description}`,
        buyer_email_address: request.customerEmail
      });

      const response: PaymentResponse = {
        transactionId: payment.id,
        status: this.mapSquareStatus(payment.status),
        amount: payment.amount_money.amount / 100, // Convert back from cents
        currency: payment.amount_money.currency,
        gateway: 'cashapp',
        gatewayTransactionId: payment.id,
        paidAt: payment.status === 'COMPLETED' ? new Date() : undefined,
        rawResponse: payment,
        metadata: {
          cashAppPay: true,
          squarePaymentId: payment.id
        }
      };

      this.logPaymentEvent('Cash App payment completed', {
        transactionId: payment.id,
        status: payment.status,
        amount: response.amount
      });

      return { success: true, payment: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Cash App payment with token failed', { error: errorMessage });
      
      const paymentError = this.mapCashAppError(error);
      return { success: false, error: paymentError };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentResponse> {
    try {
      const payment = await this.getSquarePayment(transactionId);
      
      if (!payment) {
        throw new Error('Cash App payment not found');
      }

      const response: PaymentResponse = {
        transactionId,
        status: this.mapSquareStatus(payment.status),
        amount: payment.amount_money.amount / 100,
        currency: payment.amount_money.currency,
        gateway: 'cashapp',
        gatewayTransactionId: payment.id,
        paidAt: payment.status === 'COMPLETED' ? new Date(payment.created_at) : undefined,
        rawResponse: payment,
        metadata: {
          cashAppPay: true,
          squarePaymentId: payment.id
        }
      };

      this.logPaymentEvent('Cash App payment verified', {
        transactionId,
        status: payment.status,
        amount: response.amount
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Cash App verification failed', { 
        transactionId, 
        error: errorMessage 
      });
      throw this.mapCashAppError(error);
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const refund = await this.createSquareRefund({
        payment_id: request.transactionId,
        amount_money: request.amount ? {
          amount: Math.round(request.amount * 100),
          currency: 'USD' // TODO: Get currency from original payment
        } : undefined,
        idempotency_key: `cashapp-refund-${request.transactionId}-${Date.now()}`,
        reason: request.reason || 'Cash App Pay refund requested'
      });

      const response: RefundResponse = {
        refundId: refund.id,
        transactionId: request.transactionId,
        amount: refund.amount_money.amount / 100,
        currency: refund.amount_money.currency,
        status: this.mapSquareStatus(refund.status),
        gateway: 'cashapp',
        refundedAt: new Date(refund.created_at),
        rawResponse: refund
      };

      this.logPaymentEvent('Cash App refund processed', {
        refundId: refund.id,
        transactionId: request.transactionId,
        amount: response.amount
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Cash App refund failed', {
        transactionId: request.transactionId,
        error: errorMessage
      });
      throw this.mapCashAppError(error);
    }
  }

  async handleWebhook(payload: any, signature?: string): Promise<WebhookPayload> {
    try {
      // Cash App Pay uses Square's webhook system
      const eventType = payload.type;
      const data = payload.data;

      let transactionId: string | undefined;
      let status: PaymentStatus | undefined;

      // Extract transaction info based on event type
      if (eventType.includes('payment')) {
        transactionId = data.object?.payment?.id;
        status = this.mapSquareStatus(data.object?.payment?.status);
      }

      const webhookPayload: WebhookPayload = {
        gateway: 'cashapp',
        eventType,
        transactionId,
        status,
        data: payload,
        timestamp: new Date(payload.created_at || new Date()),
        signature
      };

      this.logPaymentEvent('Cash App webhook received', {
        eventType,
        transactionId,
        status
      });

      return webhookPayload;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Cash App webhook processing failed', { error: errorMessage });
      throw this.mapCashAppError(error);
    }
  }

  getPaymentMethod(): PaymentMethod {
    return {
      gateway: 'cashapp',
      name: 'Cash App Pay',
      description: 'Pay instantly with your Cash App',
      enabled: this.isInitialized,
      supportedCurrencies: ['USD'], // Cash App Pay currently only supports USD
      fees: {
        percentage: 2.75,
        fixed: 0.15
      },
      minAmount: 1.00, // Cash App Pay minimum
      maxAmount: 2500 // Cash App Pay daily limit
    };
  }

  // Private helper methods (same as Square since it uses Square's infrastructure)

  private async testApiConnection(): Promise<void> {
    try {
      await this.makeSquareRequest('/v2/locations', 'GET');
    } catch (error) {
      throw new Error('Failed to connect to Square API for Cash App Pay');
    }
  }

  private async makeSquareRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Square-Version': '2023-10-18'
    };

    const config: RequestInit = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      throw new Error(`Square API error (Cash App): ${response.status} - ${errorData.message || errorText}`);
    }

    return response.json();
  }

  private async createSquarePayment(paymentData: any): Promise<any> {
    const response = await this.makeSquareRequest('/v2/payments', 'POST', paymentData);
    return response.payment;
  }

  private async getSquarePayment(paymentId: string): Promise<any> {
    const response = await this.makeSquareRequest(`/v2/payments/${paymentId}`, 'GET');
    return response.payment;
  }

  private async createSquareRefund(refundData: any): Promise<any> {
    const response = await this.makeSquareRequest('/v2/refunds', 'POST', refundData);
    return response.refund;
  }

  private mapSquareStatus(squareStatus: string): PaymentStatus {
    switch (squareStatus?.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'completed':
        return 'completed';
      case 'canceled':
      case 'cancelled':
        return 'cancelled';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private mapCashAppError(error: any): PaymentError {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Cash App error';
    
    // Map common Cash App/Square errors
    if (errorMessage.includes('INSUFFICIENT_FUNDS')) {
      return this.createError(
        'INSUFFICIENT_FUNDS',
        'Insufficient funds in Cash App account',
        error,
        true,
        'Insufficient funds in your Cash App. Please add money to your account or try a different payment method.'
      );
    }
    
    if (errorMessage.includes('PAYMENT_DECLINED')) {
      return this.createError(
        'PAYMENT_DECLINED',
        'Cash App payment was declined',
        error,
        false,
        'Payment was declined. Please try a different payment method.'
      );
    }
    
    if (errorMessage.includes('CASHAPP_NOT_ACTIVATED')) {
      return this.createError(
        'CASHAPP_NOT_ACTIVATED',
        'Cash App account not activated for payments',
        error,
        false,
        'Your Cash App account needs to be set up for payments. Please complete your Cash App setup.'
      );
    }

    if (errorMessage.includes('401') || errorMessage.includes('403')) {
      return this.createError(
        'AUTHENTICATION_FAILED',
        'Cash App authentication failed',
        error,
        true,
        'Payment service temporarily unavailable. Please try again.'
      );
    }
    
    // Default error mapping
    return this.createError(
      'CASHAPP_ERROR',
      errorMessage,
      error,
      true,
      'Cash App payment failed. Please try again or use a different payment method.'
    );
  }

  /**
   * Get Square Web SDK payments instance for Cash App Pay
   */
  getSquarePayments(): any {
    return this.payments;
  }

  /**
   * Create Cash App Pay button (client-side helper)
   */
  async createCashAppPayButton(containerId: string, callbacks: {
    onPayment?: (result: any) => void;
    onError?: (error: any) => void;
  } = {}): Promise<any> {
    if (!this.payments) {
      throw new Error('Cash App Pay not initialized');
    }

    try {
      const cashAppPay = await this.payments.cashAppPay({
        redirectURL: window.location.origin,
        referenceId: `cashapp-${Date.now()}`
      });

      await cashAppPay.attach(`#${containerId}`, {
        size: 'medium',
        shape: 'round'
      });

      cashAppPay.addEventListener('ontokenization', (event: any) => {
        const { tokenResult } = event.detail;
        if (tokenResult.status === 'OK') {
          callbacks.onPayment?.(tokenResult);
        } else {
          callbacks.onError?.(tokenResult.errors);
        }
      });

      return cashAppPay;

    } catch (error) {
      console.error('Failed to create Cash App Pay button:', error);
      callbacks.onError?.(error);
      throw error;
    }
  }
}