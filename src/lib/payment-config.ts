// Payment Gateway Configuration
// This file centralizes all payment gateway settings and tokens

export interface PaymentConfig {
  paypal: {
    clientId: string;
    clientSecret?: string;
    environment: 'sandbox' | 'production';
  };
  square: {
    applicationId: string;
    accessToken: string;
    environment: 'sandbox' | 'production';
    locationId: string;
  };
  cashapp: {
    clientId: string;
    environment: 'sandbox' | 'production';
  };
  webhookUrl?: string;
}

// Get payment configuration from environment variables
export const getPaymentConfig = (): PaymentConfig => {
  // Debug logging to see what environment variables are loaded
  console.log('🔍 Environment Variables Debug:', {
    VITE_SQUARE_ENVIRONMENT: import.meta.env.VITE_SQUARE_ENVIRONMENT,
    VITE_SQUARE_APPLICATION_ID: import.meta.env.VITE_SQUARE_APPLICATION_ID?.substring(0, 15) + '...',
    VITE_CASHAPP_ENVIRONMENT: import.meta.env.VITE_CASHAPP_ENVIRONMENT,
    VITE_CASHAPP_CLIENT_ID: import.meta.env.VITE_CASHAPP_CLIENT_ID?.substring(0, 15) + '...',
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE
  });

  const config: PaymentConfig = {
    paypal: {
      clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_PAYPAL_CLIENT_SECRET || '',
      environment: (import.meta.env.VITE_PAYPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    },
    square: {
      applicationId: import.meta.env.VITE_SQUARE_APPLICATION_ID || 'sq0idp-XG8irNWHf98C62-iqOwH6Q',
      accessToken: import.meta.env.VITE_SQUARE_ACCESS_TOKEN || '',
      environment: (import.meta.env.VITE_SQUARE_ENVIRONMENT as 'sandbox' | 'production') || 'production',
      locationId: import.meta.env.VITE_SQUARE_LOCATION_ID || 'L0Q2YC1SPBGD8',
    },
    cashapp: {
      clientId: import.meta.env.VITE_CASHAPP_CLIENT_ID || 'sq0idp-XG8irNWHf98C62-iqOwH6Q',
      environment: (import.meta.env.VITE_CASHAPP_ENVIRONMENT as 'sandbox' | 'production') || 'production',
    },
    webhookUrl: import.meta.env.VITE_PAYMENT_WEBHOOK_URL,
  };

  return config;
};

// Validate that required payment credentials are present
export const validatePaymentConfig = (): { isValid: boolean; missing: string[] } => {
  const config = getPaymentConfig();
  const missing: string[] = [];

  // Check PayPal
  if (!config.paypal.clientId) {
    missing.push('VITE_PAYPAL_CLIENT_ID');
  }

  // Check Square
  if (!config.square.applicationId) {
    missing.push('VITE_SQUARE_APPLICATION_ID');
  }
  if (!config.square.accessToken) {
    missing.push('VITE_SQUARE_ACCESS_TOKEN');
  }
  if (!config.square.locationId) {
    missing.push('VITE_SQUARE_LOCATION_ID');
  }

  // Check Cash App
  if (!config.cashapp.clientId) {
    missing.push('VITE_CASHAPP_CLIENT_ID');
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
};

// Get PayPal SDK options
export const getPayPalOptions = () => {
  const config = getPaymentConfig();
  return {
    'client-id': config.paypal.clientId,
    currency: 'USD',
    intent: 'capture',
    'data-client-token': config.paypal.clientSecret,
  };
};

// Get Square payment form options
export const getSquareOptions = () => {
  const config = getPaymentConfig();
  return {
    applicationId: config.square.applicationId,
    locationId: config.square.locationId,
    environment: config.square.environment,
  };
};

// Development mode detection
export const isDevelopment = () => {
  return import.meta.env.DEV;
};

// Log payment configuration status (without exposing secrets)
export const logPaymentStatus = () => {
  if (isDevelopment()) {
    const validation = validatePaymentConfig();
    const config = getPaymentConfig();
    
    console.group('🔐 Payment Gateway Configuration');
    console.log('PayPal Environment:', config.paypal.environment);
    console.log('Square Environment:', config.square.environment);
    console.log('Cash App Environment:', config.cashapp.environment);
    console.log('Configuration Valid:', validation.isValid);
    
    if (!validation.isValid) {
      console.warn('Missing Environment Variables:', validation.missing);
    }
    
    console.groupEnd();
  }
};