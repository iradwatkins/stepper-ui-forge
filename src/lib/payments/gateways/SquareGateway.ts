// Square Payment Gateway Implementation
// Implements PaymentGateway interface for Square payment processing

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

// Square Web SDK types
interface SquarePayment {
  applicationId: string;
  locationId: string;
  environment: 'sandbox' | 'production';
}

interface SquarePaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  buyerEmailAddress?: string;
  note?: string;
}

interface SquarePaymentResponse {
  token?: string;
  errors?: Array<{
    code: string;
    detail: string;
    category: string;
  }>;
}

export class SquareGateway extends PaymentGateway {
  private applicationId: string;
  private accessToken: string;
  private locationId: string;
  private baseUrl: string;
  private payments: any; // Square Web SDK payments object

  constructor(options: GatewayInitOptions) {
    super('square', options);
    
    this.applicationId = options.credentials.applicationId || '';
    this.accessToken = options.credentials.accessToken || '';
    this.locationId = options.credentials.locationId || '';
    this.baseUrl = options.environment === 'production' 
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
  }

  async initialize(): Promise<void> {
    try {
      if (!this.applicationId || !this.accessToken || !this.locationId) {
        throw new Error('Square application ID, access token, and location ID are required');
      }

      // Initialize Square Web SDK
      if (typeof window !== 'undefined') {
        // Check if Square Web SDK is loaded
        if (!window.Square) {
          throw new Error('Square Web SDK not loaded. Please include the Square Web SDK script.');
        }

        this.payments = window.Square.payments(this.applicationId, this.locationId);
      }

      // Test API connectivity
      await this.testApiConnection();
      
      this.isInitialized = true;
      this.logPaymentEvent('Square gateway initialized', {
        environment: this.options.environment,
        baseUrl: this.baseUrl,
        locationId: this.locationId
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Square initialization failed', { error: errorMessage });
      throw this.createError(
        'SQUARE_INIT_FAILED',
        `Square initialization failed: ${errorMessage}`,
        error,
        false,
        'Payment system is temporarily unavailable. Please try again later.'
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

      this.logPaymentEvent('Processing Square payment', {
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency
      });

      // For Square, we need to handle payment on the client side first
      // This implementation assumes the token is generated client-side
      const response: PaymentResponse = {
        transactionId: `square-${Date.now()}`, // Temporary ID until actual payment
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        gateway: 'square',
        metadata: {
          requiresClientSideProcessing: true,
          squareRequest: {
            amount: Math.round(request.amount * 100), // Convert to cents
            currency: request.currency,
            orderId: request.orderId,
            description: request.description,
            buyerEmailAddress: request.customerEmail
          }
        }
      };

      this.logPaymentEvent('Square payment prepared for client processing', {
        transactionId: response.transactionId,
        amount: request.amount
      });

      return {
        success: true,
        payment: response,
        requiresAction: true,
        actionUrl: undefined // Client-side processing
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Square payment failed', { error: errorMessage });
      
      const paymentError = this.mapSquareError(error);
      return { success: false, error: paymentError };
    }
  }

  /**
   * Process payment with Square token (called after client-side tokenization)
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
        note: request.description,
        buyer_email_address: request.customerEmail
      });

      const response: PaymentResponse = {
        transactionId: payment.id,
        status: this.mapSquareStatus(payment.status),
        amount: payment.amount_money.amount / 100, // Convert back from cents
        currency: payment.amount_money.currency,
        gateway: 'square',
        gatewayTransactionId: payment.id,
        paidAt: payment.status === 'COMPLETED' ? new Date() : undefined,
        rawResponse: payment
      };

      this.logPaymentEvent('Square payment completed', {
        transactionId: payment.id,
        status: payment.status,
        amount: response.amount
      });

      return { success: true, payment: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Square payment with token failed', { error: errorMessage });
      
      const paymentError = this.mapSquareError(error);
      return { success: false, error: paymentError };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentResponse> {
    try {
      const payment = await this.getSquarePayment(transactionId);
      
      if (!payment) {
        throw new Error('Square payment not found');
      }

      const response: PaymentResponse = {
        transactionId,
        status: this.mapSquareStatus(payment.status),
        amount: payment.amount_money.amount / 100,
        currency: payment.amount_money.currency,
        gateway: 'square',
        gatewayTransactionId: payment.id,
        paidAt: payment.status === 'COMPLETED' ? new Date(payment.created_at) : undefined,
        rawResponse: payment
      };

      this.logPaymentEvent('Square payment verified', {
        transactionId,
        status: payment.status,
        amount: response.amount
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Square verification failed', { 
        transactionId, 
        error: errorMessage 
      });
      throw this.mapSquareError(error);
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
        idempotency_key: `refund-${request.transactionId}-${Date.now()}`,
        reason: request.reason || 'Refund requested'
      });

      const response: RefundResponse = {
        refundId: refund.id,
        transactionId: request.transactionId,
        amount: refund.amount_money.amount / 100,
        currency: refund.amount_money.currency,
        status: this.mapSquareStatus(refund.status),
        gateway: 'square',
        refundedAt: new Date(refund.created_at),
        rawResponse: refund
      };

      this.logPaymentEvent('Square refund processed', {
        refundId: refund.id,
        transactionId: request.transactionId,
        amount: response.amount
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Square refund failed', {
        transactionId: request.transactionId,
        error: errorMessage
      });
      throw this.mapSquareError(error);
    }
  }

  async handleWebhook(payload: any, signature?: string): Promise<WebhookPayload> {
    try {
      // Square webhook signature verification would go here
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
        gateway: 'square',
        eventType,
        transactionId,
        status,
        data: payload,
        timestamp: new Date(payload.created_at || new Date()),
        signature
      };

      this.logPaymentEvent('Square webhook received', {
        eventType,
        transactionId,
        status
      });

      return webhookPayload;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('Square webhook processing failed', { error: errorMessage });
      throw this.mapSquareError(error);
    }
  }

  getPaymentMethod(): PaymentMethod {
    return {
      gateway: 'square',
      name: 'Square',
      description: 'Pay with credit card via Square',
      enabled: this.isInitialized,
      supportedCurrencies: ['USD', 'CAD', 'GBP', 'EUR'],
      fees: {
        percentage: 2.6,
        fixed: 0.10
      },
      minAmount: 0.01,
      maxAmount: 50000
    };
  }

  // Private helper methods

  private async testApiConnection(): Promise<void> {
    try {
      await this.makeSquareRequest('/v2/locations', 'GET');
    } catch (error) {
      throw new Error('Failed to connect to Square API');
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
      throw new Error(`Square API error: ${response.status} - ${errorData.message || errorText}`);
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

  private mapSquareError(error: any): PaymentError {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Square error';
    
    // Map common Square errors
    if (errorMessage.includes('INSUFFICIENT_FUNDS')) {
      return this.createError(
        'INSUFFICIENT_FUNDS',
        'Insufficient funds',
        error,
        true,
        'Insufficient funds. Please try a different card.'
      );
    }
    
    if (errorMessage.includes('CARD_DECLINED')) {
      return this.createError(
        'CARD_DECLINED',
        'Card was declined',
        error,
        false,
        'Your card was declined. Please try a different payment method.'
      );
    }
    
    if (errorMessage.includes('INVALID_CARD')) {
      return this.createError(
        'INVALID_CARD',
        'Invalid card information',
        error,
        false,
        'Invalid card information. Please check your card details.'
      );
    }

    if (errorMessage.includes('401') || errorMessage.includes('403')) {
      return this.createError(
        'AUTHENTICATION_FAILED',
        'Square authentication failed',
        error,
        true,
        'Payment service temporarily unavailable. Please try again.'
      );
    }
    
    // Default error mapping
    return this.createError(
      'SQUARE_ERROR',
      errorMessage,
      error,
      true,
      'Payment processing failed. Please try again.'
    );
  }

  /**
   * Get Square Web SDK payments instance for client-side use
   */
  getSquarePayments(): any {
    return this.payments;
  }

  /**
   * Check if Cash App Pay is available (Square feature)
   */
  isCashAppPayAvailable(): boolean {
    return this.isInitialized && this.payments;
  }
}