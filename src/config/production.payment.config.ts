// ==========================================
// CENTRALIZED PRODUCTION PAYMENT CONFIGURATION
// ==========================================

/**
 * Production payment credentials with fallback values
 * This ensures the payment system works even if environment variables fail to load
 */

// Production credentials - hardcoded as fallback
const PRODUCTION_CREDENTIALS = {
  square: {
    // Note: Square production app IDs must be exactly 29 characters and start with 'sq0idp-'
    appId: 'sq0idp-XG8irNWHf98C62-iqOwH6Q',
    locationId: 'L0Q2YC1SPBGD8',
    environment: 'production' as const
  },
  paypal: {
    clientId: 'AWcmEjsKDeNUzvVQJyvc3lq5n4NXsh7-sHPgGT4ZiPFo8X6csYZcElZg2wsu_xsZE22DUoXOtF3MolVK',
    environment: 'production' as const
  },
  cashapp: {
    // Cash App uses Square credentials
    environment: 'production' as const
  }
};

/**
 * Get Square configuration with environment variable fallback
 */
export function getSquareConfig() {
  // Try to get from environment variables first
  const envAppId = import.meta.env?.VITE_SQUARE_APP_ID;
  const envLocationId = import.meta.env?.VITE_SQUARE_LOCATION_ID;
  const envEnvironment = import.meta.env?.VITE_SQUARE_ENVIRONMENT;

  // Use env vars if available and valid, otherwise use hardcoded values
  const appId = (envAppId && envAppId !== 'false' && envAppId !== 'undefined') 
    ? envAppId 
    : PRODUCTION_CREDENTIALS.square.appId;
    
  const locationId = (envLocationId && envLocationId !== 'false' && envLocationId !== 'undefined') 
    ? envLocationId 
    : PRODUCTION_CREDENTIALS.square.locationId;
    
  const environment = (envEnvironment && envEnvironment !== 'false' && envEnvironment !== 'undefined')
    ? envEnvironment as 'production' | 'sandbox'
    : PRODUCTION_CREDENTIALS.square.environment;

  // Debug logging
  if (import.meta.env?.DEV) {
    console.log('🔐 Square Config:', {
      source: envAppId ? 'environment' : 'hardcoded',
      appId: appId.substring(0, 15) + '...',
      locationId: locationId,
      environment: environment,
      envVarsFound: {
        appId: !!envAppId,
        locationId: !!envLocationId,
        environment: !!envEnvironment
      }
    });
  }

  // Validate production credentials
  if (!appId.startsWith('sq0idp-')) {
    console.warn('⚠️ Square App ID does not appear to be a production ID');
  }

  return {
    appId,
    locationId,
    environment
  };
}

/**
 * Get PayPal configuration with environment variable fallback
 */
export function getPayPalConfig() {
  const envClientId = import.meta.env?.VITE_PAYPAL_CLIENT_ID;
  const envEnvironment = import.meta.env?.VITE_PAYPAL_ENVIRONMENT;

  const clientId = (envClientId && envClientId !== 'false' && envClientId !== 'undefined')
    ? envClientId
    : PRODUCTION_CREDENTIALS.paypal.clientId;
    
  const environment = (envEnvironment && envEnvironment !== 'false' && envEnvironment !== 'undefined')
    ? envEnvironment as 'production' | 'sandbox'
    : PRODUCTION_CREDENTIALS.paypal.environment;

  return {
    clientId,
    environment
  };
}

/**
 * Get all payment configuration
 */
export function getPaymentConfig() {
  const square = getSquareConfig();
  const paypal = getPayPalConfig();

  return {
    square,
    paypal,
    cashapp: {
      ...PRODUCTION_CREDENTIALS.cashapp,
      // Cash App uses Square credentials
      appId: square.appId,
      locationId: square.locationId
    },
    isProduction: square.environment === 'production',
    configSource: {
      square: import.meta.env?.VITE_SQUARE_APP_ID ? 'environment' : 'hardcoded',
      paypal: import.meta.env?.VITE_PAYPAL_CLIENT_ID ? 'environment' : 'hardcoded'
    }
  };
}

/**
 * Validate that all required payment credentials are available
 */
export function validatePaymentConfig() {
  const config = getPaymentConfig();
  const errors: string[] = [];

  if (!config.square.appId) {
    errors.push('Square App ID is missing');
  }
  if (!config.square.locationId) {
    errors.push('Square Location ID is missing');
  }
  if (!config.paypal.clientId) {
    errors.push('PayPal Client ID is missing');
  }

  return {
    isValid: errors.length === 0,
    errors,
    config
  };
}

/**
 * Debug function to log all payment configuration
 */
export function debugPaymentConfig() {
  const config = getPaymentConfig();
  const validation = validatePaymentConfig();

  console.group('💳 Payment Configuration Debug');
  console.log('Square:', {
    appId: config.square.appId.substring(0, 20) + '...',
    locationId: config.square.locationId,
    environment: config.square.environment,
    source: config.configSource.square
  });
  console.log('PayPal:', {
    clientId: config.paypal.clientId.substring(0, 20) + '...',
    environment: config.paypal.environment,
    source: config.configSource.paypal
  });
  console.log('Validation:', {
    isValid: validation.isValid,
    errors: validation.errors
  });
  console.log('Environment Variables:', {
    VITE_SQUARE_APP_ID: import.meta.env?.VITE_SQUARE_APP_ID || 'NOT SET',
    VITE_SQUARE_LOCATION_ID: import.meta.env?.VITE_SQUARE_LOCATION_ID || 'NOT SET',
    VITE_PAYPAL_CLIENT_ID: import.meta.env?.VITE_PAYPAL_CLIENT_ID || 'NOT SET'
  });
  console.groupEnd();
}

// Export for easy access
export const PRODUCTION_SQUARE_CONFIG = PRODUCTION_CREDENTIALS.square;
export const PRODUCTION_PAYPAL_CONFIG = PRODUCTION_CREDENTIALS.paypal;