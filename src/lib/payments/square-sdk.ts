// Square Web SDK Loader
// Dynamically loads the Square Web SDK for payment processing

import { getPaymentConfig } from '../payment-config';

declare global {
  interface Window {
    Square: any;
  }
}

let squareSDKLoaded = false;
let squareSDKPromise: Promise<void> | null = null;

/**
 * Load Square Web SDK
 */
export function loadSquareSDK(): Promise<void> {
  if (squareSDKLoaded) {
    return Promise.resolve();
  }

  if (squareSDKPromise) {
    return squareSDKPromise;
  }

  squareSDKPromise = new Promise((resolve, reject) => {
    // Check if Square is already loaded
    if (window.Square) {
      squareSDKLoaded = true;
      resolve();
      return;
    }

    // Create script element
    const script = document.createElement('script');
    // Use production or sandbox URL based on environment
    const paymentConfig = getPaymentConfig();
    const isProduction = paymentConfig.square.environment === 'production';
    
    // CRITICAL: Ensure SDK URL matches the environment to prevent mismatch errors
    const scriptUrl = isProduction 
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';
    
    // Add cache busting and runtime logging
    const cacheBuster = `?t=${Date.now()}`;
    script.src = scriptUrl + cacheBuster;
    script.async = true;
    script.defer = true;
    
    // Enhanced logging for debugging
    console.group('🟦 Square SDK Initialization');
    console.log('Environment Config:', paymentConfig.square.environment);
    console.log('Is Production Mode:', isProduction);
    console.log('Application ID:', paymentConfig.square.applicationId);
    console.log('Location ID:', paymentConfig.square.locationId);
    console.log('Script URL Selected:', scriptUrl);
    console.log('Full Script SRC with cache buster:', script.src);
    
    // CRITICAL DEBUG: Track URL selection logic
    console.log('🔍 URL SELECTION DEBUG:', {
      configEnvironment: paymentConfig.square.environment,
      isProductionBool: isProduction,
      expectedURL: isProduction ? 'web.squarecdn.com' : 'sandbox.web.squarecdn.com',
      actualURL: scriptUrl,
      urlMatch: scriptUrl.includes(isProduction ? 'web.squarecdn.com' : 'sandbox.web.squarecdn.com')
    });
    
    console.groupEnd();

    script.onload = () => {
      if (window.Square) {
        squareSDKLoaded = true;
        console.log(`✅ Square Web SDK loaded successfully (${isProduction ? 'Production' : 'Sandbox'})`);
        resolve();
      } else {
        reject(new Error('Square SDK loaded but Square object not available'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Square Web SDK'));
    };

    // Add script to document head
    document.head.appendChild(script);
  });

  return squareSDKPromise;
}

/**
 * Check if Square SDK is loaded
 */
export function isSquareSDKLoaded(): boolean {
  return squareSDKLoaded && !!window.Square;
}

/**
 * Get Square Web SDK instance
 */
export function getSquareSDK(): any {
  if (!isSquareSDKLoaded()) {
    throw new Error('Square SDK not loaded. Call loadSquareSDK() first.');
  }
  return window.Square;
}

/**
 * Validate environment configuration before initialization
 */
function validateEnvironmentConfiguration(applicationId: string): void {
  const config = getPaymentConfig();
  const isProduction = config.square.environment === 'production';
  const isProductionAppId = applicationId.startsWith('sq0idp-') && !applicationId.includes('sandbox');
  const isSandboxAppId = applicationId.includes('sandbox') || applicationId.startsWith('sandbox-');
  
  console.log('🔍 Square Environment Validation:', {
    configEnvironment: config.square.environment,
    isProduction,
    applicationId: applicationId.substring(0, 15) + '...',
    isProductionAppId,
    isSandboxAppId,
    sdkUrl: isProduction ? 'PRODUCTION' : 'SANDBOX'
  });
  
  // Fail-fast validation with enhanced error messages
  if (isProduction && !isProductionAppId) {
    console.error('❌ Square Environment Mismatch: Production environment configured but sandbox Application ID detected');
    throw new Error(`Square Environment Mismatch: Configuration is set to production but Application ID appears to be for sandbox. Please check VITE_SQUARE_APPLICATION_ID.`);
  }
  
  if (!isProduction && isProductionAppId) {
    console.error('❌ Square Environment Mismatch: Sandbox environment configured but production Application ID detected');
    throw new Error(`Square Environment Mismatch: Configuration is set to sandbox but Application ID appears to be for production. Please check VITE_SQUARE_ENVIRONMENT.`);
  }
  
  console.log('✅ Square environment validation passed');
}

/**
 * Initialize Square Payments
 */
export async function initializeSquarePayments(applicationId: string, locationId: string): Promise<any> {
  // Validate environment configuration first
  validateEnvironmentConfiguration(applicationId);
  
  await loadSquareSDK();
  const Square = getSquareSDK();
  
  console.log('✅ Square Payments initialized with validated configuration');
  return Square.payments(applicationId, locationId);
}

/**
 * Create payment form with Square
 */
export async function createSquarePaymentForm(
  applicationId: string,
  locationId: string,
  containerId: string
): Promise<{
  payments: any;
  card: any;
  cashAppPay?: any;
}> {
  const payments = await initializeSquarePayments(applicationId, locationId);
  
  // Create card payment method
  const card = await payments.card();
  await card.attach(`#${containerId}`);

  // Try to create Cash App Pay (may not be available in all environments)
  let cashAppPay;
  try {
    cashAppPay = await payments.cashAppPay({
      redirectURL: window.location.origin,
      referenceId: `cashapp-${Date.now()}`
    });
  } catch (error) {
    console.warn('Cash App Pay not available:', error);
  }

  return {
    payments,
    card,
    cashAppPay
  };
}

/**
 * Tokenize payment method
 */
export async function tokenizePayment(paymentMethod: any): Promise<any> {
  const tokenResult = await paymentMethod.tokenize();
  
  if (tokenResult.status === 'OK') {
    return tokenResult.token;
  } else {
    throw new Error(`Tokenization failed: ${tokenResult.errors?.[0]?.message || 'Unknown error'}`);
  }
}