// Production Payment System
// Simplified payment exports for production mode

export type PaymentGateway = 'paypal' | 'square' | 'cashapp'

export * from './ProductionPaymentService'
export * from './PaymentService'

// Legacy exports for compatibility
export const PaymentManager = null