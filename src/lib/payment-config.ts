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
  // Force production configuration to fix environment mismatch
  console.log('🔐 FORCING PRODUCTION PAYMENT CONFIG');
  
  const config: PaymentConfig = {
    paypal: {
      clientId: 'AWcmEjsKDeNUzvVQJyvc3lq5n4NXsh7-sHPgGT4ZiPFo8X6csYZcElZg2wsu_xsZE22DUoXOtF3MolVK',
      clientSecret: '',
      environment: 'production',
    },
    square: {
      applicationId: 'sq0idp-XG8irNWHf98C62-iqOwH6Q',
      accessToken: '',
      environment: 'production',
      locationId: 'L0Q2YC1SPBGD8',
    },
    cashapp: {
      clientId: 'sq0idp-XG8irNWHf98C62-iqOwH6Q',
      environment: 'production',
    },
    webhookUrl: 'https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-webhook',
  };

  console.log('🔐 Payment Config Loaded:', {
    paypal_env: config.paypal.environment,
    square_env: config.square.environment,
    cashapp_env: config.cashapp.environment,
    square_app_id: config.square.applicationId.substring(0, 15) + '...',
    cashapp_client_id: config.cashapp.clientId.substring(0, 15) + '...'
  });

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