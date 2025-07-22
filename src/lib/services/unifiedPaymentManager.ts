/**
 * Unified Payment Manager for Square Web Payments SDK
 * Handles both Credit Card and Cash App Pay through a single Square instance
 */

import { getSquareConfig } from '@/config/production.payment.config';

interface PaymentInstance {
  type: 'card' | 'cashapp';
  instance: any;
  containerId: string;
}

interface UnifiedPaymentOptions {
  referenceId?: string;
  amount?: number;
  [key: string]: any;
}

class UnifiedPaymentManager {
  private squarePayments: any = null;
  private instances: Map<string, PaymentInstance> = new Map();
  private isInitializing: boolean = false;
  private initPromise: Promise<any> | null = null;

  /**
   * Initialize Square Payments SDK once
   */
  async initializeSquarePayments() {
    if (this.squarePayments) {
      return this.squarePayments;
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._doInitialize();
    
    try {
      await this.initPromise;
      return this.squarePayments;
    } finally {
      this.isInitializing = false;
    }
  }

  private async _doInitialize() {
    // Wait for Square SDK to load
    if (!(window as any).Square) {
      await this.loadSquareSDK();
    }

    // Get credentials from centralized config with fallback values
    const config = getSquareConfig();
    const { appId: squareAppId, locationId: squareLocationId } = config;

    if (!squareAppId || !squareLocationId) {
      throw new Error('Square credentials not configured. Please check your configuration');
    }

    // Initialize Square payments ONCE
    this.squarePayments = (window as any).Square.payments({
      applicationId: squareAppId,
      locationId: squareLocationId
    });

    console.log('✅ Square payments initialized successfully');
    console.log('ℹ️ Using Square App ID for both card payments and Cash App Pay');
  }

  /**
   * Create Card Payment instance
   */
  async createCardPayment(containerId: string): Promise<any> {
    const payments = await this.initializeSquarePayments();

    // Check if already exists
    if (this.instances.has(containerId)) {
      console.warn(`Card payment already initialized for ${containerId}`);
      return this.instances.get(containerId)!.instance;
    }

    try {
      // Create card payment
      const card = await payments.card();
      
      // Ensure container exists
      const container = this.getContainer(containerId);
      if (!container) {
        throw new Error(`Container ${containerId} not found`);
      }

      await card.attach(containerId);

      // Store instance
      this.instances.set(containerId, {
        type: 'card',
        instance: card,
        containerId
      });

      console.log(`✅ Card payment attached to ${containerId}`);
      return card;
    } catch (error) {
      console.error('Error creating card payment:', error);
      throw error;
    }
  }

  /**
   * Create Cash App Pay instance
   */
  async createCashAppPay(containerId: string, amount: number, options: UnifiedPaymentOptions = {}): Promise<any> {
    const payments = await this.initializeSquarePayments();

    // Check if already exists
    if (this.instances.has(containerId)) {
      console.warn(`Cash App Pay already initialized for ${containerId}`);
      return this.instances.get(containerId)!.instance;
    }

    try {
      // Create payment request (required for Cash App Pay)
      const paymentRequest = payments.paymentRequest({
        countryCode: 'US',
        currencyCode: 'USD',
        total: {
          amount: String(amount), // Amount in cents as string
          label: 'Total',
        },
        requestShippingAddress: false,
        requestBillingAddress: false,
      });

      console.log('Creating Cash App Pay with payment request:', {
        amount: amount,
        referenceId: options.referenceId
      });

      // Create Cash App Pay instance
      const cashAppPay = await payments.cashAppPay(paymentRequest, {
        redirectURL: window.location.href,
        referenceId: options.referenceId || `order-${Date.now()}`,
      });

      // Ensure container exists
      const container = this.getContainer(containerId);
      if (!container) {
        throw new Error(`Container ${containerId} not found`);
      }

      await cashAppPay.attach(containerId);

      // Store instance
      this.instances.set(containerId, {
        type: 'cashapp',
        instance: cashAppPay,
        containerId
      });

      console.log(`✅ Cash App Pay attached to ${containerId}`);
      return cashAppPay;
    } catch (error) {
      console.error('Error creating Cash App Pay:', error);
      throw error;
    }
  }

  /**
   * Get payment token from card instance
   */
  async tokenizeCard(cardInstance: any): Promise<string> {
    const result = await cardInstance.tokenize();
    if (result.status === 'OK') {
      return result.token;
    } else {
      throw new Error(result.errors?.[0]?.message || 'Card tokenization failed');
    }
  }

  /**
   * Destroy a payment instance
   */
  async destroyPaymentInstance(containerId: string): Promise<void> {
    const paymentInstance = this.instances.get(containerId);
    if (!paymentInstance) return;

    try {
      if (paymentInstance.instance.destroy) {
        await paymentInstance.instance.destroy();
      }
      this.instances.delete(containerId);
      console.log(`🗑️ Destroyed payment instance for ${containerId}`);
    } catch (error) {
      console.warn('Error destroying payment instance:', error);
    }
  }

  /**
   * Destroy all payment instances
   */
  async destroyAllInstances(): Promise<void> {
    const containerIds = Array.from(this.instances.keys());
    await Promise.all(containerIds.map(id => this.destroyPaymentInstance(id)));
    console.log('🗑️ All payment instances destroyed');
  }

  /**
   * Load Square SDK
   */
  private async loadSquareSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if ((window as any).Square) {
        resolve();
        return;
      }

      // Check for existing script
      const existingScript = document.querySelector('script[src*="web.squarecdn.com/v1/square.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Square SDK')));
        return;
      }

      // Create and load script
      const script = document.createElement('script');
      script.src = 'https://web.squarecdn.com/v1/square.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Square SDK loaded');
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Square SDK'));
      document.head.appendChild(script);
    });
  }

  /**
   * Get container element
   */
  private getContainer(containerId: string): Element | null {
    return typeof containerId === 'string' 
      ? document.querySelector(containerId) 
      : containerId;
  }

  /**
   * Check if Square SDK is ready
   */
  isReady(): boolean {
    return !!this.squarePayments;
  }

  /**
   * Get active instances count
   */
  getActiveInstancesCount(): number {
    return this.instances.size;
  }

  /**
   * Debug: List all active instances
   */
  debugListInstances(): void {
    console.group('🔍 Active Payment Instances');
    this.instances.forEach((instance, containerId) => {
      console.log(`- ${containerId}: ${instance.type}`);
    });
    console.log(`Total: ${this.instances.size} instances`);
    console.groupEnd();
  }
}

// Export singleton instance
export const unifiedPaymentManager = new UnifiedPaymentManager();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).unifiedPaymentManager = unifiedPaymentManager;
}