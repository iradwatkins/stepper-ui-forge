// SquareGateway Unit Tests
// Tests the Square payment gateway implementation

import { SquareGateway } from '../SquareGateway';
import { PaymentRequest, PaymentResult, RefundRequest } from '../../types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Square Web SDK
const mockSquarePayments = {
  card: jest.fn(),
  cashApp: jest.fn(),
  attach: jest.fn(),
  tokenize: jest.fn()
};

global.window = {
  ...global.window,
  Square: {
    payments: jest.fn().mockReturnValue(mockSquarePayments)
  }
} as any;

describe('SquareGateway', () => {
  let gateway: SquareGateway;

  const mockOptions = {
    environment: 'sandbox' as const,
    credentials: {
      applicationId: 'sq0idp-test',
      accessToken: 'EAAAE_test_token',
      locationId: 'L123TEST'
    },
    returnUrl: 'http://localhost:3000/success',
    cancelUrl: 'http://localhost:3000/cancel'
  };

  beforeEach(() => {
    gateway = new SquareGateway(mockOptions);
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct gateway type', () => {
      expect(gateway.getGatewayType()).toBe('square');
    });

    it('should set environment correctly', () => {
      expect(gateway.getEnvironment()).toBe('sandbox');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      // Mock successful API test
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ locations: [] })
      });

      await gateway.initialize();
      expect(gateway.isReady()).toBe(true);
    });

    it('should throw error with missing credentials', async () => {
      const invalidGateway = new SquareGateway({
        ...mockOptions,
        credentials: {
          applicationId: '',
          accessToken: '',
          locationId: ''
        }
      });

      await expect(invalidGateway.initialize()).rejects.toThrow(
        'Square application ID, access token, and location ID are required'
      );
    });

    it('should handle API connection failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(gateway.initialize()).rejects.toThrow();
    });
  });

  describe('processPayment', () => {
    const mockPaymentRequest: PaymentRequest = {
      amount: 25.00,
      currency: 'USD',
      orderId: 'order-123',
      description: 'Test payment',
      customerEmail: 'test@example.com'
    };

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ locations: [] })
      });
      await gateway.initialize();
    });

    it('should prepare payment for client-side processing', async () => {
      const result = await gateway.processPayment(mockPaymentRequest);

      expect(result.success).toBe(true);
      expect(result.requiresAction).toBe(true);
      expect(result.payment?.status).toBe('pending');
      expect(result.payment?.metadata?.requiresClientSideProcessing).toBe(true);
    });

    it('should validate payment request', async () => {
      const invalidRequest = { ...mockPaymentRequest, amount: 0 };
      const result = await gateway.processPayment(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_AMOUNT');
    });

    it('should validate email format', async () => {
      const invalidRequest = { ...mockPaymentRequest, customerEmail: 'invalid-email' };
      const result = await gateway.processPayment(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_EMAIL');
    });
  });

  describe('processPaymentWithToken', () => {
    const mockPaymentRequest: PaymentRequest = {
      amount: 25.00,
      currency: 'USD',
      orderId: 'order-123',
      description: 'Test payment',
      customerEmail: 'test@example.com'
    };

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ locations: [] })
      });
      await gateway.initialize();
    });

    it('should process payment with valid token', async () => {
      const mockSquarePayment = {
        id: 'sq-payment-123',
        status: 'COMPLETED',
        amount_money: {
          amount: 2500, // cents
          currency: 'USD'
        },
        created_at: '2023-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ payment: mockSquarePayment })
      });

      const result = await gateway.processPaymentWithToken('test-token', mockPaymentRequest);

      expect(result.success).toBe(true);
      expect(result.payment?.transactionId).toBe('sq-payment-123');
      expect(result.payment?.status).toBe('completed');
      expect(result.payment?.amount).toBe(25.00);
    });

    it('should handle payment processing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"message": "CARD_DECLINED"}')
      });

      const result = await gateway.processPaymentWithToken('test-token', mockPaymentRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CARD_DECLINED');
    });
  });

  describe('verifyPayment', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ locations: [] })
      });
      await gateway.initialize();
    });

    it('should verify payment successfully', async () => {
      const mockSquarePayment = {
        id: 'sq-payment-123',
        status: 'COMPLETED',
        amount_money: {
          amount: 2500,
          currency: 'USD'
        },
        created_at: '2023-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ payment: mockSquarePayment })
      });

      const result = await gateway.verifyPayment('sq-payment-123');

      expect(result.transactionId).toBe('sq-payment-123');
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(25.00);
    });

    it('should handle verification errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('{"message": "Payment not found"}')
      });

      await expect(gateway.verifyPayment('invalid-payment')).rejects.toThrow();
    });
  });

  describe('processRefund', () => {
    const mockRefundRequest: RefundRequest = {
      transactionId: 'sq-payment-123',
      amount: 25.00,
      reason: 'Customer request'
    };

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ locations: [] })
      });
      await gateway.initialize();
    });

    it('should process refund successfully', async () => {
      const mockSquareRefund = {
        id: 'sq-refund-123',
        status: 'PENDING',
        amount_money: {
          amount: 2500,
          currency: 'USD'
        },
        created_at: '2023-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ refund: mockSquareRefund })
      });

      const result = await gateway.processRefund(mockRefundRequest);

      expect(result.refundId).toBe('sq-refund-123');
      expect(result.transactionId).toBe('sq-payment-123');
      expect(result.amount).toBe(25.00);
      expect(result.status).toBe('pending');
    });

    it('should handle refund errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"message": "Invalid payment ID"}')
      });

      await expect(gateway.processRefund(mockRefundRequest)).rejects.toThrow();
    });
  });

  describe('handleWebhook', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ locations: [] })
      });
      await gateway.initialize();
    });

    it('should handle payment webhook', async () => {
      const mockWebhookPayload = {
        type: 'payment.updated',
        data: {
          object: {
            payment: {
              id: 'sq-payment-123',
              status: 'COMPLETED'
            }
          }
        },
        created_at: '2023-01-01T00:00:00Z'
      };

      const result = await gateway.handleWebhook(mockWebhookPayload, 'test-signature');

      expect(result.gateway).toBe('square');
      expect(result.eventType).toBe('payment.updated');
      expect(result.transactionId).toBe('sq-payment-123');
      expect(result.status).toBe('completed');
    });

    it('should handle webhook processing errors', async () => {
      const invalidPayload = {};

      await expect(gateway.handleWebhook(invalidPayload)).resolves.toBeTruthy();
    });
  });

  describe('getPaymentMethod', () => {
    it('should return correct payment method info', () => {
      const paymentMethod = gateway.getPaymentMethod();

      expect(paymentMethod.gateway).toBe('square');
      expect(paymentMethod.name).toBe('Square');
      expect(paymentMethod.supportedCurrencies).toContain('USD');
      expect(paymentMethod.fees.percentage).toBe(2.6);
    });
  });

  describe('error mapping', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ locations: [] })
      });
      await gateway.initialize();
    });

    it('should map insufficient funds error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"message": "INSUFFICIENT_FUNDS"}')
      });

      const result = await gateway.processPaymentWithToken('test-token', {
        amount: 25.00,
        currency: 'USD',
        orderId: 'order-123',
        description: 'Test payment',
        customerEmail: 'test@example.com'
      });

      expect(result.error?.code).toBe('INSUFFICIENT_FUNDS');
      expect(result.error?.retryable).toBe(true);
    });

    it('should map card declined error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"message": "CARD_DECLINED"}')
      });

      const result = await gateway.processPaymentWithToken('test-token', {
        amount: 25.00,
        currency: 'USD',
        orderId: 'order-123',
        description: 'Test payment',
        customerEmail: 'test@example.com'
      });

      expect(result.error?.code).toBe('CARD_DECLINED');
      expect(result.error?.retryable).toBe(false);
    });
  });

  describe('Square Web SDK integration', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ locations: [] })
      });
      await gateway.initialize();
    });

    it('should return Square payments instance', () => {
      const payments = gateway.getSquarePayments();
      expect(payments).toBe(mockSquarePayments);
    });

    it('should check Cash App Pay availability', () => {
      const isAvailable = gateway.isCashAppPayAvailable();
      expect(isAvailable).toBe(true);
    });
  });
});