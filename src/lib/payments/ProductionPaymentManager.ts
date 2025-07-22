// ==========================================
// PRODUCTION PAYMENT MANAGER - NO TEST MODE
// ==========================================

import { getSquareConfig, debugPaymentConfig } from '@/config/production.payment.config';

declare global {
  interface Window {
    Square: any;
    __squarePaymentsInstance?: any;
  }
}

export class ProductionPaymentManager {
  private static instance: ProductionPaymentManager;
  private squarePayments: any = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ProductionPaymentManager {
    if (!ProductionPaymentManager.instance) {
      ProductionPaymentManager.instance = new ProductionPaymentManager();
    }
    return ProductionPaymentManager.instance;
  }

  async initializeSquare() {
    if (this.isInitialized && this.squarePayments) {
      return this.squarePayments;
    }

    // Wait for Square SDK
    if (!window.Square) {
      await this.loadSquareSDK();
    }

    // Get configuration with fallback values
    const config = getSquareConfig();
    const { appId, locationId, environment } = config;

    console.log('[ProductionPaymentManager] Using configuration:', {
      appId: appId.substring(0, 15) + '...',
      locationId: locationId,
      environment: environment,
      source: import.meta.env.VITE_SQUARE_APP_ID ? 'environment' : 'hardcoded fallback'
    });

    if (!appId || !locationId) {
      throw new Error('Square production credentials not configured');
    }

    // Verify we're using production credentials
    if (!appId.startsWith('sq0idp-')) {
      console.warn('[ProductionPaymentManager] Warning: App ID does not appear to be a production ID');
    }

    this.squarePayments = window.Square.payments({
      applicationId: appId,
      locationId: locationId
    });

    // Cache globally for reuse
    window.__squarePaymentsInstance = this.squarePayments;

    this.isInitialized = true;
    console.log('[ProductionPaymentManager] Square initialized in PRODUCTION mode');
    
    // Debug full configuration in development
    if (import.meta.env?.DEV) {
      debugPaymentConfig();
    }
    
    return this.squarePayments;
  }

  private async loadSquareSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Square) {
        resolve();
        return;
      }

      // Check for existing script
      const existingScript = document.querySelector('script[src*="web.squarecdn.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Square SDK')));
        return;
      }

      const script = document.createElement('script');
      // PRODUCTION SDK URL ONLY
      script.src = 'https://web.squarecdn.com/v1/square.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.Square) {
          console.log('[PaymentManager] Square SDK loaded successfully');
          resolve();
        } else {
          reject(new Error('Square SDK loaded but not initialized'));
        }
      };
      
      script.onerror = () => reject(new Error('Failed to load Square SDK'));
      document.head.appendChild(script);
    });
  }

  async createCard() {
    const payments = await this.initializeSquare();
    return await payments.card();
  }

  async createCashAppPay(paymentRequest: any, options: any) {
    const payments = await this.initializeSquare();
    return await payments.cashAppPay(paymentRequest, options);
  }

  async createPaymentRequest(amount: number) {
    const payments = await this.initializeSquare();
    return payments.paymentRequest({
      countryCode: 'US',
      currencyCode: 'USD',
      total: {
        amount: amount.toString(),
        label: 'Total',
      }
    });
  }

  getSquarePayments() {
    if (!this.squarePayments) {
      throw new Error('Square not initialized. Call initializeSquare() first.');
    }
    return this.squarePayments;
  }

  isReady(): boolean {
    return this.isInitialized && this.squarePayments !== null;
  }
}

// Export singleton instance
export const productionPaymentManager = ProductionPaymentManager.getInstance();