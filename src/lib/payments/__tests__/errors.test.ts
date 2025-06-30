import {
  ERROR_CODES,
  ERROR_MESSAGES,
  mapGatewayError,
  createStandardError,
  isRetryableError,
  getUserErrorMessage,
  PAYPAL_ERROR_MAP,
  SQUARE_ERROR_MAP,
  CASHAPP_ERROR_MAP
} from '../errors';
import { PaymentError } from '../types';

describe('Payment Error Handling', () => {
  describe('ERROR_CODES', () => {
    it('should contain all required error codes', () => {
      expect(ERROR_CODES.INVALID_AMOUNT).toBe('INVALID_AMOUNT');
      expect(ERROR_CODES.CARD_DECLINED).toBe('CARD_DECLINED');
      expect(ERROR_CODES.GATEWAY_TIMEOUT).toBe('GATEWAY_TIMEOUT');
      expect(ERROR_CODES.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have user-friendly messages for all error codes', () => {
      Object.values(ERROR_CODES).forEach(code => {
        expect(ERROR_MESSAGES[code]).toBeDefined();
        expect(ERROR_MESSAGES[code]).toMatch(/^[A-Z]/); // Should start with capital letter
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(10); // Should be descriptive
      });
    });
  });

  describe('mapGatewayError', () => {
    it('should map PayPal errors correctly', () => {
      const error = mapGatewayError('INSUFFICIENT_FUNDS', 'paypal');
      
      expect(error.code).toBe(ERROR_CODES.INSUFFICIENT_FUNDS);
      expect(error.gateway).toBe('paypal');
      expect(error.retryable).toBe(false);
      expect(error.userMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INSUFFICIENT_FUNDS]);
    });

    it('should map Square errors correctly', () => {
      const error = mapGatewayError('CARD_DECLINED', 'square');
      
      expect(error.code).toBe(ERROR_CODES.CARD_DECLINED);
      expect(error.gateway).toBe('square');
      expect(error.retryable).toBe(false);
    });

    it('should map Cash App errors correctly', () => {
      const error = mapGatewayError('insufficient_funds', 'cashapp');
      
      expect(error.code).toBe(ERROR_CODES.INSUFFICIENT_FUNDS);
      expect(error.gateway).toBe('cashapp');
      expect(error.retryable).toBe(false);
    });

    it('should handle unknown gateway errors', () => {
      const error = mapGatewayError('UNKNOWN_ERROR_CODE', 'paypal');
      
      expect(error.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
      expect(error.gateway).toBe('paypal');
      expect(error.retryable).toBe(true);
    });

    it('should include original error when provided', () => {
      const originalError = new Error('Original error message');
      const error = mapGatewayError('CARD_DECLINED', 'paypal', originalError);
      
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('createStandardError', () => {
    it('should create error from Error object', () => {
      const originalError = new Error('Test error');
      const error = createStandardError(originalError, 'paypal', ERROR_CODES.GATEWAY_ERROR);
      
      expect(error.code).toBe(ERROR_CODES.GATEWAY_ERROR);
      expect(error.message).toBe('Test error');
      expect(error.gateway).toBe('paypal');
      expect(error.originalError).toBe(originalError);
      expect(error.retryable).toBe(true);
    });

    it('should create error from string', () => {
      const error = createStandardError('String error', 'square', ERROR_CODES.INVALID_CARD, false);
      
      expect(error.code).toBe(ERROR_CODES.INVALID_CARD);
      expect(error.message).toBe('String error');
      expect(error.gateway).toBe('square');
      expect(error.originalError).toBeUndefined();
      expect(error.retryable).toBe(false);
    });

    it('should use default values when not provided', () => {
      const error = createStandardError('Default error', 'cashapp');
      
      expect(error.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toBe(ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable errors', () => {
      const error: PaymentError = {
        code: ERROR_CODES.GATEWAY_TIMEOUT,
        message: 'Timeout',
        gateway: 'paypal',
        retryable: true,
        userMessage: 'Please try again'
      };
      
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error: PaymentError = {
        code: ERROR_CODES.CARD_DECLINED,
        message: 'Card declined',
        gateway: 'paypal',
        retryable: false,
        userMessage: 'Please use a different card'
      };
      
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getUserErrorMessage', () => {
    it('should return error userMessage when available', () => {
      const error: PaymentError = {
        code: ERROR_CODES.CARD_DECLINED,
        message: 'Card declined',
        gateway: 'paypal',
        retryable: false,
        userMessage: 'Custom user message'
      };
      
      expect(getUserErrorMessage(error)).toBe('Custom user message');
    });

    it('should return default message when userMessage is not available', () => {
      const error: PaymentError = {
        code: ERROR_CODES.CARD_DECLINED,
        message: 'Card declined',
        gateway: 'paypal',
        retryable: false,
        userMessage: ''
      };
      
      expect(getUserErrorMessage(error)).toBe(ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]);
    });
  });

  describe('Gateway Error Mappings', () => {
    it('should have consistent structure for PayPal errors', () => {
      Object.values(PAYPAL_ERROR_MAP).forEach(mapping => {
        expect(mapping.code).toBeDefined();
        expect(typeof mapping.retryable).toBe('boolean');
        expect(ERROR_CODES).toHaveProperty(mapping.code.split('.')[0] || mapping.code);
      });
    });

    it('should have consistent structure for Square errors', () => {
      Object.values(SQUARE_ERROR_MAP).forEach(mapping => {
        expect(mapping.code).toBeDefined();
        expect(typeof mapping.retryable).toBe('boolean');
        expect(ERROR_CODES).toHaveProperty(mapping.code.split('.')[0] || mapping.code);
      });
    });

    it('should have consistent structure for Cash App errors', () => {
      Object.values(CASHAPP_ERROR_MAP).forEach(mapping => {
        expect(mapping.code).toBeDefined();
        expect(typeof mapping.retryable).toBe('boolean');
        expect(ERROR_CODES).toHaveProperty(mapping.code.split('.')[0] || mapping.code);
      });
    });
  });

  describe('Error Categories', () => {
    it('should categorize validation errors as non-retryable', () => {
      const validationErrors = [
        ERROR_CODES.INVALID_AMOUNT,
        ERROR_CODES.INVALID_CURRENCY,
        ERROR_CODES.INVALID_EMAIL,
        ERROR_CODES.MISSING_REQUIRED_FIELD
      ];

      validationErrors.forEach(code => {
        const error = createStandardError('Validation error', 'paypal', code, false);
        expect(error.retryable).toBe(false);
      });
    });

    it('should categorize network errors as retryable', () => {
      const networkErrors = [
        ERROR_CODES.GATEWAY_TIMEOUT,
        ERROR_CODES.NETWORK_ERROR,
        ERROR_CODES.REQUEST_TIMEOUT
      ];

      networkErrors.forEach(code => {
        const error = createStandardError('Network error', 'paypal', code, true);
        expect(error.retryable).toBe(true);
      });
    });

    it('should categorize payment method errors as non-retryable', () => {
      const paymentErrors = [
        ERROR_CODES.INSUFFICIENT_FUNDS,
        ERROR_CODES.CARD_DECLINED,
        ERROR_CODES.EXPIRED_CARD,
        ERROR_CODES.INVALID_CARD
      ];

      paymentErrors.forEach(code => {
        const error = createStandardError('Payment error', 'paypal', code, false);
        expect(error.retryable).toBe(false);
      });
    });
  });
});