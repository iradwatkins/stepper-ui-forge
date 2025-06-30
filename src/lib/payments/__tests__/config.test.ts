import {
  setEventPaymentConfig,
  getEventPaymentConfig,
  removeEventPaymentConfig,
  getAllEventPaymentConfigs,
  getEnabledGateways,
  getPreferredGateway,
  isGatewayEnabled,
  calculateFees,
  getGatewayFailoverOrder,
  validateGatewayConfig,
  getGatewayConfigStatus,
  createDefaultEventConfig,
  DEFAULT_PAYMENT_CONFIG
} from '../config';
import { EventPaymentConfig } from '../types';

// Mock the payment-config module
jest.mock('../../payment-config', () => ({
  getPaymentConfig: () => ({
    paypal: {
      clientId: 'test-paypal-client-id',
      environment: 'sandbox'
    },
    square: {
      applicationId: 'test-square-app-id',
      locationId: 'test-location-id',
      environment: 'sandbox'
    },
    cashapp: {
      clientId: 'test-cashapp-client-id',
      environment: 'sandbox'
    }
  })
}));

describe('Payment Configuration', () => {
  beforeEach(() => {
    // Clear all event configurations before each test
    getAllEventPaymentConfigs().forEach(config => {
      removeEventPaymentConfig(config.eventId);
    });
  });

  describe('Event Configuration Management', () => {
    const mockEventConfig: EventPaymentConfig = {
      eventId: 'event-123',
      enabledGateways: ['paypal', 'square'],
      preferredGateway: 'square',
      fallbackGateways: ['paypal'],
      customFees: {
        paypal: { percentage: 3.0, fixed: 0.40 },
        square: { percentage: 2.5, fixed: 0.20 },
        cashapp: { percentage: 2.8, fixed: 0.25 }
      }
    };

    it('should set and get event configuration', () => {
      setEventPaymentConfig(mockEventConfig);
      const retrieved = getEventPaymentConfig('event-123');
      
      expect(retrieved).toEqual(mockEventConfig);
    });

    it('should return null for non-existent event configuration', () => {
      const config = getEventPaymentConfig('non-existent');
      expect(config).toBeNull();
    });

    it('should remove event configuration', () => {
      setEventPaymentConfig(mockEventConfig);
      expect(getEventPaymentConfig('event-123')).not.toBeNull();
      
      removeEventPaymentConfig('event-123');
      expect(getEventPaymentConfig('event-123')).toBeNull();
    });

    it('should get all event configurations', () => {
      const config1: EventPaymentConfig = {
        eventId: 'event-1',
        enabledGateways: ['paypal']
      };
      const config2: EventPaymentConfig = {
        eventId: 'event-2',
        enabledGateways: ['square']
      };

      setEventPaymentConfig(config1);
      setEventPaymentConfig(config2);

      const allConfigs = getAllEventPaymentConfigs();
      expect(allConfigs).toHaveLength(2);
      expect(allConfigs).toContainEqual(config1);
      expect(allConfigs).toContainEqual(config2);
    });
  });

  describe('Gateway Selection', () => {
    it('should return enabled gateways for event', () => {
      const eventConfig: EventPaymentConfig = {
        eventId: 'event-123',
        enabledGateways: ['paypal', 'square']
      };
      setEventPaymentConfig(eventConfig);

      const enabledGateways = getEnabledGateways('event-123');
      expect(enabledGateways).toEqual(['paypal', 'square']);
    });

    it('should return default enabled gateways when event config not found', () => {
      const enabledGateways = getEnabledGateways('non-existent');
      expect(enabledGateways).toEqual(DEFAULT_PAYMENT_CONFIG.enabledGateways);
    });

    it('should return default enabled gateways when no event ID provided', () => {
      const enabledGateways = getEnabledGateways();
      expect(enabledGateways).toEqual(DEFAULT_PAYMENT_CONFIG.enabledGateways);
    });

    it('should return preferred gateway for event', () => {
      const eventConfig: EventPaymentConfig = {
        eventId: 'event-123',
        enabledGateways: ['paypal', 'square'],
        preferredGateway: 'square'
      };
      setEventPaymentConfig(eventConfig);

      const preferred = getPreferredGateway('event-123');
      expect(preferred).toBe('square');
    });

    it('should return default gateway when event has no preferred gateway', () => {
      const eventConfig: EventPaymentConfig = {
        eventId: 'event-123',
        enabledGateways: ['paypal', 'square']
      };
      setEventPaymentConfig(eventConfig);

      const preferred = getPreferredGateway('event-123');
      expect(preferred).toBe(DEFAULT_PAYMENT_CONFIG.defaultGateway);
    });

    it('should check if gateway is enabled for event', () => {
      const eventConfig: EventPaymentConfig = {
        eventId: 'event-123',
        enabledGateways: ['paypal', 'square']
      };
      setEventPaymentConfig(eventConfig);

      expect(isGatewayEnabled('paypal', 'event-123')).toBe(true);
      expect(isGatewayEnabled('square', 'event-123')).toBe(true);
      expect(isGatewayEnabled('cashapp', 'event-123')).toBe(false);
    });
  });

  describe('Fee Calculation', () => {
    it('should calculate fees with default configuration', () => {
      const fees = calculateFees(100, 'paypal');
      
      expect(fees.fixed).toBe(DEFAULT_PAYMENT_CONFIG.fees.paypal.fixed);
      expect(fees.percentage).toBe(DEFAULT_PAYMENT_CONFIG.fees.paypal.percentage);
      expect(fees.total).toBe(fees.fixed + fees.percentage);
    });

    it('should calculate fees with custom event configuration', () => {
      const eventConfig: EventPaymentConfig = {
        eventId: 'event-123',
        enabledGateways: ['paypal'],
        customFees: {
          paypal: { percentage: 3.0, fixed: 0.50 },
          square: { percentage: 2.5, fixed: 0.20 },
          cashapp: { percentage: 2.8, fixed: 0.25 }
        }
      };
      setEventPaymentConfig(eventConfig);

      const fees = calculateFees(100, 'paypal', 'event-123');
      
      expect(fees.fixed).toBe(0.50);
      expect(fees.percentage).toBe(3.0); // 3% of 100
      expect(fees.total).toBe(3.50);
    });

    it('should handle missing custom fees gracefully', () => {
      const eventConfig: EventPaymentConfig = {
        eventId: 'event-123',
        enabledGateways: ['square']
        // No customFees defined
      };
      setEventPaymentConfig(eventConfig);

      const fees = calculateFees(100, 'square', 'event-123');
      
      expect(fees.fixed).toBe(DEFAULT_PAYMENT_CONFIG.fees.square.fixed);
      expect(fees.percentage).toBe(DEFAULT_PAYMENT_CONFIG.fees.square.percentage);
    });
  });

  describe('Gateway Failover Order', () => {
    it('should return correct order with preferred and fallback gateways', () => {
      const eventConfig: EventPaymentConfig = {
        eventId: 'event-123',
        enabledGateways: ['paypal', 'square', 'cashapp'],
        preferredGateway: 'square',
        fallbackGateways: ['cashapp', 'paypal']
      };
      setEventPaymentConfig(eventConfig);

      const order = getGatewayFailoverOrder('event-123');
      expect(order).toEqual(['square', 'cashapp', 'paypal']);
    });

    it('should handle missing preferred gateway', () => {
      const eventConfig: EventPaymentConfig = {
        eventId: 'event-123',
        enabledGateways: ['paypal', 'square'],
        fallbackGateways: ['square']
      };
      setEventPaymentConfig(eventConfig);

      const order = getGatewayFailoverOrder('event-123');
      expect(order).toContain('paypal');
      expect(order).toContain('square');
    });

    it('should return default order when no event config exists', () => {
      const order = getGatewayFailoverOrder('non-existent');
      expect(order).toEqual(DEFAULT_PAYMENT_CONFIG.enabledGateways);
    });

    it('should exclude disabled gateways from fallback order', () => {
      const eventConfig: EventPaymentConfig = {
        eventId: 'event-123',
        enabledGateways: ['paypal'],
        preferredGateway: 'square', // Not in enabled gateways
        fallbackGateways: ['square', 'cashapp'] // Not in enabled gateways
      };
      setEventPaymentConfig(eventConfig);

      const order = getGatewayFailoverOrder('event-123');
      expect(order).toEqual(['paypal']);
    });
  });

  describe('Gateway Configuration Validation', () => {
    it('should validate PayPal configuration', () => {
      const validation = validateGatewayConfig('paypal');
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate Square configuration', () => {
      const validation = validateGatewayConfig('square');
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate Cash App configuration', () => {
      const validation = validateGatewayConfig('cashapp');
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid configuration', () => {
      // Mock invalid configuration
      jest.doMock('../../payment-config', () => ({
        getPaymentConfig: () => ({
          paypal: { clientId: '', environment: 'sandbox' },
          square: { applicationId: '', locationId: '', environment: 'sandbox' },
          cashapp: { clientId: '', environment: 'sandbox' }
        })
      }));

      const validation = validateGatewayConfig('paypal');
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('PayPal client ID is required');
    });

    it('should get status for all gateways', () => {
      const status = getGatewayConfigStatus();
      
      expect(status.paypal).toBeDefined();
      expect(status.square).toBeDefined();
      expect(status.cashapp).toBeDefined();
      
      expect(typeof status.paypal.configured).toBe('boolean');
      expect(Array.isArray(status.paypal.errors)).toBe(true);
    });
  });

  describe('Default Event Configuration', () => {
    it('should create default event configuration', () => {
      const defaultConfig = createDefaultEventConfig('event-123');
      
      expect(defaultConfig.eventId).toBe('event-123');
      expect(defaultConfig.enabledGateways).toEqual(DEFAULT_PAYMENT_CONFIG.enabledGateways);
      expect(defaultConfig.preferredGateway).toBe(DEFAULT_PAYMENT_CONFIG.defaultGateway);
      expect(defaultConfig.fallbackGateways).toEqual(
        DEFAULT_PAYMENT_CONFIG.enabledGateways.filter(
          gateway => gateway !== DEFAULT_PAYMENT_CONFIG.defaultGateway
        )
      );
    });
  });

  describe('DEFAULT_PAYMENT_CONFIG', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_PAYMENT_CONFIG.enabledGateways).toContain('paypal');
      expect(DEFAULT_PAYMENT_CONFIG.enabledGateways).toContain('square');
      expect(DEFAULT_PAYMENT_CONFIG.enabledGateways).toContain('cashapp');
      
      expect(DEFAULT_PAYMENT_CONFIG.defaultGateway).toBe('paypal');
      expect(DEFAULT_PAYMENT_CONFIG.enableFailover).toBe(true);
      
      expect(DEFAULT_PAYMENT_CONFIG.fees.paypal).toBeDefined();
      expect(DEFAULT_PAYMENT_CONFIG.fees.square).toBeDefined();
      expect(DEFAULT_PAYMENT_CONFIG.fees.cashapp).toBeDefined();
      
      expect(Array.isArray(DEFAULT_PAYMENT_CONFIG.retryDelays)).toBe(true);
      expect(DEFAULT_PAYMENT_CONFIG.retryDelays.length).toBeGreaterThan(0);
    });
  });
});