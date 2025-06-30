// Payment Configuration Management
// Handles gateway configuration and event-specific settings

import { PaymentGateway, EventPaymentConfig } from './types';
import { getPaymentConfig } from '../payment-config';

// Default payment configuration
export const DEFAULT_PAYMENT_CONFIG = {
  enabledGateways: ['paypal', 'square', 'cashapp'] as PaymentGateway[],
  defaultGateway: 'paypal' as PaymentGateway,
  enableFailover: true,
  fees: {
    paypal: { percentage: 2.9, fixed: 0.30 },
    square: { percentage: 2.6, fixed: 0.10 },
    cashapp: { percentage: 2.75, fixed: 0.15 }
  },
  retryDelays: [1000, 2000, 5000], // milliseconds
  timeouts: {
    paypal: 30000,
    square: 25000,
    cashapp: 20000
  }
};

// Event-specific payment configurations
const eventConfigs = new Map<string, EventPaymentConfig>();

/**
 * Set payment configuration for a specific event
 */
export function setEventPaymentConfig(config: EventPaymentConfig): void {
  eventConfigs.set(config.eventId, config);
}

/**
 * Get payment configuration for a specific event
 */
export function getEventPaymentConfig(eventId: string): EventPaymentConfig | null {
  return eventConfigs.get(eventId) || null;
}

/**
 * Remove payment configuration for an event
 */
export function removeEventPaymentConfig(eventId: string): void {
  eventConfigs.delete(eventId);
}

/**
 * Get all event payment configurations
 */
export function getAllEventPaymentConfigs(): EventPaymentConfig[] {
  return Array.from(eventConfigs.values());
}

/**
 * Get enabled gateways for an event (with fallback to global config)
 */
export function getEnabledGateways(eventId?: string): PaymentGateway[] {
  if (eventId) {
    const eventConfig = getEventPaymentConfig(eventId);
    if (eventConfig) {
      return eventConfig.enabledGateways;
    }
  }
  return DEFAULT_PAYMENT_CONFIG.enabledGateways;
}

/**
 * Get preferred gateway for an event
 */
export function getPreferredGateway(eventId?: string): PaymentGateway {
  if (eventId) {
    const eventConfig = getEventPaymentConfig(eventId);
    if (eventConfig?.preferredGateway) {
      return eventConfig.preferredGateway;
    }
  }
  return DEFAULT_PAYMENT_CONFIG.defaultGateway;
}

/**
 * Check if a gateway is enabled for an event
 */
export function isGatewayEnabled(gateway: PaymentGateway, eventId?: string): boolean {
  const enabledGateways = getEnabledGateways(eventId);
  return enabledGateways.includes(gateway);
}

/**
 * Get gateway-specific configuration
 */
export function getGatewayConfig(gateway: PaymentGateway) {
  const config = getPaymentConfig();
  
  switch (gateway) {
    case 'paypal':
      return {
        clientId: config.paypal.clientId,
        environment: config.paypal.environment,
        timeout: DEFAULT_PAYMENT_CONFIG.timeouts.paypal,
        fees: DEFAULT_PAYMENT_CONFIG.fees.paypal
      };
    
    case 'square':
      return {
        applicationId: config.square.applicationId,
        locationId: config.square.locationId,
        environment: config.square.environment,
        timeout: DEFAULT_PAYMENT_CONFIG.timeouts.square,
        fees: DEFAULT_PAYMENT_CONFIG.fees.square
      };
    
    case 'cashapp':
      return {
        clientId: config.cashapp.clientId,
        environment: config.cashapp.environment,
        timeout: DEFAULT_PAYMENT_CONFIG.timeouts.cashapp,
        fees: DEFAULT_PAYMENT_CONFIG.fees.cashapp
      };
    
    default:
      throw new Error(`Unknown gateway: ${gateway}`);
  }
}

/**
 * Calculate fees for a payment amount
 */
export function calculateFees(
  amount: number,
  gateway: PaymentGateway,
  eventId?: string
): { fixed: number; percentage: number; total: number } {
  const eventConfig = eventId ? getEventPaymentConfig(eventId) : null;
  const customFees = eventConfig?.customFees?.[gateway];
  
  const fees = customFees || DEFAULT_PAYMENT_CONFIG.fees[gateway];
  
  const fixed = fees.fixed || 0;
  const percentageAmount = (fees.percentage || 0) * amount / 100;
  const total = fixed + percentageAmount;
  
  return {
    fixed,
    percentage: percentageAmount,
    total
  };
}

/**
 * Get gateway failover order
 */
export function getGatewayFailoverOrder(eventId?: string): PaymentGateway[] {
  const eventConfig = eventId ? getEventPaymentConfig(eventId) : null;
  
  if (eventConfig) {
    const order: PaymentGateway[] = [];
    
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
  
  // Use global default order
  return DEFAULT_PAYMENT_CONFIG.enabledGateways;
}

/**
 * Validate gateway configuration
 */
export function validateGatewayConfig(gateway: PaymentGateway): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const config = getGatewayConfig(gateway);
    
    switch (gateway) {
      case 'paypal':
        if (!config.clientId) {
          errors.push('PayPal client ID is required');
        }
        break;
      
      case 'square':
        if (!config.applicationId) {
          errors.push('Square application ID is required');
        }
        if (!config.locationId) {
          errors.push('Square location ID is required');
        }
        break;
      
      case 'cashapp':
        if (!config.clientId) {
          errors.push('Cash App client ID is required');
        }
        break;
    }
  } catch (error) {
    errors.push(`Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get configuration status for all gateways
 */
export function getGatewayConfigStatus(): Record<PaymentGateway, { configured: boolean; errors: string[] }> {
  const status: Record<string, { configured: boolean; errors: string[] }> = {};
  
  (['paypal', 'square', 'cashapp'] as PaymentGateway[]).forEach(gateway => {
    const validation = validateGatewayConfig(gateway);
    status[gateway] = {
      configured: validation.isValid,
      errors: validation.errors
    };
  });
  
  return status as Record<PaymentGateway, { configured: boolean; errors: string[] }>;
}

/**
 * Create default event payment configuration
 */
export function createDefaultEventConfig(eventId: string): EventPaymentConfig {
  return {
    eventId,
    enabledGateways: DEFAULT_PAYMENT_CONFIG.enabledGateways,
    preferredGateway: DEFAULT_PAYMENT_CONFIG.defaultGateway,
    fallbackGateways: DEFAULT_PAYMENT_CONFIG.enabledGateways.filter(
      gateway => gateway !== DEFAULT_PAYMENT_CONFIG.defaultGateway
    )
  };
}