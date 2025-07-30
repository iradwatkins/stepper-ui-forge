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
  try {
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
            // Don't reject, just resolve to prevent app crash
            console.warn('Square SDK loaded but not initialized');
            resolve();
          }
        });
        existingScript.addEventListener('error', () => {
          // Don't reject, just resolve to prevent app crash
          console.warn('Failed to load Square SDK');
          resolve();
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
          // Don't reject, just resolve to prevent app crash
          console.warn('Square SDK loaded but not initialized');
          resolve();
        }
      };

      script.onerror = () => {
        // Don't reject, just resolve to prevent app crash
        console.warn('Failed to load Square SDK');
        resolve();
      };

      document.head.appendChild(script);
    });

    return window.__squareSDKLoadPromise;
  } catch (error) {
    console.error('[squareSDKLoader] Error in loadSquareSDK:', error);
    return Promise.resolve();
  }
}

/**
 * Initialize Square payments instance with proper configuration
 */
export async function initializeSquarePayments() {
  try {
    // Get configuration with fallback values
    const config = getSquareConfig();
    const { appId, locationId } = config;

    // Validate configuration exists
    if (!appId || !locationId) {
      console.warn('[squareSDKLoader] Square configuration missing. Payment functionality will be disabled.');
      return null;
    }

    // Check for placeholder values
    const isPlaceholder = appId.includes('placeholder') || appId.includes('your_') || 
                         appId.includes('YOUR_') || appId.includes('PLACEHOLDER');

    if (isPlaceholder) {
      console.warn('[squareSDKLoader] Placeholder Square credentials detected. Payment functionality will be disabled.');
      return null;
    }

    // Validate application ID format based on environment
    const isProduction = appId.startsWith('sq0idp-');
    const isSandbox = appId.startsWith('sandbox-sq0idb-');

    if (!isProduction && !isSandbox) {
      console.warn('[squareSDKLoader] Invalid Square application ID format. Payment functionality will be disabled.');
      return null;
    }

    // Validate length based on type
    const expectedLength = isSandbox ? 44 : 29; // Sandbox IDs are longer due to prefix
    if (appId.length !== expectedLength) {
      console.warn('[squareSDKLoader] Invalid Square application ID length. Payment functionality will be disabled.');
      return null;
    }

    // Ensure SDK is loaded
    await loadSquareSDK();

    console.log('[squareSDKLoader] Initializing with validated config:', {
      appIdPrefix: appId.substring(0, 7),
      appIdLength: appId.length,
      locationId: locationId,
      source: import.meta.env.VITE_SQUARE_APP_ID ? 'environment' : 'hardcoded fallback'
    });

    // Initialize with direct parameters (working format from commit 36191e3)
    const payments = window.Square.payments(appId, locationId);
    
    console.log('[squareSDKLoader] Square payments initialized successfully');
    return payments;
  } catch (error: any) {
    console.error('[squareSDKLoader] Square initialization error:', error);
    console.error('[squareSDKLoader] Payment functionality will be disabled.');
    return null;
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