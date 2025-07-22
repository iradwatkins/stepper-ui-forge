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

  private constructor() {
    // Bind methods to ensure proper context
    this.initializeSquare = this.initializeSquare.bind(this);
    this.createCard = this.createCard.bind(this);
    this.createCashAppPay = this.createCashAppPay.bind(this);
  }

  static getInstance(): FixedPaymentManager {
    if (!FixedPaymentManager.instance) {
      FixedPaymentManager.instance = new FixedPaymentManager();
    }
    return FixedPaymentManager.instance;
  }

  async initializeSquare() {
    console.log('[FixedPaymentManager] initializeSquare called, isInitialized:', this.isInitialized);
    
    if (this.isInitialized && this.squarePayments) {
      console.log('[FixedPaymentManager] Returning cached Square payments instance');
      return this.squarePayments;
    }

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
      
      // Initialize Square payments with direct parameters
      this.squarePayments = window.Square.payments(applicationId, locationId);
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
    try {
      const payments = await this.initializeSquare();
      if (!payments) {
        throw new Error('Square payments not initialized');
      }
      return payments.card();
    } catch (error) {
      console.error('[FixedPaymentManager] createCard error:', error);
      throw error;
    }
  }

  async createCashAppPay(amount: number, orderId: string) {
    try {
      const payments = await this.initializeSquare();
      if (!payments) {
        throw new Error('Square payments not initialized');
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
      console.error('[FixedPaymentManager] createCashAppPay error:', error);
      throw error;
    }
  }
}