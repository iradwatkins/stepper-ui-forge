import { PaymentManager, PaymentManagerConfig } from '../PaymentManager';
import { PaymentGateway } from '../PaymentGateway';
import { PaymentRequest, PaymentResult, PaymentGateway as PaymentGatewayType } from '../types';

// Mock payment gateway implementation for testing
class MockPaymentGateway extends PaymentGateway {
  private shouldFail: boolean = false;
  private isReady: boolean = true;

  constructor(type: PaymentGatewayType, shouldFail = false) {
    super(type, {
      environment: 'sandbox',
      credentials: { test: 'value' }
    });
    this.shouldFail = shouldFail;
  }

  async initialize(): Promise<void> {
    this.isInitialized = this.isReady;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: 'Mock payment failure',
          gateway: this.gatewayType,
          retryable: true,
          userMessage: 'Payment failed, please try again'
        }
      };
    }

    return {
      success: true,
      payment: {
        transactionId: `mock-${Date.now()}`,
        status: 'completed',
        amount: request.amount,
        currency: request.currency,
        gateway: this.gatewayType,
        paidAt: new Date()
      }
    };
  }

  async verifyPayment(transactionId: string) {
    return {
      transactionId,
      status: 'completed' as const,
      amount: 100,
      currency: 'USD' as const,
      gateway: this.gatewayType,
      paidAt: new Date()
    };
  }

  async processRefund() {
    return {
      refundId: 'mock-refund',
      transactionId: 'mock-transaction',
      amount: 100,
      currency: 'USD' as const,
      status: 'completed' as const,
      gateway: this.gatewayType,
      refundedAt: new Date()
    };
  }

  async handleWebhook() {
    return {
      gateway: this.gatewayType,
      eventType: 'payment.completed',
      data: {},
      timestamp: new Date()
    };
  }

  getPaymentMethod() {
    return {
      gateway: this.gatewayType,
      name: `Mock ${this.gatewayType}`,
      description: 'Mock payment method',
      enabled: true,
      supportedCurrencies: ['USD' as const],
      fees: { percentage: 2.9, fixed: 0.30 }
    };
  }

  setReady(ready: boolean): void {
    this.isReady = ready;
    this.isInitialized = ready;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  isReady(): boolean {
    return this.isReady;
  }
}

describe('PaymentManager', () => {
  let paymentManager: PaymentManager;
  let mockPayPal: MockPaymentGateway;
  let mockSquare: MockPaymentGateway;
  let mockCashApp: MockPaymentGateway;

  const defaultConfig: PaymentManagerConfig = {
    defaultGateway: 'paypal',
    enabledGateways: ['paypal', 'square', 'cashapp'],
    enableFailover: true,
    maxRetries: 3
  };

  const mockPaymentRequest: PaymentRequest = {
    amount: 100,
    currency: 'USD',
    orderId: 'order-123',
    description: 'Test payment',
    customerEmail: 'test@example.com',
    customerName: 'Test User'
  };

  beforeEach(() => {
    paymentManager = new PaymentManager(defaultConfig);
    mockPayPal = new MockPaymentGateway('paypal');
    mockSquare = new MockPaymentGateway('square');
    mockCashApp = new MockPaymentGateway('cashapp');

    paymentManager.registerGateway(mockPayPal);
    paymentManager.registerGateway(mockSquare);
    paymentManager.registerGateway(mockCashApp);
  });

  describe('Gateway Registration and Initialization', () => {
    it('should register gateways correctly', () => {
      const health = paymentManager.getGatewayHealth();
      expect(Object.keys(health)).toHaveLength(3);
      expect(health.paypal).toBeDefined();
      expect(health.square).toBeDefined();
      expect(health.cashapp).toBeDefined();
    });

    it('should initialize all gateways', async () => {
      await paymentManager.initializeGateways();
      
      const health = paymentManager.getGatewayHealth();
      expect(health.paypal).toBe(true);
      expect(health.square).toBe(true);
      expect(health.cashapp).toBe(true);
    });

    it('should handle gateway initialization failures gracefully', async () => {
      mockPayPal.setReady(false);
      
      await paymentManager.initializeGateways();
      
      const health = paymentManager.getGatewayHealth();
      expect(health.paypal).toBe(false);
      expect(health.square).toBe(true);
      expect(health.cashapp).toBe(true);
    });
  });

  describe('Payment Processing', () => {
    beforeEach(async () => {
      await paymentManager.initializeGateways();
    });

    it('should process payment with default gateway', async () => {
      const result = await paymentManager.processPayment(mockPaymentRequest);
      
      expect(result.success).toBe(true);
      expect(result.payment?.gateway).toBe('paypal');
      expect(result.payment?.amount).toBe(100);
      expect(result.payment?.status).toBe('completed');
    });

    it('should use event-specific gateway configuration', async () => {
      paymentManager.setEventConfig({
        eventId: 'event-123',
        enabledGateways: ['square'],
        preferredGateway: 'square'
      });

      const result = await paymentManager.processPayment(mockPaymentRequest, 'event-123');
      
      expect(result.success).toBe(true);
      expect(result.payment?.gateway).toBe('square');
    });

    it('should failover to next gateway when first fails', async () => {
      mockPayPal.setShouldFail(true);
      
      const result = await paymentManager.processPayment(mockPaymentRequest);
      
      expect(result.success).toBe(true);
      expect(result.payment?.gateway).toBe('square'); // Should failover to second gateway
    });

    it('should fail when all gateways fail', async () => {
      mockPayPal.setShouldFail(true);
      mockSquare.setShouldFail(true);
      mockCashApp.setShouldFail(true);
      
      const result = await paymentManager.processPayment(mockPaymentRequest);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.retryable).toBe(true);
    });

    it('should not retry on non-retryable errors', async () => {
      // Set up PayPal to fail with non-retryable error
      const originalProcessPayment = mockPayPal.processPayment.bind(mockPayPal);
      mockPayPal.processPayment = jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: 'INVALID_CARD',
          message: 'Invalid card',
          gateway: 'paypal',
          retryable: false,
          userMessage: 'Please check your card details'
        }
      });
      
      const result = await paymentManager.processPayment(mockPaymentRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(false);
      expect(mockSquare.processPayment).not.toHaveBeenCalled();
    });
  });

  describe('Gateway Selection and Failover', () => {
    beforeEach(async () => {
      await paymentManager.initializeGateways();
    });

    it('should respect preferred gateway order', async () => {
      paymentManager.setEventConfig({
        eventId: 'event-123',
        enabledGateways: ['paypal', 'square', 'cashapp'],
        preferredGateway: 'square',
        fallbackGateways: ['cashapp', 'paypal']
      });

      mockSquare.setShouldFail(true);
      
      const result = await paymentManager.processPayment(mockPaymentRequest, 'event-123');
      
      expect(result.success).toBe(true);
      expect(result.payment?.gateway).toBe('cashapp'); // Should use first fallback
    });

    it('should skip unavailable gateways', async () => {
      mockSquare.setReady(false);
      mockPayPal.setShouldFail(true);
      
      const result = await paymentManager.processPayment(mockPaymentRequest);
      
      expect(result.success).toBe(true);
      expect(result.payment?.gateway).toBe('cashapp'); // Should skip unavailable Square
    });
  });

  describe('Available Payment Methods', () => {
    beforeEach(async () => {
      await paymentManager.initializeGateways();
    });

    it('should return available payment methods', () => {
      const methods = paymentManager.getAvailablePaymentMethods();
      
      expect(methods).toHaveLength(3);
      expect(methods.map(m => m.gateway)).toContain('paypal');
      expect(methods.map(m => m.gateway)).toContain('square');
      expect(methods.map(m => m.gateway)).toContain('cashapp');
    });

    it('should filter methods based on event configuration', () => {
      paymentManager.setEventConfig({
        eventId: 'event-123',
        enabledGateways: ['paypal', 'square']
      });

      const methods = paymentManager.getAvailablePaymentMethods('event-123');
      
      expect(methods).toHaveLength(2);
      expect(methods.map(m => m.gateway)).toContain('paypal');
      expect(methods.map(m => m.gateway)).toContain('square');
      expect(methods.map(m => m.gateway)).not.toContain('cashapp');
    });

    it('should exclude unavailable gateways', () => {
      mockSquare.setReady(false);
      
      const methods = paymentManager.getAvailablePaymentMethods();
      
      expect(methods).toHaveLength(2);
      expect(methods.map(m => m.gateway)).not.toContain('square');
    });
  });

  describe('Refund Processing', () => {
    beforeEach(async () => {
      await paymentManager.initializeGateways();
    });

    it('should process refund with correct gateway', async () => {
      const refundRequest = {
        transactionId: 'txn-123',
        amount: 50,
        reason: 'Customer request'
      };

      const result = await paymentManager.processRefund(refundRequest, 'paypal');
      
      expect(result.gateway).toBe('paypal');
      expect(result.amount).toBe(50);
      expect(result.status).toBe('completed');
    });

    it('should throw error for unavailable gateway', async () => {
      mockSquare.setReady(false);
      
      const refundRequest = {
        transactionId: 'txn-123',
        amount: 50
      };

      await expect(
        paymentManager.processRefund(refundRequest, 'square')
      ).rejects.toThrow('Gateway square not available for refund');
    });
  });

  describe('Health Monitoring', () => {
    it('should report gateway health correctly', async () => {
      mockPayPal.setReady(true);
      mockSquare.setReady(false);
      mockCashApp.setReady(true);
      
      await paymentManager.initializeGateways();
      
      const health = paymentManager.getGatewayHealth();
      expect(health.paypal).toBe(true);
      expect(health.square).toBe(false);
      expect(health.cashapp).toBe(true);
    });

    it('should check if any gateways are available', async () => {
      await paymentManager.initializeGateways();
      expect(paymentManager.hasAvailableGateways()).toBe(true);
      
      // Make all gateways unavailable
      mockPayPal.setReady(false);
      mockSquare.setReady(false);
      mockCashApp.setReady(false);
      
      expect(paymentManager.hasAvailableGateways()).toBe(false);
    });
  });

  describe('Event Configuration Management', () => {
    it('should set and get event configuration', () => {
      const config = {
        eventId: 'event-123',
        enabledGateways: ['paypal', 'square'] as PaymentGatewayType[],
        preferredGateway: 'square' as PaymentGatewayType
      };

      paymentManager.setEventConfig(config);
      const retrieved = paymentManager.getEventConfig('event-123');
      
      expect(retrieved).toEqual(config);
    });

    it('should return null for non-existent event configuration', () => {
      const config = paymentManager.getEventConfig('non-existent');
      expect(config).toBeNull();
    });
  });
});