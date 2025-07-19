// Square Web SDK Loader
// Dynamically loads the Square Web SDK for payment processing

// Square Web SDK Loader

declare global {
  interface Window {
    Square: any;
  }
}

let squareSDKLoaded = false;
let squareSDKPromise: Promise<void> | null = null;

/**
 * Load Square Web SDK with Vite environment variables
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

    // Get environment from Vite environment variables
    const squareEnvironment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
    const isProduction = squareEnvironment === 'production';
    
    // CRITICAL: Dynamic Square SDK URL based on VITE_SQUARE_ENVIRONMENT
    const scriptUrl = isProduction
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';
    
    // Create script element
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    
    // Enhanced logging for debugging
    console.group('🟦 Square SDK Initialization');
    console.log('VITE_SQUARE_ENVIRONMENT:', squareEnvironment);
    console.log('VITE_SQUARE_APPLICATION_ID:', import.meta.env.VITE_SQUARE_APP_ID);
    console.log('VITE_SQUARE_LOCATION_ID:', import.meta.env.VITE_SQUARE_LOCATION_ID);
    console.log('Is Production Mode:', isProduction);
    console.log('Script URL Selected:', scriptUrl);
    
    // CRITICAL DEBUG: Track URL selection logic
    console.log('🔍 URL SELECTION DEBUG:', {
      viteEnvironment: squareEnvironment,
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
 * Validate environment configuration using Vite environment variables
 */
function validateEnvironmentConfiguration(): void {
  const squareApplicationId = import.meta.env.VITE_SQUARE_APP_ID;
  const squareEnvironment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
  const cashAppClientId = import.meta.env.VITE_CASHAPP_CLIENT_ID;
  const cashAppEnvironment = import.meta.env.VITE_CASHAPP_ENVIRONMENT || 'sandbox';
  
  console.log('🔍 Environment Validation with Vite Variables:', {
    VITE_SQUARE_ENVIRONMENT: squareEnvironment,
    VITE_SQUARE_APP_ID: squareApplicationId?.substring(0, 15) + '...',
    VITE_CASHAPP_ENVIRONMENT: cashAppEnvironment,
    VITE_CASHAPP_CLIENT_ID: cashAppClientId?.substring(0, 15) + '...',
  });
  
  // Validate required environment variables are present
  if (!squareApplicationId) {
    throw new Error('VITE_SQUARE_APP_ID is required but not found in environment variables');
  }
  
  if (!cashAppClientId) {
    console.warn('VITE_CASHAPP_CLIENT_ID not found - Cash App Pay will be disabled');
  }
  
  console.log('✅ Environment variable validation passed');
}

/**
 * Initialize Square Payments with Vite environment variables
 */
export async function initializeSquarePayments(): Promise<any> {
  // Validate environment configuration first
  validateEnvironmentConfiguration();
  
  await loadSquareSDK();
  const Square = getSquareSDK();
  
  // Get credentials from Vite environment variables
  const squareApplicationId = import.meta.env.VITE_SQUARE_APP_ID;
  const squareLocationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
  
  if (!squareApplicationId || !squareLocationId) {
    throw new Error('Missing required Square configuration: VITE_SQUARE_APP_ID and VITE_SQUARE_LOCATION_ID');
  }
  
  console.log('✅ Square Payments initialized with Vite environment variables');
  return Square.payments(squareApplicationId, squareLocationId);
}

/**
 * Create payment form with Square using Vite environment variables
 */
export async function createSquarePaymentForm(
  containerId: string
): Promise<{
  payments: any;
  card: any;
  cashAppPay?: any;
}> {
  // Verify DOM element exists before proceeding
  const containerElement = document.getElementById(containerId);
  if (!containerElement) {
    throw new Error(`Element with ID '${containerId}' not found in DOM. Make sure the container exists before initializing Square payments.`);
  }
  
  console.log(`✅ Container element '${containerId}' found in DOM`);
  
  const payments = await initializeSquarePayments();
  
  // Create card payment method
  const card = await payments.card();
  await card.attach(`#${containerId}`);
  
  console.log(`✅ Square card form attached to #${containerId}`);

  // Try to create Cash App Pay with environment configuration
  let cashAppPay: any;
  try {
    const cashAppClientId = import.meta.env.VITE_CASHAPP_CLIENT_ID;
    const cashAppEnvironment = import.meta.env.VITE_CASHAPP_ENVIRONMENT || 'sandbox';
    
    console.log('💳 Cash App Pay Configuration:', {
      clientId: cashAppClientId?.substring(0, 15) + '...',
      environment: cashAppEnvironment,
      isProduction: cashAppEnvironment === 'production'
    });
    
    if (cashAppClientId) {
      // Skip Cash App initialization if environment mismatch is detected
      const isProductionEnv = cashAppEnvironment === 'production';
      const isProductionClientId = cashAppClientId.startsWith('sq0idp-') && !cashAppClientId.includes('sandbox');
      
      if (isProductionEnv && !isProductionClientId) {
        console.error('❌ Cash App Environment Mismatch: Production environment requires production client ID');
        throw new Error('Cash App configuration error: Production environment detected but client ID may be incorrect. Please verify VITE_CASHAPP_CLIENT_ID and VITE_CASHAPP_ENVIRONMENT settings.');
      }
      
      if (!isProductionEnv && isProductionClientId) {
        console.error('❌ Cash App Environment Mismatch: Sandbox environment with production client ID');
        throw new Error('Cash App configuration error: Sandbox environment detected but production client ID provided. Please verify VITE_CASHAPP_CLIENT_ID and VITE_CASHAPP_ENVIRONMENT settings.');
      }
      
      cashAppPay = await payments.cashAppPay({
        redirectURL: window.location.origin,
        referenceId: `cashapp-${Date.now()}`
        // Note: environment parameter removed as it may not be supported in this context
      });
      console.log(`✅ Cash App Pay initialized successfully (${cashAppEnvironment})`);
    } else {
      console.warn('⚠️ Cash App Pay disabled - VITE_CASHAPP_CLIENT_ID not configured');
    }
  } catch (error) {
    console.error('❌ Cash App Pay initialization failed:', error);
    // Don't throw here - allow the component to work with just card payments
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