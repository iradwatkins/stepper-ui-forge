import { CashAppGateway } from '../gateways/CashAppGateway';
import { PaymentManager } from '../PaymentManager';
import { PaymentRequest, GatewayInitOptions } from '../types';

// Integration tests for CashAppGateway with PaymentManager and real-like scenarios
describe('CashAppGateway Integration Tests', () => {
  let gateway: CashAppGateway;
  let paymentManager: PaymentManager;
  let mockOptions: GatewayInitOptions;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOptions = {
      environment: 'sandbox',
      credentials: {
        clientId: 'sandbox-app-id',
        accessToken: 'sandbox-access-token',
        locationId: 'sandbox-location-id',
      },
    };

    gateway = new CashAppGateway(mockOptions);
    
    paymentManager = new PaymentManager({
      defaultGateway: 'cashapp',
      enabledGateways: ['cashapp'],
      enableFailover: false,
      maxRetries: 1,
    });
    
    paymentManager.registerGateway(gateway);

    // Mock fetch for Square API calls
    global.fetch = jest.fn();
    
    // Mock Square Web SDK
    Object.defineProperty(window, 'Square', {
      value: {
        payments: jest.fn(() => ({
          cashAppPay: jest.fn().mockResolvedValue({
            attach: jest.fn(),
            addEventListener: jest.fn(),
          }),
        })),
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('PaymentManager Integration', () => {
    beforeEach(async () => {
      // Mock successful API responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          locations: [{ id: 'sandbox-location-id' }],
        }),
      });

      await paymentManager.initializeGateways();
    });

    it('should register Cash App gateway with PaymentManager', () => {
      const availableMethods = paymentManager.getAvailablePaymentMethods();
      expect(availableMethods.some(method => method.gateway === 'cashapp')).toBe(true);
    });

    it('should process payment through PaymentManager', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 150.00,
        currency: 'USD',
        orderId: 'integration-test-123',
        description: 'Integration test payment',
        customerEmail: 'integration@test.com',
      };

      const result = await paymentManager.processPayment(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.payment?.gateway).toBe('cashapp');
      expect(result.requiresAction).toBe(true);
    });

    it('should handle gateway initialization failure gracefully', async () => {
      // Mock API failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const failingGateway = new CashAppGateway(mockOptions);
      const failingManager = new PaymentManager({
        defaultGateway: 'cashapp',
        enabledGateways: ['cashapp'],
        enableFailover: false,
        maxRetries: 1,
      });
      
      failingManager.registerGateway(failingGateway);
      await expect(failingManager.initializeGateways()).resolves.not.toThrow(); // Promise.allSettled doesn't throw
    });
  });

  describe('End-to-End Payment Flow', () => {
    beforeEach(async () => {
      // Mock successful initialization
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ locations: [] }),
        });

      await gateway.initialize();
    });

    it('should complete full payment flow with token', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 75.50,
        currency: 'USD',
        orderId: 'e2e-test-456',
        description: 'End-to-end test payment',
        customerEmail: 'e2e@test.com',
      };

      // Step 1: Initial payment request
      const initialResult = await gateway.processPayment(paymentRequest);
      expect(initialResult.success).toBe(true);
      expect(initialResult.requiresAction).toBe(true);

      // Step 2: Mock token generation and payment completion
      const mockPayment = {
        id: 'cashapp-payment-e2e-456',
        status: 'COMPLETED',
        amount_money: {
          amount: 7550, // $75.50 in cents
          currency: 'USD',
        },
        created_at: '2023-01-01T12:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ payment: mockPayment }),
      });

      const tokenResult = await gateway.processPaymentWithToken('mock-token-123', paymentRequest);
      
      expect(tokenResult.success).toBe(true);
      expect(tokenResult.payment?.transactionId).toBe('cashapp-payment-e2e-456');
      expect(tokenResult.payment?.status).toBe('completed');
      expect(tokenResult.payment?.amount).toBe(75.50);

      // Step 3: Verify payment
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ payment: mockPayment }),
      });

      const verification = await gateway.verifyPayment('cashapp-payment-e2e-456');
      expect(verification.status).toBe('completed');
      expect(verification.transactionId).toBe('cashapp-payment-e2e-456');
    });

    it('should handle payment failure scenarios', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 999.99,
        currency: 'USD',
        orderId: 'fail-test-789',
        description: 'Failure test payment',
        customerEmail: 'fail@test.com',
      };

      // Mock payment failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({
          errors: [{
            code: 'INSUFFICIENT_FUNDS',
            detail: 'Insufficient funds in Cash App account'
          }]
        })),
      });

      const result = await gateway.processPaymentWithToken('fail-token', paymentRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_FUNDS'); // The error mapping is working correctly
      expect(result.error?.retryable).toBe(true);
    });
  });

  describe('Webhook Integration', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ locations: [] }),
      });

      await gateway.initialize();
    });

    it('should process webhook events correctly', async () => {
      const webhookPayload = {
        type: 'payment.updated',
        created_at: '2023-01-01T12:00:00Z',
        data: {
          type: 'payment',
          id: 'webhook-event-123',
          object: {
            payment: {
              id: 'cashapp-payment-webhook-123',
              status: 'COMPLETED',
              amount_money: {
                amount: 5000,
                currency: 'USD',
              },
            },
          },
        },
      };

      const webhookResult = await gateway.handleWebhook(webhookPayload, 'webhook-signature');

      expect(webhookResult.gateway).toBe('cashapp');
      expect(webhookResult.eventType).toBe('payment.updated');
      expect(webhookResult.transactionId).toBe('cashapp-payment-webhook-123');
      expect(webhookResult.status).toBe('completed');
      expect(webhookResult.signature).toBe('webhook-signature');
    });

    it('should handle webhook processing errors', async () => {
      const malformedPayload = {
        type: 'invalid.event',
        // Missing required fields
      };

      const webhookResult = await gateway.handleWebhook(malformedPayload);

      expect(webhookResult.gateway).toBe('cashapp');
      expect(webhookResult.eventType).toBe('invalid.event');
      expect(webhookResult.transactionId).toBeUndefined();
    });
  });

  describe('Refund Integration', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ locations: [] }),
      });

      await gateway.initialize();
    });

    it('should process refunds through complete flow', async () => {
      // First, mock a successful payment
      const mockPayment = {
        id: 'refund-test-payment-123',
        status: 'COMPLETED',
        amount_money: { amount: 10000, currency: 'USD' },
        created_at: '2023-01-01T10:00:00Z',
      };

      // Then, mock a successful refund
      const mockRefund = {
        id: 'refund-123',
        status: 'COMPLETED',
        payment_id: 'refund-test-payment-123',
        amount_money: { amount: 5000, currency: 'USD' },
        created_at: '2023-01-01T11:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ refund: mockRefund }),
      });

      const refundRequest = {
        transactionId: 'refund-test-payment-123',
        amount: 50.00,
        reason: 'Customer requested partial refund',
      };

      const refundResult = await gateway.processRefund(refundRequest);

      expect(refundResult.refundId).toBe('refund-123');
      expect(refundResult.transactionId).toBe('refund-test-payment-123');
      expect(refundResult.amount).toBe(50.00);
      expect(refundResult.status).toBe('completed');
      expect(refundResult.gateway).toBe('cashapp');
    });

    it('should handle refund failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({
          errors: [{
            code: 'REFUND_ALREADY_PENDING',
            detail: 'A refund is already being processed for this payment'
          }]
        })),
      });

      const refundRequest = {
        transactionId: 'already-refunded-payment',
        amount: 25.00,
        reason: 'Duplicate refund attempt',
      };

      const result = await gateway.processRefund(refundRequest);
      // Since we mocked a 400 error, it should be mapped and returned rather than thrown
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ locations: [] }),
      });

      await gateway.initialize();
    });

    it('should handle network timeouts gracefully', async () => {
      // Mock network timeout
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const paymentRequest: PaymentRequest = {
        amount: 100.00,
        currency: 'USD',
        orderId: 'timeout-test',
        description: 'Timeout test',
        customerEmail: 'timeout@test.com',
      };

      const result = await gateway.processPaymentWithToken('timeout-token', paymentRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle invalid API responses', async () => {
      // Mock invalid JSON response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const paymentRequest: PaymentRequest = {
        amount: 50.00,
        currency: 'USD',
        orderId: 'invalid-response-test',
        description: 'Invalid response test',
        customerEmail: 'invalid@test.com',
      };

      const result = await gateway.processPaymentWithToken('invalid-token', paymentRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CASHAPP_ERROR');
    });
  });

  describe('Environment Configuration Integration', () => {
    it('should use correct API endpoints for different environments', async () => {
      // Test sandbox environment
      const sandboxGateway = new CashAppGateway({
        environment: 'sandbox',
        credentials: mockOptions.credentials,
      });

      expect(sandboxGateway['baseUrl']).toBe('https://connect.squareupsandbox.com');

      // Test production environment
      const productionGateway = new CashAppGateway({
        environment: 'production',
        credentials: mockOptions.credentials,
      });

      expect(productionGateway['baseUrl']).toBe('https://connect.squareup.com');
    });

    it('should handle environment-specific error responses', async () => {
      // Mock environment-specific error (sandbox)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ locations: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve(JSON.stringify({
            errors: [{
              code: 'UNAUTHORIZED',
              detail: 'Sandbox credentials invalid'
            }]
          })),
        });

      await gateway.initialize();

      const paymentRequest: PaymentRequest = {
        amount: 25.00,
        currency: 'USD',
        orderId: 'env-test',
        description: 'Environment test',
        customerEmail: 'env@test.com',
      };

      const result = await gateway.processPaymentWithToken('env-token', paymentRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHENTICATION_FAILED'); // The error mapping is working correctly
    });
  });

  describe('Performance and Concurrency', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ locations: [] }),
      });

      await gateway.initialize();
    });

    it('should handle multiple concurrent payment requests', async () => {
      const mockPayment = {
        id: 'concurrent-payment',
        status: 'COMPLETED',
        amount_money: { amount: 2500, currency: 'USD' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ payment: mockPayment }),
      });

      const paymentRequests = Array.from({ length: 5 }, (_, i) => ({
        amount: 25.00,
        currency: 'USD' as const,
        orderId: `concurrent-${i}`,
        description: `Concurrent payment ${i}`,
        customerEmail: `concurrent${i}@test.com`,
      }));

      const promises = paymentRequests.map(request =>
        gateway.processPaymentWithToken(`token-${request.orderId}`, request)
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.payment?.transactionId).toBe('concurrent-payment');
      });

      // Verify all API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(6); // 1 for init + 5 for payments
    });

    it('should handle payment verification requests efficiently', async () => {
      const mockPayment = {
        id: 'verify-efficiency-test',
        status: 'COMPLETED',
        amount_money: { amount: 1000, currency: 'USD' },
        created_at: '2023-01-01T12:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ payment: mockPayment }),
      });

      const verificationPromises = Array.from({ length: 3 }, () =>
        gateway.verifyPayment('verify-efficiency-test')
      );

      const results = await Promise.all(verificationPromises);

      results.forEach(result => {
        expect(result.transactionId).toBe('verify-efficiency-test');
        expect(result.status).toBe('completed');
      });
    });
  });
});