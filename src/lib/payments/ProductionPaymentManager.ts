// ==========================================
// PRODUCTION PAYMENT MANAGER - NO TEST MODE
// ==========================================

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

    // PRODUCTION CREDENTIALS ONLY
    const appId = import.meta.env.VITE_SQUARE_APP_ID;
    const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;

    if (!appId || !locationId) {
      throw new Error('Square production credentials not configured');
    }

    // Verify we're using production credentials
    if (!appId.startsWith('sq0idp-')) {
      throw new Error('Invalid production app ID. Production IDs must start with sq0idp-');
    }

    this.squarePayments = window.Square.payments({
      applicationId: appId,
      locationId: locationId
    });

    // Cache globally for reuse
    window.__squarePaymentsInstance = this.squarePayments;

    this.isInitialized = true;
    console.log('[PaymentManager] Square initialized in PRODUCTION mode');
    console.log('[PaymentManager] App ID:', appId.substring(0, 15) + '...');
    console.log('[PaymentManager] Location:', locationId);
    
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