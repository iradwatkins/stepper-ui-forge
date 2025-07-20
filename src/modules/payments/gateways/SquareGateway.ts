import { PaymentGateway, PaymentResult } from '../types';
import SquareSingleton from '../../../utils/SquareSingleton';

export class SquareGateway implements PaymentGateway {
  private squareSingleton: SquareSingleton;
  private config: {
    appId: string;
    locationId: string;
    environment: 'sandbox' | 'production';
  };

  constructor(config: { appId: string; locationId: string; environment: 'sandbox' | 'production' }) {
    this.config = config;
    this.squareSingleton = SquareSingleton.getInstance();
  }

  async initialize(): Promise<void> {
    await this.squareSingleton.initialize(this.config);
  }

  async createPaymentForm(containerId: string): Promise<unknown> {
    if (!this.isReady()) {
      throw new Error('Square gateway not initialized');
    }

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    try {
      const card = await this.squareSingleton.createCard();
      await card.attach(`#${containerId}`);
      return card;
    } catch (error) {
      console.error('Failed to create Square payment form:', error);
      throw error;
    }
  }

  async processPayment(cardInstance: unknown, amount: number): Promise<PaymentResult> {
    if (!cardInstance) {
      throw new Error('Card instance not provided');
    }

    try {
      const cardInstance_ = cardInstance as { tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }> };
      const tokenResult = await cardInstance_.tokenize();
      
      if (tokenResult.status === 'OK') {
        return {
          success: true,
          token: tokenResult.token,
          transactionId: `square_${Date.now()}`
        };
      } else {
        const errors = tokenResult.errors?.map((error) => error.message).join(', ') || 'Unknown error';
        return {
          success: false,
          error: errors
        };
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  cleanup(): void {
    // Card instances are automatically cleaned up by Square SDK
    // We don't reset the singleton as it may be used by other components
  }

  isReady(): boolean {
    return this.squareSingleton.isReady();
  }

  getSquareInstance() {
    return this.squareSingleton;
  }
}