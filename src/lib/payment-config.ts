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
    clientId: string; // Note: This is the same as Square Application ID
    environment: 'sandbox' | 'production';
  };
  webhookUrl?: string;
}

// Get payment configuration from environment variables
export const getPaymentConfig = (): PaymentConfig => {
  // Get credentials from Vite environment variables
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const squareAppId = import.meta.env.VITE_SQUARE_APP_ID || '';
  const squareLocationId = import.meta.env.VITE_SQUARE_LOCATION_ID || '';
  const squareAccessToken = import.meta.env.VITE_SQUARE_ACCESS_TOKEN || '';
  // Cash App uses Square Application ID - no separate client ID needed
  const cashappClientId = import.meta.env.VITE_CASHAPP_CLIENT_ID || squareAppId;
  
  // Get environment settings from Vite environment variables
  const paypalEnv = import.meta.env.VITE_PAYPAL_ENVIRONMENT || 'sandbox';
  const squareEnv = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
  const cashappEnv = import.meta.env.VITE_CASHAPP_ENVIRONMENT || 'sandbox';
  
  const config: PaymentConfig = {
    paypal: {
      clientId: paypalClientId,
      clientSecret: import.meta.env.VITE_PAYPAL_CLIENT_SECRET || '',
      environment: paypalEnv as 'sandbox' | 'production',
    },
    square: {
      applicationId: squareAppId,
      accessToken: squareAccessToken,
      environment: squareEnv as 'sandbox' | 'production',
      locationId: squareLocationId,
    },
    cashapp: {
      clientId: cashappClientId,
      environment: cashappEnv as 'sandbox' | 'production',
    },
    webhookUrl: import.meta.env.VITE_PAYMENT_WEBHOOK_URL || '',
  };

  console.log('🔐 Payment Config Loaded:', {
    paypal_env: config.paypal.environment,
    square_env: config.square.environment,
    cashapp_env: config.cashapp.environment,
    square_app_id: config.square.applicationId ? config.square.applicationId.substring(0, 15) + '...' : 'NOT SET',
    cashapp_client_id: config.cashapp.clientId ? config.cashapp.clientId.substring(0, 15) + '...' : 'NOT SET',
  });

  // ENHANCED DEBUGGING: Log raw environment variables
  console.log('🔍 VITE ENV VARIABLES:', {
    VITE_SQUARE_ENVIRONMENT: import.meta.env.VITE_SQUARE_ENVIRONMENT,
    VITE_SQUARE_APP_ID: import.meta.env.VITE_SQUARE_APP_ID,
    VITE_SQUARE_LOCATION_ID: import.meta.env.VITE_SQUARE_LOCATION_ID,
    VITE_CASHAPP_ENVIRONMENT: import.meta.env.VITE_CASHAPP_ENVIRONMENT,
    VITE_CASHAPP_CLIENT_ID: import.meta.env.VITE_CASHAPP_CLIENT_ID,
    VITE_MODE: import.meta.env.MODE,
    VITE_DEV: import.meta.env.DEV,
    VITE_PROD: import.meta.env.PROD
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
    missing.push('VITE_SQUARE_APP_ID');
  }
  if (!config.square.accessToken) {
    missing.push('VITE_SQUARE_ACCESS_TOKEN');
  }
  if (!config.square.locationId) {
    missing.push('VITE_SQUARE_LOCATION_ID');
  }

  // Note: Cash App uses Square Application ID, so we don't need to check separately
  // The VITE_CASHAPP_CLIENT_ID is optional and defaults to Square App ID

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