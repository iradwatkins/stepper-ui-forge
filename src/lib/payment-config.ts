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
    // Cash App Pay uses Square Application ID - no separate client ID needed
    environment: 'sandbox' | 'production';
  };
  webhookUrl?: string;
}

// Get payment configuration from environment variables
export const getPaymentConfig = (): PaymentConfig => {
  // Get PUBLIC credentials from Vite environment variables
  // NEVER expose server-side secrets to the client!
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const squareAppId = import.meta.env.VITE_SQUARE_APP_ID || '';
  const squareLocationId = import.meta.env.VITE_SQUARE_LOCATION_ID || '';
  
  // Get environment settings from Vite environment variables
  const paypalEnv = import.meta.env.VITE_PAYPAL_ENVIRONMENT || 'sandbox';
  const squareEnv = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
  const cashappEnv = squareEnv; // Cash App uses the same environment as Square
  
  const config: PaymentConfig = {
    paypal: {
      clientId: paypalClientId,
      // clientSecret should NEVER be exposed to client - handle server-side only
      environment: paypalEnv as 'sandbox' | 'production',
    },
    square: {
      applicationId: squareAppId,
      // accessToken should NEVER be exposed to client - handle server-side only
      accessToken: '', // This will be handled by edge functions
      environment: squareEnv as 'sandbox' | 'production',
      locationId: squareLocationId,
    },
    cashapp: {
      // Cash App Pay uses Square credentials
      environment: cashappEnv as 'sandbox' | 'production',
    },
    webhookUrl: import.meta.env.VITE_PAYMENT_WEBHOOK_URL || '',
  };

  // Only log non-sensitive configuration status in development
  if (import.meta.env.DEV) {
    console.log('🔐 Payment Config Status:', {
      paypal_configured: !!paypalClientId,
      square_configured: !!squareAppId && !!squareLocationId,
      environment: import.meta.env.MODE,
    });
  }

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

  // Check Square (only client-side credentials)
  if (!config.square.applicationId) {
    missing.push('VITE_SQUARE_APP_ID');
  }
  if (!config.square.locationId) {
    missing.push('VITE_SQUARE_LOCATION_ID');
  }
  // Note: accessToken is server-side only and should not be validated on client

  // Cash App uses Square Application ID directly - no separate validation needed

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