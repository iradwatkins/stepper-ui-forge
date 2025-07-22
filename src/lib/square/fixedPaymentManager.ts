// src/lib/square/fixedPaymentManager.ts
import { SQUARE_PRODUCTION_CONFIG, validateSquareConfig } from './squareConfig';

declare global {
  interface Window {
    Square: any;
  }
}

export class FixedPaymentManager {
  private static instance: FixedPaymentManager;
  private squarePayments: any = null;
  private isInitialized = false;

  static getInstance(): FixedPaymentManager {
    if (!FixedPaymentManager.instance) {
      FixedPaymentManager.instance = new FixedPaymentManager();
    }
    return FixedPaymentManager.instance;
  }

  async initializeSquare() {
    if (this.isInitialized) return this.squarePayments;

    try {
      // Validate config first
      validateSquareConfig();
      
      // Load SDK
      await this.ensureSquareSDKLoaded();
      
      // Use hardcoded config
      const { applicationId, locationId } = SQUARE_PRODUCTION_CONFIG;
      
      console.log('[Square] Initializing with validated config:', {
        appId: applicationId.substring(0, 15) + '...',
        locationId,
        format: applicationId.substring(0, 7)
      });
      
      // Initialize Square payments with proper object format
      this.squarePayments = window.Square.payments({
        applicationId: applicationId,
        locationId: locationId
      });
      this.isInitialized = true;
      
      console.log('[Square] Initialized successfully');
      return this.squarePayments;
      
    } catch (error) {
      console.error('[Square] Initialization failed:', error);
      throw error;
    }
  }

  private async ensureSquareSDKLoaded(): Promise<void> {
    if (window.Square) return;
    
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

  async createCard() {
    const payments = await this.initializeSquare();
    return payments.card();
  }

  async createCashAppPay(amount: number, orderId: string) {
    const payments = await this.initializeSquare();
    
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
  }
}