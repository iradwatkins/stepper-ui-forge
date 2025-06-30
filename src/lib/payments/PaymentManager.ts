// Payment Manager
// Handles gateway selection, failover, and orchestration

import { PaymentGateway } from './PaymentGateway';
import {
  PaymentRequest,
  PaymentResult,
  PaymentError,
  PaymentGateway as PaymentGatewayType,
  EventPaymentConfig,
  PaymentMethod,
  RefundRequest,
  RefundResponse,
  WebhookPayload
} from './types';

export interface PaymentManagerConfig {
  defaultGateway: PaymentGatewayType;
  enabledGateways: PaymentGatewayType[];
  enableFailover: boolean;
  maxRetries: number;
}

export class PaymentManager {
  private gateways = new Map<PaymentGatewayType, PaymentGateway>();
  private config: PaymentManagerConfig;
  private eventConfigs = new Map<string, EventPaymentConfig>();

  constructor(config: PaymentManagerConfig) {
    this.config = config;
  }

  /**
   * Register a payment gateway
   */
  registerGateway(gateway: PaymentGateway): void {
    this.gateways.set(gateway.getGatewayType(), gateway);
  }

  /**
   * Initialize all registered gateways
   */
  async initializeGateways(): Promise<void> {
    const initPromises = Array.from(this.gateways.values()).map(gateway =>
      gateway.initialize().catch(error => {
        console.error(`Failed to initialize ${gateway.getGatewayType()} gateway:`, error);
      })
    );

    await Promise.allSettled(initPromises);
    this.logGatewayStatus();
  }

  /**
   * Set payment configuration for an event
   */
  setEventConfig(config: EventPaymentConfig): void {
    this.eventConfigs.set(config.eventId, config);
  }

  /**
   * Get payment configuration for an event
   */
  getEventConfig(eventId: string): EventPaymentConfig | null {
    return this.eventConfigs.get(eventId) || null;
  }

  /**
   * Get available payment methods for an event
   */
  getAvailablePaymentMethods(eventId?: string): PaymentMethod[] {
    const eventConfig = eventId ? this.getEventConfig(eventId) : null;
    const enabledGateways = eventConfig?.enabledGateways || this.config.enabledGateways;

    return enabledGateways
      .map(gatewayType => this.gateways.get(gatewayType))
      .filter((gateway): gateway is PaymentGateway => gateway !== undefined && gateway.isReady())
      .map(gateway => gateway.getPaymentMethod());
  }

  /**
   * Process payment with automatic gateway selection and failover
   */
  async processPayment(request: PaymentRequest, eventId?: string): Promise<PaymentResult> {
    const eventConfig = eventId ? this.getEventConfig(eventId) : null;
    const gatewayOrder = this.getGatewayOrder(eventConfig);

    let lastError: PaymentError | undefined;

    for (const gatewayType of gatewayOrder) {
      const gateway = this.gateways.get(gatewayType);
      
      if (!gateway || !gateway.isReady()) {
        continue;
      }

      try {
        console.log(`Attempting payment with ${gatewayType}`);
        const result = await gateway.processPayment(request);

        if (result.success) {
          console.log(`Payment successful with ${gatewayType}`);
          return result;
        }

        // If payment failed but gateway responded, store error and try next gateway
        if (result.error) {
          lastError = result.error;
          
          // If error is not retryable, don't try other gateways
          if (!result.error.retryable) {
            break;
          }
        }

      } catch (error) {
        console.error(`Payment failed with ${gatewayType}:`, error);
        lastError = {
          code: 'GATEWAY_ERROR',
          message: `Payment gateway ${gatewayType} failed`,
          gateway: gatewayType,
          originalError: error,
          retryable: true,
          userMessage: 'Payment processing failed. Please try again.'
        };
      }
    }

    // If we reach here, all gateways failed
    return {
      success: false,
      error: lastError || {
        code: 'NO_AVAILABLE_GATEWAYS',
        message: 'No payment gateways available',
        gateway: 'paypal', // Default for type safety
        retryable: true,
        userMessage: 'Payment processing is temporarily unavailable. Please try again later.'
      }
    };
  }

  /**
   * Process refund
   */
  async processRefund(request: RefundRequest, gatewayType: PaymentGatewayType): Promise<RefundResponse> {
    const gateway = this.gateways.get(gatewayType);
    
    if (!gateway || !gateway.isReady()) {
      throw new Error(`Gateway ${gatewayType} not available for refund`);
    }

    return await gateway.processRefund(request);
  }

  /**
   * Handle webhook from any gateway
   */
  async handleWebhook(gatewayType: PaymentGatewayType, payload: any, signature?: string): Promise<WebhookPayload> {
    const gateway = this.gateways.get(gatewayType);
    
    if (!gateway) {
      throw new Error(`Gateway ${gatewayType} not registered`);
    }

    return await gateway.handleWebhook(payload, signature);
  }

  /**
   * Get gateway order for processing (preferred, then fallbacks)
   */
  private getGatewayOrder(eventConfig: EventPaymentConfig | null): PaymentGatewayType[] {
    if (eventConfig) {
      const order: PaymentGatewayType[] = [];
      
      // Add preferred gateway first
      if (eventConfig.preferredGateway && eventConfig.enabledGateways.includes(eventConfig.preferredGateway)) {
        order.push(eventConfig.preferredGateway);
      }
      
      // Add fallback gateways
      if (eventConfig.fallbackGateways) {
        eventConfig.fallbackGateways.forEach(gateway => {
          if (eventConfig.enabledGateways.includes(gateway) && !order.includes(gateway)) {
            order.push(gateway);
          }
        });
      }
      
      // Add remaining enabled gateways
      eventConfig.enabledGateways.forEach(gateway => {
        if (!order.includes(gateway)) {
          order.push(gateway);
        }
      });
      
      return order;
    }

    // Use global configuration
    const order: PaymentGatewayType[] = [];
    
    // Add default gateway first
    if (this.config.enabledGateways.includes(this.config.defaultGateway)) {
      order.push(this.config.defaultGateway);
    }
    
    // Add other enabled gateways
    this.config.enabledGateways.forEach(gateway => {
      if (!order.includes(gateway)) {
        order.push(gateway);
      }
    });
    
    return order;
  }

  /**
   * Log gateway initialization status
   */
  private logGatewayStatus(): void {
    console.group('💳 Payment Gateway Status');
    
    this.config.enabledGateways.forEach(gatewayType => {
      const gateway = this.gateways.get(gatewayType);
      const status = gateway?.isReady() ? '✅ Ready' : '❌ Not Ready';
      console.log(`${gatewayType.toUpperCase()}: ${status}`);
    });
    
    console.log(`Default Gateway: ${this.config.defaultGateway.toUpperCase()}`);
    console.log(`Failover Enabled: ${this.config.enableFailover}`);
    console.groupEnd();
  }

  /**
   * Get gateway health status
   */
  getGatewayHealth(): Record<PaymentGatewayType, boolean> {
    const health: Partial<Record<PaymentGatewayType, boolean>> = {};
    
    this.config.enabledGateways.forEach(gatewayType => {
      const gateway = this.gateways.get(gatewayType);
      health[gatewayType] = gateway?.isReady() || false;
    });
    
    return health as Record<PaymentGatewayType, boolean>;
  }

  /**
   * Check if any gateways are available
   */
  hasAvailableGateways(): boolean {
    return Object.values(this.getGatewayHealth()).some(ready => ready);
  }
}