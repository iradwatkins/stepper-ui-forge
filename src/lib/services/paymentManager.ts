import { getSquareConfig } from '@/config/production.payment.config';
import { initializeSquareWithFallback } from '@/lib/payments/square-init-fix';

interface PaymentManagerOptions {
  referenceId?: string;
  amount?: number;
  [key: string]: any;
}

class PaymentManager {
  private squarePayments: any = null;
  private isInitializing = false;
  private initPromise: Promise<any> | null = null;
  private activeInstances = new Map<string, any>();

  async initializeSquarePayments() {
    // Prevent multiple initializations
    if (this.squarePayments) {
      return this.squarePayments;
    }

    // If already initializing, wait for it
    if (this.isInitializing) {
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

    try {
      // Use the robust initialization with multiple fallback layers
      const { payments, config } = await initializeSquareWithFallback();
      
      this.squarePayments = payments;
      
      console.log('✅ Square payments initialized successfully with config:', {
        appId: config.appId.substring(0, 20) + '...',
        locationId: config.locationId,
        environment: config.environment
      });
    } catch (error) {
      console.error('❌ Failed to initialize Square payments:', error);
      throw error;
    }
  }

  private async loadSquareSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if ((window as any).Square) {
        resolve();
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="square.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Square SDK')));
        return;
      }

      // Load Square SDK
      const script = document.createElement('script');
      script.src = 'https://web.squarecdn.com/v1/square.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Square SDK'));
      document.head.appendChild(script);
    });
  }

  async createCashAppPay(containerId: string, options: PaymentManagerOptions = {}): Promise<any> {
    // Ensure Square payments is initialized
    const payments = await this.initializeSquarePayments();

    // Clean up any existing instance for this container
    const existingInstance = this.activeInstances.get(containerId);
    if (existingInstance) {
      await this.destroyCashAppPay(existingInstance);
    }

    try {
      // Create payment request first (REQUIRED by Square SDK)
      const paymentRequest = payments.paymentRequest({
        countryCode: 'US',
        currencyCode: 'USD',
        total: {
          amount: (options.amount || 0).toFixed(2), // Amount in dollars as string (e.g., "25.00")
          label: 'Total',
        },
        requestShippingAddress: false,
        requestBillingAddress: false,
      });

      console.log('Creating Cash App Pay with payment request:', {
        amount: options.amount,
        referenceId: options.referenceId
      });

      // Create Cash App Pay instance with payment request
      const cashAppPay = await payments.cashAppPay(paymentRequest, {
        redirectURL: window.location.href,
        referenceId: options.referenceId || `order-${Date.now()}`,
      });

      // Attach to specific container
      const container = typeof containerId === 'string' 
        ? document.querySelector(containerId) 
        : containerId;
        
      if (!container) {
        throw new Error(`Container ${containerId} not found`);
      }

      await cashAppPay.attach(container);
      
      // Track active instance
      this.activeInstances.set(containerId, cashAppPay);

      return { cashAppPay, paymentRequest };
    } catch (error) {
      console.error('Error creating Cash App Pay instance:', error);
      throw error;
    }
  }

  // Destroy a Cash App Pay instance
  async destroyCashAppPay(instance: any): Promise<void> {
    if (!instance) return;
    
    // Handle both the instance object and the result object
    const cashAppInstance = instance.cashAppPay || instance;
    
    if (cashAppInstance && typeof cashAppInstance.destroy === 'function') {
      try {
        await cashAppInstance.destroy();
        
        // Remove from active instances
        for (const [key, value] of this.activeInstances.entries()) {
          if (value === cashAppInstance || value === instance) {
            this.activeInstances.delete(key);
            break;
          }
        }
      } catch (error) {
        console.warn('Error destroying Cash App Pay instance:', error);
      }
    }
  }

  // Destroy all active instances
  async destroyAllInstances(): Promise<void> {
    const instances = Array.from(this.activeInstances.values());
    await Promise.all(instances.map(instance => this.destroyCashAppPay(instance)));
    this.activeInstances.clear();
  }

  // Check if Square is loaded and ready
  isReady(): boolean {
    return !!this.squarePayments;
  }
}

// Export singleton instance
export const paymentManager = new PaymentManager();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).paymentManager = paymentManager;
}