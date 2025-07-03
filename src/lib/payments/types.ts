// Payment Gateway Abstraction Types
// Standardized types for all payment gateways

export type PaymentGateway = 'paypal' | 'square' | 'cashapp';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD';

// Standard payment request structure
export interface PaymentRequest {
  amount: number;
  currency: Currency;
  orderId: string;
  description: string;
  customerEmail: string;
  customerName?: string;
  gatewayType: PaymentGateway;
  sourceId?: string;
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

// Standard payment response structure
export interface PaymentResponse {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  gateway: PaymentGateway;
  gatewayTransactionId?: string;
  paidAt?: Date;
  rawResponse?: any; // Gateway-specific response data
  metadata?: Record<string, any>;
}

// Standard error structure
export interface PaymentError {
  code: string;
  message: string;
  gateway: PaymentGateway;
  originalError?: any;
  retryable: boolean;
  userMessage: string; // User-friendly error message
}

// Payment method information
export interface PaymentMethod {
  id: string;
  type: PaymentGateway;
  gateway: PaymentGateway;
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
  supportedCurrencies: Currency[];
  fees?: {
    fixed?: number;
    percentage?: number;
  };
  minAmount?: number;
  maxAmount?: number;
}

// Refund request structure
export interface RefundRequest {
  paymentId: string;
  transactionId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
}

// Refund response structure
export interface RefundResponse {
  success: boolean;
  refundId: string;
  transactionId: string;
  amount: number;
  currency?: Currency;
  status: PaymentStatus;
  gateway?: PaymentGateway;
  error?: string;
  refundedAt?: Date;
  gatewayResponse?: any;
}

// Webhook payload structure
export interface WebhookPayload {
  gateway: PaymentGateway;
  eventType: string;
  transactionId?: string;
  status?: PaymentStatus;
  data: any;
  timestamp: Date;
  signature?: string;
}

// Gateway configuration per event
export interface EventPaymentConfig {
  eventId: string;
  enabledGateways: PaymentGateway[];
  preferredGateway?: PaymentGateway;
  fallbackGateways?: PaymentGateway[];
  customFees?: Record<PaymentGateway, { fixed?: number; percentage?: number }>;
}

// Payment gateway initialization options
export interface GatewayInitOptions {
  environment: 'sandbox' | 'production';
  credentials: Record<string, string>;
  webhookUrl?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

// Payment processing result
export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  status?: PaymentStatus;
  amount?: number;
  currency?: Currency;
  gatewayType: PaymentGateway;
  payment?: PaymentResponse;
  error?: string | PaymentError;
  requiresAction?: boolean; // For 3D Secure, additional verification
  actionUrl?: string;
  redirectUrl?: string;
  gatewayResponse?: any;
}