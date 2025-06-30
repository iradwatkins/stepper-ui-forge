// PayPal Gateway Unit Tests

import { PayPalGateway } from '../PayPalGateway';
import type { PaymentRequest, GatewayInitOptions } from '../../types';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('PayPalGateway', () => {
  let gateway: PayPalGateway;
  let initOptions: GatewayInitOptions;

  beforeEach(() => {
    initOptions = {
      environment: 'sandbox',
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      },
      returnUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    };
    
    gateway = new PayPalGateway(initOptions);
    
    // Reset fetch mock
    mockFetch.mockReset();
  });

  describe('initialization', () => {
    it('should initialize successfully with valid credentials', async () => {
      // Mock token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600
        })
      } as Response);

      await gateway.initialize();
      
      expect(gateway.isReady()).toBe(true);
      expect(gateway.getGatewayType()).toBe('paypal');
      expect(gateway.getEnvironment()).toBe('sandbox');
    });

    it('should fail initialization with missing credentials', async () => {
      const invalidOptions = {
        ...initOptions,
        credentials: { clientId: '', clientSecret: '' }
      };
      
      const invalidGateway = new PayPalGateway(invalidOptions);
      
      await expect(invalidGateway.initialize()).rejects.toThrow(/PayPal client ID and secret are required/);
    });

    it('should fail initialization with invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      } as Response);

      await expect(gateway.initialize()).rejects.toThrow(/PAYPAL_INIT_FAILED/);
    });
  });

  describe('processPayment', () => {
    const validPaymentRequest: PaymentRequest = {
      amount: 25.00,
      currency: 'USD',
      orderId: 'order-123',
      description: 'Test payment',
      customerEmail: 'test@example.com',
      customerName: 'Test User'
    };

    beforeEach(async () => {
      // Mock initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600
        })
      } as Response);
      
      await gateway.initialize();
      mockFetch.mockClear();
    });

    it('should create PayPal order successfully', async () => {
      const mockOrder = {
        id: 'paypal-order-123',
        status: 'CREATED',
        links: [
          { href: 'https://paypal.com/approve', rel: 'approve', method: 'GET' }
        ],
        purchase_units: [{}]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response);

      const result = await gateway.processPayment(validPaymentRequest);
      
      expect(result.success).toBe(true);
      expect(result.payment?.transactionId).toBe('paypal-order-123');
      expect(result.payment?.status).toBe('pending');
      expect(result.requiresAction).toBe(true);
      expect(result.redirectUrl).toBe('https://paypal.com/approve');
    });

    it('should validate payment request', async () => {
      const invalidRequest = {
        ...validPaymentRequest,
        amount: 0
      };

      const result = await gateway.processPayment(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_AMOUNT');
    });

    it('should handle PayPal API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Invalid request' })
      } as Response);

      const result = await gateway.processPayment(validPaymentRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PAYPAL_ERROR');
    });

    it('should handle missing approval URL', async () => {
      const mockOrder = {
        id: 'paypal-order-123',
        status: 'CREATED',
        links: [],
        purchase_units: [{}]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response);

      const result = await gateway.processPayment(validPaymentRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('No approval URL');
    });
  });

  describe('verifyPayment', () => {
    beforeEach(async () => {
      // Mock initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600
        })
      } as Response);
      
      await gateway.initialize();
      mockFetch.mockClear();
    });

    it('should verify completed payment', async () => {
      const mockOrder = {
        id: 'paypal-order-123',
        status: 'COMPLETED',
        purchase_units: [{
          payments: {
            captures: [{
              id: 'capture-123',
              status: 'COMPLETED',
              amount: {
                currency_code: 'USD',
                value: '25.00'
              },
              create_time: '2023-01-01T00:00:00Z'
            }]
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response);

      const result = await gateway.verifyPayment('paypal-order-123');
      
      expect(result.transactionId).toBe('paypal-order-123');
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(25.00);
      expect(result.currency).toBe('USD');
      expect(result.paidAt).toBeInstanceOf(Date);
    });

    it('should handle order not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Order not found' })
      } as Response);

      await expect(gateway.verifyPayment('invalid-order')).rejects.toThrow(/PayPal API error: 404/);
    });
  });

  describe('processRefund', () => {
    beforeEach(async () => {
      // Mock initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600
        })
      } as Response);
      
      await gateway.initialize();
      mockFetch.mockClear();
    });

    it('should process full refund successfully', async () => {
      const mockOrder = {
        id: 'paypal-order-123',
        status: 'COMPLETED',
        purchase_units: [{
          payments: {
            captures: [{
              id: 'capture-123',
              status: 'COMPLETED',
              amount: {
                currency_code: 'USD',
                value: '25.00'
              }
            }]
          }
        }]
      };

      const mockRefund = {
        id: 'refund-123',
        status: 'COMPLETED',
        amount: {
          currency_code: 'USD',
          value: '25.00'
        },
        create_time: '2023-01-01T01:00:00Z'
      };

      // Mock order lookup
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response);

      // Mock refund request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRefund
      } as Response);

      const result = await gateway.processRefund({
        transactionId: 'paypal-order-123',
        reason: 'Customer request'
      });
      
      expect(result.refundId).toBe('refund-123');
      expect(result.transactionId).toBe('paypal-order-123');
      expect(result.amount).toBe(25.00);
      expect(result.status).toBe('completed');
    });

    it('should handle missing capture', async () => {
      const mockOrder = {
        id: 'paypal-order-123',
        status: 'CREATED',
        purchase_units: [{}]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response);

      await expect(gateway.processRefund({
        transactionId: 'paypal-order-123'
      })).rejects.toThrow(/No capture found/);
    });
  });

  describe('handleWebhook', () => {
    beforeEach(async () => {
      // Mock initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600
        })
      } as Response);
      
      await gateway.initialize();
      mockFetch.mockClear();
    });

    it('should handle payment capture webhook', async () => {
      const webhookPayload = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'capture-123',
          status: 'COMPLETED'
        },
        create_time: '2023-01-01T00:00:00Z'
      };

      const result = await gateway.handleWebhook(webhookPayload, 'test-signature');
      
      expect(result.gateway).toBe('paypal');
      expect(result.eventType).toBe('PAYMENT.CAPTURE.COMPLETED');
      expect(result.transactionId).toBe('capture-123');
      expect(result.status).toBe('completed');
      expect(result.signature).toBe('test-signature');
    });

    it('should handle order webhook', async () => {
      const webhookPayload = {
        event_type: 'CHECKOUT.ORDER.APPROVED',
        resource: {
          id: 'order-123',
          status: 'APPROVED'
        },
        create_time: '2023-01-01T00:00:00Z'
      };

      const result = await gateway.handleWebhook(webhookPayload);
      
      expect(result.gateway).toBe('paypal');
      expect(result.eventType).toBe('CHECKOUT.ORDER.APPROVED');
      expect(result.transactionId).toBe('order-123');
      expect(result.status).toBe('processing');
    });
  });

  describe('getPaymentMethod', () => {
    it('should return PayPal payment method info', () => {
      const method = gateway.getPaymentMethod();
      
      expect(method.gateway).toBe('paypal');
      expect(method.name).toBe('PayPal');
      expect(method.enabled).toBe(false); // Not initialized yet
      expect(method.supportedCurrencies).toContain('USD');
      expect(method.fees?.percentage).toBe(2.9);
      expect(method.fees?.fixed).toBe(0.30);
    });

    it('should show enabled after initialization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600
        })
      } as Response);

      await gateway.initialize();
      
      const method = gateway.getPaymentMethod();
      expect(method.enabled).toBe(true);
    });
  });

  describe('error mapping', () => {
    beforeEach(async () => {
      // Mock initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600
        })
      } as Response);
      
      await gateway.initialize();
      mockFetch.mockClear();
    });

    it('should map insufficient funds error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'INSUFFICIENT_FUNDS' })
      } as Response);

      const result = await gateway.processPayment({
        amount: 100,
        currency: 'USD',
        orderId: 'test-order',
        description: 'Test',
        customerEmail: 'test@example.com'
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_FUNDS');
      expect(result.error?.retryable).toBe(true);
    });

    it('should map payment denied error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'PAYMENT_DENIED' })
      } as Response);

      const result = await gateway.processPayment({
        amount: 100,
        currency: 'USD',
        orderId: 'test-order',
        description: 'Test',
        customerEmail: 'test@example.com'
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PAYMENT_DENIED');
      expect(result.error?.retryable).toBe(false);
    });

    it('should map authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      } as Response);

      const result = await gateway.processPayment({
        amount: 100,
        currency: 'USD',
        orderId: 'test-order',
        description: 'Test',
        customerEmail: 'test@example.com'
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHENTICATION_FAILED');
      expect(result.error?.retryable).toBe(true);
    });
  });
});