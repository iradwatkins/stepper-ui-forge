export interface PaymentError {
  type: 'validation' | 'network' | 'gateway' | 'browser' | 'unknown';
  message: string;
  originalError?: any;
  userMessage: string;
  suggestedAction?: string;
}

export const handlePaymentError = (error: any): PaymentError => {
  // Browser extension interference
  if (error.message?.includes('Could not establish connection') || 
      error.message?.includes('Receiving end does not exist')) {
    return {
      type: 'browser',
      message: 'Browser extension interference detected',
      originalError: error,
      userMessage: 'Please disable browser extensions and try again',
      suggestedAction: 'disable_extensions'
    };
  }

  // Network errors
  if (error.message?.includes('network') || 
      error.message?.includes('fetch') ||
      error.message?.includes('timeout')) {
    return {
      type: 'network',
      message: 'Network connection issue',
      originalError: error,
      userMessage: 'Please check your internet connection and try again',
      suggestedAction: 'check_network'
    };
  }

  // Square-specific errors
  if (error.message?.includes('Square') || 
      error.message?.includes('SqPaymentForm')) {
    return {
      type: 'gateway',
      message: 'Square payment system error',
      originalError: error,
      userMessage: 'Payment system temporarily unavailable. Please try again in a moment.',
      suggestedAction: 'retry_later'
    };
  }

  // Container/DOM errors
  if (error.message?.includes('Container') || 
      error.message?.includes('Element') ||
      error.message?.includes('attach')) {
    return {
      type: 'validation',
      message: 'Payment form initialization error',
      originalError: error,
      userMessage: 'Please refresh the page and try again',
      suggestedAction: 'refresh_page'
    };
  }

  // Default error
  return {
    type: 'unknown',
    message: error.message || 'Unknown error occurred',
    originalError: error,
    userMessage: 'An unexpected error occurred. Please try again.',
    suggestedAction: 'retry'
  };
};

export const getRetryDelay = (attemptNumber: number): number => {
  // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
  return Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000);
};

export const shouldRetry = (error: PaymentError, attemptNumber: number): boolean => {
  // Don't retry more than 3 times
  if (attemptNumber >= 3) return false;

  // Don't retry validation errors
  if (error.type === 'validation') return false;

  // Don't retry browser extension errors
  if (error.type === 'browser') return false;

  // Retry network and gateway errors
  return ['network', 'gateway', 'unknown'].includes(error.type);
};