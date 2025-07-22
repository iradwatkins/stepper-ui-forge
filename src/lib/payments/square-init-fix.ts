import { getSquareConfig } from '@/config/production.payment.config';

/**
 * Robust Square SDK initialization with extensive validation
 * This handles edge cases where environment variables might not load properly
 */
export async function initializeSquareWithFallback() {
  try {
    // Wait for Square SDK to be available
    if (!(window as any).Square) {
      console.error('Square SDK not loaded');
      throw new Error('Square SDK not available');
    }

    // Get configuration with multiple fallback layers
    let config = getSquareConfig();
    
    // Extra validation layer
    if (!config.appId || typeof config.appId !== 'string' || config.appId === 'undefined') {
      console.warn('Invalid appId from getSquareConfig, using hardcoded fallback');
      config = {
        appId: 'sq0idp-XG8irNWHf98C62-iqOwH6Q',
        locationId: 'L0Q2YC1SPBGD8',
        environment: 'production' as const
      };
    }

    // Validate format one more time
    const isValidFormat = config.appId.startsWith('sq0idp-') || config.appId.startsWith('sandbox-sq0idb-');
    if (!isValidFormat) {
      throw new Error(`Invalid Square applicationId format: "${config.appId}"`);
    }

    console.log('🔒 Initializing Square with validated config:', {
      appId: config.appId.substring(0, 20) + '...',
      locationId: config.locationId,
      environment: config.environment,
      isValidFormat
    });

    // Initialize Square payments
    const payments = (window as any).Square.payments({
      applicationId: config.appId,
      locationId: config.locationId
    });

    return { payments, config };
  } catch (error) {
    console.error('❌ Square initialization failed:', error);
    
    // Last resort - try with hardcoded values directly
    try {
      console.log('🔄 Attempting fallback initialization with hardcoded values');
      const payments = (window as any).Square.payments({
        applicationId: 'sq0idp-XG8irNWHf98C62-iqOwH6Q',
        locationId: 'L0Q2YC1SPBGD8'
      });
      
      return {
        payments,
        config: {
          appId: 'sq0idp-XG8irNWHf98C62-iqOwH6Q',
          locationId: 'L0Q2YC1SPBGD8',
          environment: 'production' as const
        }
      };
    } catch (fallbackError) {
      console.error('❌ Fallback initialization also failed:', fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Helper to validate Square applicationId format
 */
export function isValidSquareAppId(appId: any): boolean {
  if (typeof appId !== 'string') return false;
  if (!appId || appId === 'undefined' || appId === 'null') return false;
  return appId.startsWith('sq0idp-') || appId.startsWith('sandbox-sq0idb-');
}