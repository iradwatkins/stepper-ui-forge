// Payment Service
// Main entry point for payment processing with gateway initialization

import { PaymentManager, PaymentManagerConfig } from './PaymentManager';
import { PayPalGateway } from './gateways/PayPalGateway';
import { SquareGateway } from './gateways/SquareGateway';
import { CashAppGateway } from './gateways/CashAppGateway';
import { getPaymentConfig } from '../payment-config';
import {
  PaymentRequest,
  PaymentResult,
  PaymentMethod,
  RefundRequest,
  RefundResponse,
  WebhookPayload,
  PaymentGateway as PaymentGatewayType,
  EventPaymentConfig
} from './types';

export class PaymentService {
  private static instance: PaymentService;
  private paymentManager: PaymentManager;
  private initialized: boolean = false;

  private constructor() {
    const config: PaymentManagerConfig = {
      defaultGateway: 'paypal',
      enabledGateways: ['paypal', 'square', 'cashapp'],
      enableFailover: true,
      maxRetries: 3
    };
    
    this.paymentManager = new PaymentManager(config);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Initialize payment service with all gateways
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const config = getPaymentConfig();

      // Initialize PayPal Gateway
      const paypalGateway = new PayPalGateway({
        environment: config.paypal.environment,
        credentials: {
          clientId: config.paypal.clientId,
          clientSecret: config.paypal.clientSecret || ''
        },
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        webhookUrl: config.webhookUrl
      });

      this.paymentManager.registerGateway(paypalGateway);

      // Initialize Square Gateway
      const squareGateway = new SquareGateway({
        environment: config.square.environment,
        credentials: {
          applicationId: config.square.applicationId,
          accessToken: config.square.accessToken,
          locationId: config.square.locationId
        },
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        webhookUrl: config.webhookUrl
      });

      this.paymentManager.registerGateway(squareGateway);

      // Initialize Cash App Gateway (uses Square infrastructure)
      const cashAppGateway = new CashAppGateway({
        environment: config.square.environment, // Uses Square environment
        credentials: {
          clientId: config.square.applicationId, // Same as Square app ID
          accessToken: config.square.accessToken,
          locationId: config.square.locationId
        },
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        webhookUrl: config.webhookUrl
      });

      this.paymentManager.registerGateway(cashAppGateway);

      // Initialize all registered gateways
      await this.paymentManager.initializeGateways();

      this.initialized = true;
      console.log('✅ Payment Service initialized successfully');

    } catch (error) {
      console.error('❌ Payment Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get available payment methods for an event
   */
  getAvailablePaymentMethods(eventId?: string): PaymentMethod[] {
    if (!this.initialized) {
      throw new Error('Payment service not initialized');
    }
    return this.paymentManager.getAvailablePaymentMethods(eventId);
  }

  /**
   * Process payment with automatic gateway selection
   */
  async processPayment(request: PaymentRequest, eventId?: string): Promise<PaymentResult> {
    if (!this.initialized) {
      throw new Error('Payment service not initialized');
    }
    return this.paymentManager.processPayment(request, eventId);
  }

  /**
   * Process refund
   */
  async processRefund(request: RefundRequest, gatewayType: PaymentGatewayType): Promise<RefundResponse> {
    if (!this.initialized) {
      throw new Error('Payment service not initialized');
    }
    return this.paymentManager.processRefund(request, gatewayType);
  }

  /**
   * Handle webhook from payment gateway
   */
  async handleWebhook(gatewayType: PaymentGatewayType, payload: any, signature?: string): Promise<WebhookPayload> {
    if (!this.initialized) {
      throw new Error('Payment service not initialized');
    }
    return this.paymentManager.handleWebhook(gatewayType, payload, signature);
  }

  /**
   * Set payment configuration for a specific event
   */
  setEventPaymentConfig(config: EventPaymentConfig): void {
    if (!this.initialized) {
      throw new Error('Payment service not initialized');
    }
    this.paymentManager.setEventConfig(config);
  }

  /**
   * Get payment gateway health status
   */
  getGatewayHealth(): Record<PaymentGatewayType, boolean> {
    if (!this.initialized) {
      return { paypal: false, square: false, cashapp: false };
    }
    return this.paymentManager.getGatewayHealth();
  }

  /**
   * Check if any payment gateways are available
   */
  hasAvailableGateways(): boolean {
    if (!this.initialized) {
      return false;
    }
    return this.paymentManager.hasAvailableGateways();
  }

  /**
   * Get payment service status
   */
  getStatus(): {
    initialized: boolean;
    gatewayHealth: Record<PaymentGatewayType, boolean>;
    hasAvailableGateways: boolean;
  } {
    return {
      initialized: this.initialized,
      gatewayHealth: this.getGatewayHealth(),
      hasAvailableGateways: this.hasAvailableGateways()
    };
  }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance();