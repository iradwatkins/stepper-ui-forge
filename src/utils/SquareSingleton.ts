interface SquareSDK {
  payments: (appId: string, locationId: string) => SquarePayments;
}

interface SquarePayments {
  card: (options?: unknown) => Promise<SquareCard>;
  ach: (options?: unknown) => Promise<unknown>;
  giftCard: (options?: unknown) => Promise<unknown>;
}

interface SquareCard {
  attach: (element: string | HTMLElement) => Promise<void>;
  tokenize: () => Promise<{
    status: string;
    token?: string;
    errors?: Array<{ message: string }>;
  }>;
}

declare global {
  interface Window {
    Square?: SquareSDK;
  }
}

interface SquareConfig {
  appId: string;
  locationId: string;
  environment: 'sandbox' | 'production';
}

/**
 * Singleton pattern for Square SDK management
 * Prevents multiple SDK loads and provides centralized payment instance management
 */
class SquareSingleton {
  private static instance: SquareSingleton;
  private payments: SquarePayments | null = null;
  private initPromise: Promise<void> | null = null;
  private isScriptLoaded = false;
  private config: SquareConfig | null = null;

  private constructor() {}

  static getInstance(): SquareSingleton {
    if (!SquareSingleton.instance) {
      SquareSingleton.instance = new SquareSingleton();
    }
    return SquareSingleton.instance;
  }

  /**
   * Initialize Square SDK with configuration
   */
  async initialize(config: SquareConfig): Promise<void> {
    // If already initialized with same config, return existing instance
    if (this.payments && this.config && 
        this.config.appId === config.appId && 
        this.config.locationId === config.locationId) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    this.config = config;
    this.initPromise = this.loadAndInit(config);
    await this.initPromise;
  }

  private async loadAndInit(config: SquareConfig): Promise<void> {
    try {
      // Load SDK if not already loaded
      if (!window.Square && !this.isScriptLoaded) {
        await this.loadSDK();
      }

      // Wait for SDK to be available
      await this.waitForSquareSDK();

      // Initialize payments instance
      this.payments = window.Square.payments(config.appId, config.locationId);
      
      console.log('Square SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Square SDK:', error);
      this.initPromise = null; // Reset so we can retry
      throw error;
    }
  }

  private loadSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="square.js"]');
      if (existingScript) {
        this.isScriptLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://web.squarecdn.com/v1/square.js';
      script.async = true;
      
      script.onload = () => {
        this.isScriptLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Square SDK script'));
      };
      
      document.head.appendChild(script);
    });
  }

  private waitForSquareSDK(maxAttempts = 50, delay = 100): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const checkSquare = () => {
        attempts++;
        
        if (window.Square) {
          resolve();
          return;
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error('Square SDK not available after maximum attempts'));
          return;
        }
        
        setTimeout(checkSquare, delay);
      };
      
      checkSquare();
    });
  }

  /**
   * Get the payments instance
   */
  getPayments() {
    if (!this.payments) {
      throw new Error('Square not initialized. Call initialize() first.');
    }
    return this.payments;
  }

  /**
   * Create a card payment method
   */
  async createCard(options?: unknown): Promise<SquareCard> {
    const payments = this.getPayments();
    return await payments.card(options);
  }

  /**
   * Create an ACH payment method
   */
  async createACH(options?: unknown) {
    const payments = this.getPayments();
    return await payments.ach(options);
  }

  /**
   * Create a gift card payment method
   */
  async createGiftCard(options?: unknown) {
    const payments = this.getPayments();
    return await payments.giftCard(options);
  }

  /**
   * Check if Square SDK is ready
   */
  isReady(): boolean {
    return this.payments !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): SquareConfig | null {
    return this.config;
  }

  /**
   * Reset the singleton (for testing or configuration changes)
   */
  reset(): void {
    this.payments = null;
    this.initPromise = null;
    this.config = null;
    // Note: We don't reset isScriptLoaded as the script remains in the DOM
  }

  /**
   * Cleanup method to destroy payment instances
   */
  cleanup(): void {
    if (this.payments) {
      // Square doesn't provide explicit cleanup, but we can reset our references
      this.payments = null;
    }
    this.initPromise = null;
  }
}

export default SquareSingleton;