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

    // Debug: Log environment variables in production
    const appId = import.meta.env.VITE_SQUARE_APP_ID;
    const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
    const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT;
    
    console.log('🔍 Square Environment Debug:', {
      appId: appId ? `${appId.substring(0, 10)}...` : 'MISSING',
      locationId: locationId ? `${locationId.substring(0, 10)}...` : 'MISSING',
      environment: environment || 'MISSING',
      mode: import.meta.env.MODE,
      isDev: import.meta.env.DEV,
      isProd: import.meta.env.PROD
    });

    if (!appId || !locationId) {
      throw new Error(`Square configuration missing: appId=${!!appId}, locationId=${!!locationId}`);
    }

    // Initialize Square payments once - Square expects an object with applicationId and locationId
    this.squarePayments = (window as any).Square.payments({
      applicationId: appId,
      locationId: locationId
    });

    console.log('Square payments initialized globally');
  }

  private async loadSquareSDK(): Promise<void> {
    // Use centralized Square SDK loader to ensure consistency
    const { loadSquareSDK } = await import('@/utils/squareSDKLoader');
    return loadSquareSDK();
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