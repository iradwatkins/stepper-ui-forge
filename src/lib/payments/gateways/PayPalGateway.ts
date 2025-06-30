// PayPal Payment Gateway Implementation
// Implements PaymentGateway interface for PayPal payment processing

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

// PayPal SDK types
interface PayPalOrderResponse {
  id: string;
  status: string;
  payment_source?: any;
  purchase_units: {
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
        create_time: string;
      }>;
    };
  }[];
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

interface PayPalCreateOrderRequest {
  intent: 'CAPTURE';
  purchase_units: Array<{
    reference_id: string;
    amount: {
      currency_code: string;
      value: string;
    };
    description: string;
    custom_id?: string;
    invoice_id?: string;
  }>;
  payment_source?: any;
  application_context?: {
    brand_name?: string;
    locale?: string;
    landing_page?: 'LOGIN' | 'GUEST_CHECKOUT';
    shipping_preference?: 'NO_SHIPPING' | 'SET_PROVIDED_ADDRESS' | 'GET_FROM_FILE';
    user_action?: 'CONTINUE' | 'PAY_NOW';
    return_url?: string;
    cancel_url?: string;
  };
}

export class PayPalGateway extends PaymentGateway {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(options: GatewayInitOptions) {
    super('paypal', options);
    
    this.clientId = options.credentials.clientId || '';
    this.clientSecret = options.credentials.clientSecret || '';
    this.baseUrl = options.environment === 'production' 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  async initialize(): Promise<void> {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('PayPal client ID and secret are required');
      }

      // Test authentication by getting access token
      await this.getAccessToken();
      
      this.isInitialized = true;
      this.logPaymentEvent('PayPal gateway initialized', {
        environment: this.options.environment,
        baseUrl: this.baseUrl
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('PayPal initialization failed', { error: errorMessage });
      throw this.createError(
        'PAYPAL_INIT_FAILED',
        `PayPal initialization failed: ${errorMessage}`,
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

      this.logPaymentEvent('Processing PayPal payment', {
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency
      });

      // Create PayPal order
      const order = await this.createPayPalOrder(request);
      
      if (!order.id) {
        throw new Error('Failed to create PayPal order');
      }

      // Find approval URL
      const approvalUrl = order.links?.find(link => link.rel === 'approve')?.href;
      
      if (!approvalUrl) {
        throw new Error('No approval URL returned from PayPal');
      }

      const response: PaymentResponse = {
        transactionId: order.id,
        status: this.mapPayPalStatus(order.status),
        amount: request.amount,
        currency: request.currency,
        gateway: 'paypal',
        gatewayTransactionId: order.id,
        rawResponse: order,
        metadata: {
          approvalUrl,
          paypalOrderId: order.id
        }
      };

      this.logPaymentEvent('PayPal payment created', {
        transactionId: order.id,
        status: order.status
      });

      return {
        success: true,
        payment: response,
        requiresAction: true,
        actionUrl: approvalUrl,
        redirectUrl: approvalUrl
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('PayPal payment failed', { error: errorMessage });
      
      const paymentError = this.mapPayPalError(error);
      return { success: false, error: paymentError };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentResponse> {
    try {
      const order = await this.getPayPalOrder(transactionId);
      
      if (!order) {
        throw new Error('PayPal order not found');
      }

      const capture = order.purchase_units[0]?.payments?.captures?.[0];
      const amount = capture ? parseFloat(capture.amount.value) : 0;
      const currency = capture?.amount.currency_code as any || 'USD';

      const response: PaymentResponse = {
        transactionId,
        status: this.mapPayPalStatus(order.status),
        amount,
        currency,
        gateway: 'paypal',
        gatewayTransactionId: order.id,
        paidAt: capture?.create_time ? new Date(capture.create_time) : undefined,
        rawResponse: order
      };

      this.logPaymentEvent('PayPal payment verified', {
        transactionId,
        status: order.status,
        amount
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('PayPal verification failed', { 
        transactionId, 
        error: errorMessage 
      });
      throw this.mapPayPalError(error);
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      // Get the original order to find the capture ID
      const order = await this.getPayPalOrder(request.transactionId);
      const capture = order.purchase_units[0]?.payments?.captures?.[0];
      
      if (!capture) {
        throw new Error('No capture found for this transaction');
      }

      const refundRequest = {
        amount: request.amount ? {
          currency_code: capture.amount.currency_code,
          value: request.amount.toString()
        } : undefined,
        note_to_payer: request.reason || 'Refund processed'
      };

      const refund = await this.makePayPalRequest(
        `/v2/payments/captures/${capture.id}/refund`,
        'POST',
        refundRequest
      );

      const response: RefundResponse = {
        refundId: refund.id,
        transactionId: request.transactionId,
        amount: parseFloat(refund.amount.value),
        currency: refund.amount.currency_code,
        status: this.mapPayPalStatus(refund.status),
        gateway: 'paypal',
        refundedAt: new Date(refund.create_time),
        rawResponse: refund
      };

      this.logPaymentEvent('PayPal refund processed', {
        refundId: refund.id,
        transactionId: request.transactionId,
        amount: response.amount
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('PayPal refund failed', {
        transactionId: request.transactionId,
        error: errorMessage
      });
      throw this.mapPayPalError(error);
    }
  }

  async handleWebhook(payload: any, signature?: string): Promise<WebhookPayload> {
    try {
      // PayPal webhook signature verification would go here
      // For now, we'll trust the webhook content

      const eventType = payload.event_type;
      const resource = payload.resource;

      let transactionId: string | undefined;
      let status: PaymentStatus | undefined;

      // Extract transaction info based on event type
      if (eventType.includes('PAYMENT.CAPTURE')) {
        transactionId = resource.id;
        status = this.mapPayPalStatus(resource.status);
      } else if (eventType.includes('CHECKOUT.ORDER')) {
        transactionId = resource.id;
        status = this.mapPayPalStatus(resource.status);
      }

      const webhookPayload: WebhookPayload = {
        gateway: 'paypal',
        eventType,
        transactionId,
        status,
        data: payload,
        timestamp: new Date(payload.create_time || new Date()),
        signature
      };

      this.logPaymentEvent('PayPal webhook received', {
        eventType,
        transactionId,
        status
      });

      return webhookPayload;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('PayPal webhook processing failed', { error: errorMessage });
      throw this.mapPayPalError(error);
    }
  }

  getPaymentMethod(): PaymentMethod {
    return {
      gateway: 'paypal',
      name: 'PayPal',
      description: 'Pay with your PayPal account or credit card',
      enabled: this.isInitialized,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD'],
      fees: {
        percentage: 2.9,
        fixed: 0.30
      },
      minAmount: 0.01,
      maxAmount: 10000
    };
  }

  // Private helper methods

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`PayPal auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute before expiry

      return this.accessToken;

    } catch (error) {
      this.accessToken = null;
      this.tokenExpiresAt = 0;
      throw error;
    }
  }

  private async makePayPalRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const token = await this.getAccessToken();
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
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
      throw new Error(`PayPal API error: ${response.status} - ${errorData.message || errorText}`);
    }

    return response.json();
  }

  private async createPayPalOrder(request: PaymentRequest): Promise<PayPalOrderResponse> {
    const orderRequest: PayPalCreateOrderRequest = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: request.orderId,
        amount: {
          currency_code: request.currency,
          value: request.amount.toFixed(2)
        },
        description: request.description,
        custom_id: request.orderId,
        invoice_id: request.orderId
      }],
      application_context: {
        brand_name: 'Event Ticketing',
        locale: 'en-US',
        landing_page: 'GUEST_CHECKOUT',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: request.successUrl || this.options.returnUrl,
        cancel_url: request.cancelUrl || this.options.cancelUrl
      }
    };

    return this.makePayPalRequest('/v2/checkout/orders', 'POST', orderRequest);
  }

  private async getPayPalOrder(orderId: string): Promise<PayPalOrderResponse> {
    return this.makePayPalRequest(`/v2/checkout/orders/${orderId}`);
  }

  private mapPayPalStatus(paypalStatus: string): PaymentStatus {
    switch (paypalStatus.toLowerCase()) {
      case 'created':
      case 'saved':
        return 'pending';
      case 'approved':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'cancelled':
      case 'voided':
        return 'cancelled';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private mapPayPalError(error: any): PaymentError {
    const errorMessage = error instanceof Error ? error.message : 'Unknown PayPal error';
    
    // Map common PayPal errors
    if (errorMessage.includes('INSUFFICIENT_FUNDS')) {
      return this.createError(
        'INSUFFICIENT_FUNDS',
        'Insufficient funds in PayPal account',
        error,
        true,
        'Insufficient funds. Please check your PayPal account balance or try a different payment method.'
      );
    }
    
    if (errorMessage.includes('PAYMENT_DENIED')) {
      return this.createError(
        'PAYMENT_DENIED',
        'Payment was denied by PayPal',
        error,
        false,
        'Payment was declined. Please try a different payment method.'
      );
    }
    
    if (errorMessage.includes('INVALID_RESOURCE_ID')) {
      return this.createError(
        'INVALID_TRANSACTION',
        'Invalid transaction ID',
        error,
        false,
        'Transaction not found. Please verify the transaction details.'
      );
    }

    if (errorMessage.includes('401') || errorMessage.includes('403')) {
      return this.createError(
        'AUTHENTICATION_FAILED',
        'PayPal authentication failed',
        error,
        true,
        'Payment service temporarily unavailable. Please try again.'
      );
    }
    
    // Default error mapping
    return this.createError(
      'PAYPAL_ERROR',
      errorMessage,
      error,
      true,
      'Payment processing failed. Please try again.'
    );
  }
}