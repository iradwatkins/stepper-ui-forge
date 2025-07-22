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
      console.log('✅ Square SDK already loaded (cached)');
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
    
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existingScript) {
      console.log('⚡ Square SDK script already exists, waiting for load...');
      // Set up polling to check if Square object appears
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        if (window.Square) {
          clearInterval(checkInterval);
          squareSDKLoaded = true;
          console.log('✅ Square SDK became available');
          resolve();
        } else if (checkCount > 100) { // 10 seconds
          clearInterval(checkInterval);
          reject(new Error('Square SDK script exists but failed to initialize'));
        }
      }, 100);
      return;
    }
    
    // Create script element
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    
    // Add attributes to help with loading
    script.setAttribute('crossorigin', 'anonymous');
    
    // Enhanced logging for debugging
    console.group('🟦 Square SDK Initialization');
    console.log('VITE_SQUARE_ENVIRONMENT:', squareEnvironment);
    console.log('VITE_SQUARE_APP_ID:', import.meta.env.VITE_SQUARE_APP_ID?.substring(0, 15) + '...');
    console.log('VITE_SQUARE_LOCATION_ID:', import.meta.env.VITE_SQUARE_LOCATION_ID);
    console.log('Is Production Mode:', isProduction);
    console.log('Script URL Selected:', scriptUrl);
    console.groupEnd();
    
    // Add timeout for script loading
    const loadTimeout = setTimeout(() => {
      squareSDKPromise = null; // Reset promise so it can be retried
      reject(new Error('Square SDK loading timed out after 30 seconds'));
    }, 30000); // 30 second timeout

    script.onload = () => {
      clearTimeout(loadTimeout);
      // Give Square SDK a moment to initialize
      setTimeout(() => {
        if (window.Square) {
          squareSDKLoaded = true;
          console.log(`✅ Square Web SDK loaded successfully (${isProduction ? 'Production' : 'Sandbox'})`);
          resolve();
        } else {
          squareSDKPromise = null; // Reset promise so it can be retried
          reject(new Error('Square SDK loaded but Square object not available'));
        }
      }, 100);
    };

    script.onerror = (error) => {
      clearTimeout(loadTimeout);
      squareSDKPromise = null; // Reset promise so it can be retried
      console.error('Square SDK loading error:', error);
      reject(new Error('Failed to load Square Web SDK - check network connection'));
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
  
  console.log('🔍 Environment Validation with Vite Variables:', {
    VITE_SQUARE_ENVIRONMENT: squareEnvironment,
    VITE_SQUARE_APP_ID: squareApplicationId?.substring(0, 15) + '...',
  });
  
  // Validate required environment variables are present
  if (!squareApplicationId) {
    throw new Error('VITE_SQUARE_APP_ID is required but not found in environment variables');
  }
  
  console.log('✅ Environment variable validation passed');
  console.log('ℹ️ Cash App Pay uses Square Application ID - no separate client ID needed');
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
  return Square.payments({
    applicationId: squareApplicationId,
    locationId: squareLocationId
  });
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
  // Simple check - no retry loops
  const containerElement = document.getElementById(containerId);
  if (!containerElement) {
    throw new Error(`Container element with ID '${containerId}' not found. Make sure the container exists before calling this function.`);
  }
  
  console.log(`✅ Container element '${containerId}' found`);
  
  const payments = await initializeSquarePayments();
  
  // Create card payment method
  const card = await payments.card();
  
  // Double-check container still exists before attaching
  const finalCheck = document.getElementById(containerId);
  if (!finalCheck) {
    throw new Error(`Container '${containerId}' disappeared before card attachment`);
  }
  
  await card.attach(`#${containerId}`);
  
  console.log(`✅ Square card form attached to #${containerId}`);

  // Try to create Cash App Pay with correct Square Web SDK method
  let cashAppPay: any;
  try {
    // Cash App Pay uses Square Application ID
    const squareEnvironment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
    
    console.log('💳 Cash App Pay Configuration:', {
      uses_square_app_id: true,
      environment: squareEnvironment,
      isProduction: squareEnvironment === 'production'
    });
    
    // Always try to initialize Cash App Pay using Square credentials
    if (true) {
      // Cash App Pay uses Square's environment settings
      
      // Use the correct Square Web SDK method for Cash App Pay
      console.log('🔄 Checking available Square payment methods:', Object.keys(payments));
      
      // Create Cash App Pay according to Square documentation
      try {
        console.log('🔄 Creating PaymentRequest for Cash App Pay...');
        
        // First create the payment request
        const paymentRequest = payments.paymentRequest({
          countryCode: 'US',
          currencyCode: 'USD',
          total: {
            amount: '1.00', // Default amount in dollars, will be updated when actual payment is made
            label: 'Total'
          }
        });
        
        console.log('🔄 Initializing Cash App Pay with PaymentRequest...');
        
        // Initialize Cash App Pay with paymentRequest as first parameter
        cashAppPay = await payments.cashAppPay(paymentRequest, {
          redirectURL: window.location.href,
          referenceId: `cashapp-${Date.now()}`
        });
        
        if (cashAppPay) {
          console.log(`✅ Cash App Pay initialized successfully (${squareEnvironment})`);
          
          // Note: The attach() method should be called where the component is rendered
          // Not here in the SDK initialization
        }
      } catch (error) {
        console.error('❌ Cash App Pay initialization failed:', error);
        // Don't try fallback - if it fails, it means Cash App Pay isn't available
      }
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