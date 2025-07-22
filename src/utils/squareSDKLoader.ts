/**
 * Centralized Square SDK loader to ensure consistent SDK loading across all components
 * This prevents conflicts between sandbox and production SDK versions
 */

import { getSquareConfig } from '@/config/production.payment.config';

declare global {
  interface Window {
    Square: any;
    __squareSDKLoadPromise?: Promise<void>;
  }
}

/**
 * Load the Square Web SDK based on the environment configuration
 * This function ensures only one SDK version is loaded and cached
 */
export async function loadSquareSDK(): Promise<void> {
  // Return existing promise if SDK is already being loaded
  if (window.__squareSDKLoadPromise) {
    return window.__squareSDKLoadPromise;
  }

  // Check if SDK is already loaded
  if (window.Square) {
    return Promise.resolve();
  }

  // Create and cache the loading promise
  window.__squareSDKLoadPromise = new Promise<void>((resolve, reject) => {
    // Always use production SDK URL - the environment is determined by the credentials used
    // Square's SDK automatically handles sandbox vs production based on the application ID
    const sdkUrl = 'https://web.squarecdn.com/v1/square.js';

    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${sdkUrl}"]`);
    if (existingScript) {
      // Wait for existing script to load
      existingScript.addEventListener('load', () => {
        if (window.Square) {
          resolve();
        } else {
          reject(new Error('Square SDK loaded but not initialized'));
        }
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load Square SDK'));
      });
      return;
    }

    // Create new script element
    const script = document.createElement('script');
    script.src = sdkUrl;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.Square) {
        console.log('✅ Square SDK loaded successfully');
        resolve();
      } else {
        reject(new Error('Square SDK loaded but not initialized'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Square SDK'));
    };

    document.head.appendChild(script);
  });

  return window.__squareSDKLoadPromise;
}

/**
 * Initialize Square payments instance with proper configuration
 */
export async function initializeSquarePayments() {
  // Ensure SDK is loaded
  await loadSquareSDK();

  // Get configuration with fallback values
  const config = getSquareConfig();
  const { appId, locationId } = config;

  // Validate application ID format
  if (!appId || !locationId) {
    throw new Error('Square configuration missing: Please check your environment variables');
  }

  // Validate production format
  if (!appId.startsWith('sq0idp-')) {
    console.error('[squareSDKLoader] Invalid application ID format:', {
      appId: appId,
      expectedFormat: 'sq0idp-XXXXXXXXXXXXXXXXXXXX',
      isProduction: appId.startsWith('sq0idp-'),
      isSandbox: appId.includes('sandbox') || appId.startsWith('sq0idb-')
    });
    throw new Error(`Invalid Square application ID format. Production IDs must start with 'sq0idp-'. Got: ${appId}`);
  }

  // Validate length
  if (appId.length !== 29) {
    console.error('[squareSDKLoader] Invalid application ID length:', {
      appId: appId,
      length: appId.length,
      expectedLength: 29
    });
    throw new Error(`Invalid Square application ID length. Expected 29 characters, got ${appId.length}`);
  }

  console.log('[squareSDKLoader] Initializing with validated config:', {
    appIdPrefix: appId.substring(0, 7),
    appIdLength: appId.length,
    locationId: locationId,
    source: import.meta.env.VITE_SQUARE_APP_ID ? 'environment' : 'hardcoded fallback'
  });

  try {
    // Initialize with proper object format
    // Square SDK requires exact parameter names
    const payments = window.Square.payments({
      applicationId: appId,
      locationId: locationId
    });
    
    console.log('[squareSDKLoader] Square payments initialized successfully');
    return payments;
  } catch (error: any) {
    console.error('[squareSDKLoader] Square initialization error:', error);
    console.error('[squareSDKLoader] Failed config:', {
      applicationId: appId,
      locationId: locationId
    });
    throw new Error(`Square SDK initialization failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Check if Square SDK is ready
 */
export function isSquareSDKReady(): boolean {
  return typeof window !== 'undefined' && !!window.Square;
}

/**
 * Get the current Square environment based on the app ID
 * Square app IDs:
 * - Sandbox: starts with 'sandbox-sq0idb-'
 * - Production: starts with 'sq0idp-'
 */
export function getSquareEnvironment(): 'sandbox' | 'production' {
  const config = getSquareConfig();
  return config.environment;
}