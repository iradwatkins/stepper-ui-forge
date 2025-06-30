// Abstract Payment Gateway Interface
// Provides standardized interface for all payment gateways

import {
  PaymentRequest,
  PaymentResponse,
  PaymentError,
  PaymentResult,
  RefundRequest,
  RefundResponse,
  WebhookPayload,
  GatewayInitOptions,
  PaymentGateway as PaymentGatewayType,
  PaymentMethod
} from './types';

export abstract class PaymentGateway {
  protected gatewayType: PaymentGatewayType;
  protected isInitialized: boolean = false;
  protected options: GatewayInitOptions;

  constructor(gatewayType: PaymentGatewayType, options: GatewayInitOptions) {
    this.gatewayType = gatewayType;
    this.options = options;
  }

  /**
   * Initialize the payment gateway with configuration
   */
  abstract initialize(): Promise<void>;

  /**
   * Process a payment request
   */
  abstract processPayment(request: PaymentRequest): Promise<PaymentResult>;

  /**
   * Verify a payment transaction
   */
  abstract verifyPayment(transactionId: string): Promise<PaymentResponse>;

  /**
   * Process a refund
   */
  abstract processRefund(request: RefundRequest): Promise<RefundResponse>;

  /**
   * Handle webhook notifications
   */
  abstract handleWebhook(payload: any, signature?: string): Promise<WebhookPayload>;

  /**
   * Get payment method information
   */
  abstract getPaymentMethod(): PaymentMethod;

  /**
   * Check if gateway is properly configured and ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get gateway type
   */
  getGatewayType(): PaymentGatewayType {
    return this.gatewayType;
  }

  /**
   * Get gateway environment
   */
  getEnvironment(): 'sandbox' | 'production' {
    return this.options.environment;
  }

  /**
   * Validate payment request
   */
  protected validatePaymentRequest(request: PaymentRequest): PaymentError | null {
    if (!request.amount || request.amount <= 0) {
      return {
        code: 'INVALID_AMOUNT',
        message: 'Payment amount must be greater than zero',
        gateway: this.gatewayType,
        retryable: false,
        userMessage: 'Please check the payment amount and try again.'
      };
    }

    if (!request.orderId) {
      return {
        code: 'MISSING_ORDER_ID',
        message: 'Order ID is required',
        gateway: this.gatewayType,
        retryable: false,
        userMessage: 'Unable to process payment. Please refresh and try again.'
      };
    }

    if (!request.customerEmail) {
      return {
        code: 'MISSING_CUSTOMER_EMAIL',
        message: 'Customer email is required',
        gateway: this.gatewayType,
        retryable: false,
        userMessage: 'Please provide a valid email address.'
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.customerEmail)) {
      return {
        code: 'INVALID_EMAIL',
        message: 'Invalid email format',
        gateway: this.gatewayType,
        retryable: false,
        userMessage: 'Please provide a valid email address.'
      };
    }

    return null;
  }

  /**
   * Create standardized error
   */
  protected createError(
    code: string,
    message: string,
    originalError?: any,
    retryable: boolean = false,
    userMessage?: string
  ): PaymentError {
    return {
      code,
      message,
      gateway: this.gatewayType,
      originalError,
      retryable,
      userMessage: userMessage || 'Payment processing failed. Please try again.'
    };
  }

  /**
   * Log payment events (sanitized for security)
   */
  protected logPaymentEvent(event: string, data: any = {}) {
    const sanitizedData = this.sanitizeLogData(data);
    console.log(`[${this.gatewayType.toUpperCase()}] ${event}:`, sanitizedData);
  }

  /**
   * Remove sensitive data from logs
   */
  private sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = [
      'password', 'secret', 'token', 'key', 'credential',
      'authorization', 'signature', 'cvv', 'cvc', 'pan',
      'cardNumber', 'accountNumber'
    ];

    const sanitized = { ...data };
    
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeLogData(sanitized[key]);
      }
    });

    return sanitized;
  }
}