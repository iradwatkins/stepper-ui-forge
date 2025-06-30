// Payment Error Handling Utilities
// Standardized error codes and user-friendly messages

import { PaymentError, PaymentGateway } from './types';

// Standard error codes across all gateways
export const ERROR_CODES = {
  // Validation errors
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  INVALID_EMAIL: 'INVALID_EMAIL',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Payment processing errors
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  CARD_DECLINED: 'CARD_DECLINED',
  EXPIRED_CARD: 'EXPIRED_CARD',
  INVALID_CARD: 'INVALID_CARD',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  
  // Gateway errors
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
  GATEWAY_ERROR: 'GATEWAY_ERROR',
  GATEWAY_UNAVAILABLE: 'GATEWAY_UNAVAILABLE',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  
  // Business logic errors
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',
  REFUND_NOT_ALLOWED: 'REFUND_NOT_ALLOWED',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  
  // Configuration errors
  GATEWAY_NOT_CONFIGURED: 'GATEWAY_NOT_CONFIGURED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

// User-friendly error messages
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.INVALID_AMOUNT]: 'Please enter a valid payment amount.',
  [ERROR_CODES.INVALID_CURRENCY]: 'The selected currency is not supported.',
  [ERROR_CODES.INVALID_EMAIL]: 'Please enter a valid email address.',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
  
  [ERROR_CODES.INSUFFICIENT_FUNDS]: 'Your payment method has insufficient funds.',
  [ERROR_CODES.CARD_DECLINED]: 'Your payment was declined. Please try a different payment method.',
  [ERROR_CODES.EXPIRED_CARD]: 'Your payment method has expired. Please use a different card.',
  [ERROR_CODES.INVALID_CARD]: 'Please check your payment information and try again.',
  [ERROR_CODES.SECURITY_VIOLATION]: 'Your payment was declined for security reasons.',
  
  [ERROR_CODES.GATEWAY_TIMEOUT]: 'Payment processing timed out. Please try again.',
  [ERROR_CODES.GATEWAY_ERROR]: 'Payment processing failed. Please try again.',
  [ERROR_CODES.GATEWAY_UNAVAILABLE]: 'Payment processing is temporarily unavailable.',
  [ERROR_CODES.AUTHENTICATION_FAILED]: 'Payment processing failed. Please try again.',
  
  [ERROR_CODES.DUPLICATE_TRANSACTION]: 'This transaction has already been processed.',
  [ERROR_CODES.REFUND_NOT_ALLOWED]: 'This transaction cannot be refunded.',
  [ERROR_CODES.AMOUNT_MISMATCH]: 'Payment amount does not match the order total.',
  [ERROR_CODES.ORDER_NOT_FOUND]: 'Order not found. Please check your order details.',
  
  [ERROR_CODES.GATEWAY_NOT_CONFIGURED]: 'Payment processing is not properly configured.',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Payment processing configuration error.',
  [ERROR_CODES.UNSUPPORTED_OPERATION]: 'This payment method is not supported.',
  
  [ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [ERROR_CODES.REQUEST_TIMEOUT]: 'Request timed out. Please try again.',
  
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  [ERROR_CODES.INTERNAL_ERROR]: 'Internal error. Please contact support if this persists.'
};

// Gateway-specific error mapping interfaces
interface GatewayErrorMap {
  [gatewayError: string]: {
    code: string;
    retryable: boolean;
    userMessage?: string;
  };
}

// PayPal error mapping
export const PAYPAL_ERROR_MAP: GatewayErrorMap = {
  'INSUFFICIENT_FUNDS': { code: ERROR_CODES.INSUFFICIENT_FUNDS, retryable: false },
  'INSTRUMENT_DECLINED': { code: ERROR_CODES.CARD_DECLINED, retryable: false },
  'PAYER_CANNOT_PAY': { code: ERROR_CODES.INSUFFICIENT_FUNDS, retryable: false },
  'PAYER_ACCOUNT_RESTRICTED': { code: ERROR_CODES.CARD_DECLINED, retryable: false },
  'PAYEE_ACCOUNT_RESTRICTED': { code: ERROR_CODES.GATEWAY_ERROR, retryable: true },
  'INVALID_REQUEST': { code: ERROR_CODES.INVALID_CARD, retryable: false },
  'DUPLICATE_INVOICE_ID': { code: ERROR_CODES.DUPLICATE_TRANSACTION, retryable: false },
  'TIMEOUT': { code: ERROR_CODES.GATEWAY_TIMEOUT, retryable: true },
  'INTERNAL_SERVICE_ERROR': { code: ERROR_CODES.GATEWAY_ERROR, retryable: true }
};

// Square error mapping
export const SQUARE_ERROR_MAP: GatewayErrorMap = {
  'INSUFFICIENT_FUNDS': { code: ERROR_CODES.INSUFFICIENT_FUNDS, retryable: false },
  'CARD_DECLINED': { code: ERROR_CODES.CARD_DECLINED, retryable: false },
  'CVV_FAILURE': { code: ERROR_CODES.SECURITY_VIOLATION, retryable: false },
  'ADDRESS_VERIFICATION_FAILURE': { code: ERROR_CODES.SECURITY_VIOLATION, retryable: false },
  'INVALID_CARD': { code: ERROR_CODES.INVALID_CARD, retryable: false },
  'GENERIC_DECLINE': { code: ERROR_CODES.CARD_DECLINED, retryable: false },
  'TIMEOUT': { code: ERROR_CODES.GATEWAY_TIMEOUT, retryable: true },
  'RATE_LIMITED': { code: ERROR_CODES.GATEWAY_ERROR, retryable: true },
  'INTERNAL_SERVER_ERROR': { code: ERROR_CODES.GATEWAY_ERROR, retryable: true }
};

// Cash App error mapping
export const CASHAPP_ERROR_MAP: GatewayErrorMap = {
  'insufficient_funds': { code: ERROR_CODES.INSUFFICIENT_FUNDS, retryable: false },
  'payment_declined': { code: ERROR_CODES.CARD_DECLINED, retryable: false },
  'invalid_request': { code: ERROR_CODES.INVALID_CARD, retryable: false },
  'timeout': { code: ERROR_CODES.GATEWAY_TIMEOUT, retryable: true },
  'server_error': { code: ERROR_CODES.GATEWAY_ERROR, retryable: true }
};

/**
 * Map gateway-specific error to standardized error
 */
export function mapGatewayError(
  gatewayError: string,
  gateway: PaymentGateway,
  originalError?: any
): PaymentError {
  let errorMap: GatewayErrorMap;
  
  switch (gateway) {
    case 'paypal':
      errorMap = PAYPAL_ERROR_MAP;
      break;
    case 'square':
      errorMap = SQUARE_ERROR_MAP;
      break;
    case 'cashapp':
      errorMap = CASHAPP_ERROR_MAP;
      break;
    default:
      errorMap = {};
  }

  const mappedError = errorMap[gatewayError];
  const code = mappedError?.code || ERROR_CODES.UNKNOWN_ERROR;
  const retryable = mappedError?.retryable ?? true;
  const userMessage = mappedError?.userMessage || ERROR_MESSAGES[code];

  return {
    code,
    message: `Gateway error: ${gatewayError}`,
    gateway,
    originalError,
    retryable,
    userMessage
  };
}

/**
 * Create standardized error from generic error
 */
export function createStandardError(
  error: Error | string,
  gateway: PaymentGateway,
  code: string = ERROR_CODES.UNKNOWN_ERROR,
  retryable: boolean = true
): PaymentError {
  const message = typeof error === 'string' ? error : error.message;
  const originalError = typeof error === 'string' ? undefined : error;

  return {
    code,
    message,
    gateway,
    originalError,
    retryable,
    userMessage: ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: PaymentError): boolean {
  return error.retryable;
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: PaymentError): string {
  return error.userMessage || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
}

/**
 * Log error with sanitized information
 */
export function logPaymentError(error: PaymentError, context?: any): void {
  const logData = {
    code: error.code,
    gateway: error.gateway,
    retryable: error.retryable,
    userMessage: error.userMessage,
    context: context ? sanitizeContext(context) : undefined
  };

  console.error('[Payment Error]', logData);
}

/**
 * Sanitize context for logging (remove sensitive data)
 */
function sanitizeContext(context: any): any {
  if (!context || typeof context !== 'object') {
    return context;
  }

  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential'];
  const sanitized = { ...context };

  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}