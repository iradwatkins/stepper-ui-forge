import { CashAppGateway } from '../CashAppGateway';
import { PaymentRequest, GatewayInitOptions } from '../../types';

// Mock Square Web SDK
const mockSquarePayments = {
  cashAppPay: jest.fn(),
};

const mockCashAppPay = {
  attach: jest.fn(),
  addEventListener: jest.fn(),
  tokenize: jest.fn(),
};

// Mock window.Square
Object.defineProperty(window, 'Square', {
  value: {
    payments: jest.fn(() => mockSquarePayments),
  },
  writable: true,
});

// Mock fetch for Square API calls
global.fetch = jest.fn();

describe('CashAppGateway', () => {
  let gateway: CashAppGateway;
  let mockOptions: GatewayInitOptions;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOptions = {
      environment: 'sandbox',
      credentials: {
        clientId: 'test-app-id',
        accessToken: 'test-access-token',
        locationId: 'test-location-id',
      },
    };

    gateway = new CashAppGateway(mockOptions);

    // Mock successful API responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ locations: [] }),
    });

    mockSquarePayments.cashAppPay.mockResolvedValue(mockCashAppPay);
  });

  describe('constructor', () => {
    it('should initialize with correct gateway type', () => {
      expect(gateway.getGatewayType()).toBe('cashapp');
    });

    it('should set up Square-based configuration', () => {
      expect(gateway['applicationId']).toBe('test-app-id');
      expect(gateway['accessToken']).toBe('test-access-token');
      expect(gateway['locationId']).toBe('test-location-id');
    });

    it('should set sandbox URL for non-production environment', () => {
      expect(gateway['baseUrl']).toBe('https://connect.squareupsandbox.com');
    });

    it('should set production URL for production environment', () => {
      const prodOptions = { ...mockOptions, environment: 'production' as const };
      const prodGateway = new CashAppGateway(prodOptions);
      expect(prodGateway['baseUrl']).toBe('https://connect.squareup.com');
    });
  });

  describe('initialize', () => {
    it('should successfully initialize with valid credentials', async () => {
      await gateway.initialize();
      
      expect(gateway.isReady()).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://connect.squareupsandbox.com/v2/locations',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token',
          }),
        })
      );
    });

    it('should throw error with missing credentials', async () => {
      const invalidOptions = {
        ...mockOptions,
        credentials: { clientId: '', accessToken: '', locationId: '' },
      };
      const invalidGateway = new CashAppGateway(invalidOptions);

      await expect(invalidGateway.initialize()).rejects.toThrow(
        'Cash App Pay requires Square application ID, access token, and location ID'
      );
    });

    it('should handle Square Web SDK initialization', async () => {
      await gateway.initialize();
      
      expect((window as any).Square.payments).toHaveBeenCalledWith('test-app-id', 'test-location-id');
      expect(mockSquarePayments.cashAppPay).toHaveBeenCalledWith({
        redirectURL: window.location.origin,
        referenceId: 'test-reference',
      });
    });

    it('should handle missing Square Web SDK gracefully', async () => {
      const originalSquare = (window as any).Square;
      delete (window as any).Square;

      await gateway.initialize();
      
      expect(gateway.isReady()).toBe(true);
      
      // Restore Square
      (window as any).Square = originalSquare;
    });

    it('should handle API connection failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(gateway.initialize()).rejects.toThrow('Cash App initialization failed');
    });
  });

  describe('processPayment', () => {
    beforeEach(async () => {
      await gateway.initialize();
    });

    const validPaymentRequest: PaymentRequest = {
      amount: 100.00,
      currency: 'USD',
      orderId: 'order-123',
      description: 'Test payment',
      customerEmail: 'test@example.com',
    };

    it('should process payment request successfully', async () => {
      const result = await gateway.processPayment(validPaymentRequest);

      expect(result.success).toBe(true);
      expect(result.requiresAction).toBe(true);
      expect(result.payment?.gateway).toBe('cashapp');
      expect(result.payment?.status).toBe('pending');
      expect(result.payment?.amount).toBe(100.00);
      expect(result.payment?.metadata?.requiresClientSideProcessing).toBe(true);
    });

    it('should validate payment request', async () => {
      const invalidRequest = { ...validPaymentRequest, amount: -10 };
      
      const result = await gateway.processPayment(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_AMOUNT');
    });

    it('should prepare Cash App request metadata', async () => {
      const result = await gateway.processPayment(validPaymentRequest);

      expect(result.payment?.metadata?.cashAppRequest).toEqual({
        amount: 10000, // Convert to cents
        currency: 'USD',
        orderId: 'order-123',
        description: 'Test payment',
        redirectURL: window.location.origin,
        referenceId: 'order-123',
      });
    });

    it('should handle payment processing errors', async () => {
      // Mock validation to throw error
      jest.spyOn(gateway as any, 'validatePaymentRequest').mockReturnValue({
        code: 'INVALID_REQUEST',
        message: 'Invalid request',
        gateway: 'cashapp',
        retryable: false,
        userMessage: 'Please check your payment details',
      });

      const result = await gateway.processPayment(validPaymentRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REQUEST');
    });
  });

  describe('processPaymentWithToken', () => {
    beforeEach(async () => {
      await gateway.initialize();
    });

    const validPaymentRequest: PaymentRequest = {
      amount: 50.00,
      currency: 'USD',
      orderId: 'order-456',
      description: 'Token payment',
      customerEmail: 'test@example.com',
    };

    it('should process payment with token successfully', async () => {
      const mockPayment = {
        id: 'payment-123',
        status: 'COMPLETED',
        amount_money: { amount: 5000, currency: 'USD' },
        created_at: '2023-01-01T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ payment: mockPayment }),
      });

      const result = await gateway.processPaymentWithToken('token-123', validPaymentRequest);

      expect(result.success).toBe(true);
      expect(result.payment?.transactionId).toBe('payment-123');
      expect(result.payment?.status).toBe('completed');
      expect(result.payment?.amount).toBe(50.00);
      expect(result.payment?.gateway).toBe('cashapp');
    });

    it('should make correct Square API call', async () => {
      const mockPayment = {
        id: 'payment-123',
        status: 'COMPLETED',
        amount_money: { amount: 5000, currency: 'USD' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ payment: mockPayment }),
      });

      await gateway.processPaymentWithToken('token-123', validPaymentRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://connect.squareupsandbox.com/v2/payments',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            source_id: 'token-123',
            amount_money: { amount: 5000, currency: 'USD' },
            idempotency_key: expect.stringContaining('order-456'),
            order_id: 'order-456',
            note: 'Cash App Pay: Token payment',
            buyer_email_address: 'test@example.com',
          }),
        })
      );
    });

    it('should handle payment creation failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"message": "Payment failed"}'),
      });

      const result = await gateway.processPaymentWithToken('token-123', validPaymentRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CASHAPP_ERROR');
    });
  });

  describe('verifyPayment', () => {
    beforeEach(async () => {
      await gateway.initialize();
    });

    it('should verify payment successfully', async () => {
      const mockPayment = {
        id: 'payment-123',
        status: 'COMPLETED',
        amount_money: { amount: 7500, currency: 'USD' },
        created_at: '2023-01-01T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ payment: mockPayment }),
      });

      const response = await gateway.verifyPayment('payment-123');

      expect(response.transactionId).toBe('payment-123');
      expect(response.status).toBe('completed');
      expect(response.amount).toBe(75.00);
      expect(response.gateway).toBe('cashapp');
      expect(response.metadata?.cashAppPay).toBe(true);
    });

    it('should handle payment not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('{"message": "Payment not found"}'),
      });

      await expect(gateway.verifyPayment('invalid-id')).rejects.toThrow();
    });
  });

  describe('processRefund', () => {
    beforeEach(async () => {
      await gateway.initialize();
    });

    it('should process refund successfully', async () => {
      const mockRefund = {
        id: 'refund-123',
        status: 'COMPLETED',
        amount_money: { amount: 2500, currency: 'USD' },
        created_at: '2023-01-01T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ refund: mockRefund }),
      });

      const refundRequest = {
        transactionId: 'payment-123',
        amount: 25.00,
        reason: 'Customer request',
      };

      const response = await gateway.processRefund(refundRequest);

      expect(response.refundId).toBe('refund-123');
      expect(response.transactionId).toBe('payment-123');
      expect(response.amount).toBe(25.00);
      expect(response.status).toBe('completed');
      expect(response.gateway).toBe('cashapp');
    });

    it('should handle full refund (no amount specified)', async () => {
      const mockRefund = {
        id: 'refund-456',
        status: 'COMPLETED',
        amount_money: { amount: 10000, currency: 'USD' },
        created_at: '2023-01-01T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ refund: mockRefund }),
      });

      const refundRequest = {
        transactionId: 'payment-456',
        reason: 'Full refund',
      };

      await gateway.processRefund(refundRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://connect.squareupsandbox.com/v2/refunds',
        expect.objectContaining({
          body: expect.stringContaining('"amount_money":undefined'),
        })
      );
    });
  });

  describe('handleWebhook', () => {
    beforeEach(async () => {
      await gateway.initialize();
    });

    it('should handle payment webhook successfully', async () => {
      const webhookPayload = {
        type: 'payment.updated',
        created_at: '2023-01-01T00:00:00Z',
        data: {
          object: {
            payment: {
              id: 'payment-123',
              status: 'COMPLETED',
            },
          },
        },
      };

      const result = await gateway.handleWebhook(webhookPayload, 'signature-123');

      expect(result.gateway).toBe('cashapp');
      expect(result.eventType).toBe('payment.updated');
      expect(result.transactionId).toBe('payment-123');
      expect(result.status).toBe('completed');
      expect(result.signature).toBe('signature-123');
    });

    it('should handle non-payment webhooks', async () => {
      const webhookPayload = {
        type: 'invoice.updated',
        created_at: '2023-01-01T00:00:00Z',
        data: { object: { invoice: { id: 'inv-123' } } },
      };

      const result = await gateway.handleWebhook(webhookPayload);

      expect(result.gateway).toBe('cashapp');
      expect(result.eventType).toBe('invoice.updated');
      expect(result.transactionId).toBeUndefined();
      expect(result.status).toBeUndefined();
    });
  });

  describe('getPaymentMethod', () => {
    it('should return correct payment method configuration', async () => {
      await gateway.initialize();
      
      const paymentMethod = gateway.getPaymentMethod();

      expect(paymentMethod).toEqual({
        gateway: 'cashapp',
        name: 'Cash App Pay',
        description: 'Pay instantly with your Cash App',
        enabled: true,
        supportedCurrencies: ['USD'],
        fees: {
          percentage: 2.75,
          fixed: 0.15,
        },
        minAmount: 1.00,
        maxAmount: 2500,
      });
    });

    it('should show as disabled when not initialized', () => {
      const paymentMethod = gateway.getPaymentMethod();
      expect(paymentMethod.enabled).toBe(false);
    });
  });

  describe('error mapping', () => {
    beforeEach(async () => {
      await gateway.initialize();
    });

    it('should map insufficient funds error', () => {
      const error = new Error('INSUFFICIENT_FUNDS: Not enough money');
      const mappedError = gateway['mapCashAppError'](error);

      expect(mappedError.code).toBe('INSUFFICIENT_FUNDS');
      expect(mappedError.retryable).toBe(true);
      expect(mappedError.userMessage).toContain('Insufficient funds');
    });

    it('should map payment declined error', () => {
      const error = new Error('PAYMENT_DECLINED: Payment declined by issuer');
      const mappedError = gateway['mapCashAppError'](error);

      expect(mappedError.code).toBe('PAYMENT_DECLINED');
      expect(mappedError.retryable).toBe(false);
      expect(mappedError.userMessage).toContain('Payment was declined');
    });

    it('should map Cash App not activated error', () => {
      const error = new Error('CASHAPP_NOT_ACTIVATED: Account not set up');
      const mappedError = gateway['mapCashAppError'](error);

      expect(mappedError.code).toBe('CASHAPP_NOT_ACTIVATED');
      expect(mappedError.userMessage).toContain('Cash App account needs to be set up');
    });

    it('should map authentication errors', () => {
      const error = new Error('401 Unauthorized');
      const mappedError = gateway['mapCashAppError'](error);

      expect(mappedError.code).toBe('AUTHENTICATION_FAILED');
      expect(mappedError.retryable).toBe(true);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error occurred');
      const mappedError = gateway['mapCashAppError'](error);

      expect(mappedError.code).toBe('CASHAPP_ERROR');
      expect(mappedError.retryable).toBe(true);
      expect(mappedError.userMessage).toContain('Cash App payment failed');
    });
  });

  describe('Cash App Pay button creation', () => {
    beforeEach(async () => {
      await gateway.initialize();
    });

    it('should create Cash App Pay button successfully', async () => {
      const callbacks = {
        onPayment: jest.fn(),
        onError: jest.fn(),
      };

      const button = await gateway.createCashAppPayButton('cashapp-container', callbacks);

      expect(mockSquarePayments.cashAppPay).toHaveBeenCalledWith({
        redirectURL: window.location.origin,
        referenceId: expect.stringContaining('cashapp-'),
      });

      expect(mockCashAppPay.attach).toHaveBeenCalledWith('#cashapp-container', {
        size: 'medium',
        shape: 'round',
      });

      expect(mockCashAppPay.addEventListener).toHaveBeenCalledWith(
        'ontokenization',
        expect.any(Function)
      );

      expect(button).toBe(mockCashAppPay);
    });

    it('should handle button creation failure', async () => {
      const callbacks = { onError: jest.fn() };
      mockSquarePayments.cashAppPay.mockRejectedValue(new Error('Button creation failed'));

      await expect(
        gateway.createCashAppPayButton('cashapp-container', callbacks)
      ).rejects.toThrow('Button creation failed');

      expect(callbacks.onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should throw error when not initialized', async () => {
      const uninitializedGateway = new CashAppGateway(mockOptions);
      
      await expect(
        uninitializedGateway.createCashAppPayButton('container')
      ).rejects.toThrow('Cash App Pay not initialized');
    });
  });

  describe('helper methods', () => {
    beforeEach(async () => {
      await gateway.initialize();
    });

    it('should get Square payments instance', () => {
      const payments = gateway.getSquarePayments();
      expect(payments).toBe(mockSquarePayments);
    });

    it('should map Square statuses correctly', () => {
      expect(gateway['mapSquareStatus']('COMPLETED')).toBe('completed');
      expect(gateway['mapSquareStatus']('PENDING')).toBe('pending');
      expect(gateway['mapSquareStatus']('CANCELED')).toBe('cancelled');
      expect(gateway['mapSquareStatus']('FAILED')).toBe('failed');
      expect(gateway['mapSquareStatus']('UNKNOWN')).toBe('pending');
    });
  });
});