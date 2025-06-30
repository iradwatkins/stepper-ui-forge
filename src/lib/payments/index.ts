// Payment System Entry Point
// Exports all payment-related modules and provides main configuration

export * from './types';
export * from './PaymentGateway';
export * from './PaymentManager';
export * from './errors';
export * from './logger';

import { PaymentManager, PaymentManagerConfig } from './PaymentManager';
import { getPaymentConfig } from '../payment-config';
import paymentLogger from './logger';

// Default payment manager configuration
const defaultConfig: PaymentManagerConfig = {
  defaultGateway: 'paypal',
  enabledGateways: ['paypal', 'square', 'cashapp'],
  enableFailover: true,
  maxRetries: 3
};

// Global payment manager instance
let paymentManager: PaymentManager | null = null;

/**
 * Initialize the payment system
 */
export async function initializePaymentSystem(config?: Partial<PaymentManagerConfig>): Promise<PaymentManager> {
  const finalConfig = { ...defaultConfig, ...config };
  
  paymentManager = new PaymentManager(finalConfig);
  
  // Log configuration status
  const paymentConfig = getPaymentConfig();
  paymentLogger.logGatewayConfig('paypal', !!paymentConfig.paypal.clientId, paymentConfig.paypal.environment);
  paymentLogger.logGatewayConfig('square', !!paymentConfig.square.applicationId, paymentConfig.square.environment);
  paymentLogger.logGatewayConfig('cashapp', !!paymentConfig.cashapp.clientId, paymentConfig.cashapp.environment);
  
  // Initialize all gateways
  await paymentManager.initializeGateways();
  
  return paymentManager;
}

/**
 * Get the global payment manager instance
 */
export function getPaymentManager(): PaymentManager {
  if (!paymentManager) {
    throw new Error('Payment system not initialized. Call initializePaymentSystem() first.');
  }
  return paymentManager;
}

/**
 * Check if payment system is initialized
 */
export function isPaymentSystemInitialized(): boolean {
  return paymentManager !== null;
}

/**
 * Reset payment system (useful for testing)
 */
export function resetPaymentSystem(): void {
  paymentManager = null;
}