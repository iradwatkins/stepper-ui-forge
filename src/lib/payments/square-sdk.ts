// Square Web SDK Loader
// Dynamically loads the Square Web SDK for payment processing

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
    script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'; // Use sandbox URL
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.Square) {
        squareSDKLoaded = true;
        console.log('✅ Square Web SDK loaded successfully');
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
 * Initialize Square Payments
 */
export async function initializeSquarePayments(applicationId: string, locationId: string): Promise<any> {
  await loadSquareSDK();
  const Square = getSquareSDK();
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