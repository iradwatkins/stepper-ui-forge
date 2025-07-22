// Emergency Payment Manager - Alternative implementation without binding issues
import { SQUARE_PRODUCTION_CONFIG, validateSquareConfig } from './squareConfig';

declare global {
  interface Window {
    Square: any;
    __emergencySquarePayments?: any;
  }
}

// Store the payments instance globally to avoid singleton issues
let globalPaymentsInstance: any = null;
let isInitializing = false;

export async function getSquarePayments() {
  // Return cached instance if available
  if (globalPaymentsInstance) {
    console.log('[EmergencyManager] Returning cached payments instance');
    return globalPaymentsInstance;
  }

  // Wait if already initializing
  if (isInitializing) {
    console.log('[EmergencyManager] Already initializing, waiting...');
    let attempts = 0;
    while (isInitializing && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (globalPaymentsInstance) {
      return globalPaymentsInstance;
    }
  }

  isInitializing = true;

  try {
    // Validate config
    validateSquareConfig();
    
    // Ensure SDK is loaded
    await ensureSquareSDKLoaded();
    
    const { applicationId, locationId } = SQUARE_PRODUCTION_CONFIG;
    
    console.log('[EmergencyManager] Initializing Square with:', {
      appId: applicationId.substring(0, 15) + '...',
      locationId
    });
    
    // Initialize payments
    globalPaymentsInstance = window.Square.payments({
      applicationId,
      locationId
    });
    
    // Also store on window for debugging
    window.__emergencySquarePayments = globalPaymentsInstance;
    
    console.log('[EmergencyManager] Square initialized successfully');
    return globalPaymentsInstance;
    
  } catch (error) {
    console.error('[EmergencyManager] Initialization failed:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

async function ensureSquareSDKLoaded(): Promise<void> {
  if (window.Square) {
    console.log('[EmergencyManager] Square SDK already loaded');
    return;
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://web.squarecdn.com/v1/square.js';
    script.async = true;
    
    const timeout = setTimeout(() => {
      reject(new Error('Square SDK loading timeout'));
    }, 10000);
    
    script.onload = () => {
      clearTimeout(timeout);
      if (window.Square) {
        console.log('[EmergencyManager] Square SDK loaded');
        resolve();
      } else {
        reject(new Error('Square SDK loaded but not available'));
      }
    };
    
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load Square SDK'));
    };
    
    document.head.appendChild(script);
  });
}

export async function createSquareCard() {
  try {
    const payments = await getSquarePayments();
    if (!payments) {
      throw new Error('Square payments not available');
    }
    return payments.card();
  } catch (error) {
    console.error('[EmergencyManager] createSquareCard error:', error);
    throw error;
  }
}

export async function createSquareCashAppPay(amount: number, orderId: string) {
  try {
    const payments = await getSquarePayments();
    if (!payments) {
      throw new Error('Square payments not available');
    }
    
    const paymentRequest = payments.paymentRequest({
      countryCode: 'US',
      currencyCode: 'USD',
      total: {
        amount: amount.toFixed(2),
        label: 'Total',
      }
    });

    return payments.cashAppPay(paymentRequest, {
      redirectURL: window.location.href,
      referenceId: orderId
    });
  } catch (error) {
    console.error('[EmergencyManager] createSquareCashAppPay error:', error);
    throw error;
  }
}