// Simplified Production Payment Service
// Focused on real payment processing without complex gateway abstractions

import { PaymentConfigurationService } from '@/lib/services/PaymentConfigurationService';
import { PaymentLogger } from './logger';
import { ERROR_CODES, ERROR_MESSAGES, mapGatewayError, createStandardError, logPaymentError } from './errors';
import type { PaymentGateway } from './types';

export class ProductionPaymentService {
  private static instance: ProductionPaymentService;
  private logger: PaymentLogger;

  private constructor() {
    this.logger = PaymentLogger.getInstance();
  }

  static getInstance(): ProductionPaymentService {
    if (!ProductionPaymentService.instance) {
      ProductionPaymentService.instance = new ProductionPaymentService();
    }
    return ProductionPaymentService.instance;
  }

  // Get available payment methods from database configuration
  async getAvailablePaymentMethods() {
    try {
      this.logger.info('Fetching available payment methods');
      const methods = await PaymentConfigurationService.getAvailablePaymentMethods();
      this.logger.info(`Found ${methods.length} payment methods`);
      return methods;
    } catch (error) {
      const paymentError = createStandardError(
        error as Error,
        'system' as PaymentGateway,
        ERROR_CODES.GATEWAY_NOT_CONFIGURED,
        false
      );
      logPaymentError(paymentError);
      this.logger.error('Failed to fetch payment methods', { error });
      
      // Fallback to basic configuration if database is unavailable
      return [
        {
          id: 'paypal',
          name: 'PayPal',
          description: 'Pay with your PayPal account',
          available: false
        }
      ];
    }
  }

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly BACKOFF_MULTIPLIER = 2;

  // Sleep utility for retry delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Process payment through Supabase Edge Functions
  async processPayment(paymentData: {
    amount: number;
    gateway: string;
    orderId: string;
    customerEmail: string;
    idempotencyKey?: string;
  }, retryAttempt: number = 1) {
    const startTime = Date.now();
    const gateway = paymentData.gateway as PaymentGateway;
    
    try {
      // Log payment attempt
      this.logger.info('Processing payment', {
        gateway,
        orderId: paymentData.orderId,
        amount: paymentData.amount
      });

      // Validate payment data
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw createStandardError(
          'Invalid payment amount',
          gateway,
          ERROR_CODES.INVALID_AMOUNT,
          false
        );
      }

      if (!paymentData.customerEmail) {
        throw createStandardError(
          'Customer email is required',
          gateway,
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          false
        );
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-${paymentData.gateway}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          ...(paymentData.idempotencyKey && { 'X-Idempotency-Key': paymentData.idempotencyKey })
        },
        body: JSON.stringify({
          action: 'create_payment',
          ...paymentData
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Map gateway-specific errors
        const gatewayError = responseData.error || responseData.code || 'UNKNOWN_ERROR';
        const paymentError = mapGatewayError(gatewayError, gateway, responseData);
        
        this.logger.error('Payment failed', {
          gateway,
          orderId: paymentData.orderId,
          error: paymentError,
          duration: Date.now() - startTime
        });
        
        logPaymentError(paymentError, { orderId: paymentData.orderId });
        
        return {
          success: false,
          error: paymentError.userMessage,
          errorCode: paymentError.code,
          retryable: paymentError.retryable
        };
      }

      // Log successful payment
      this.logger.info('Payment successful', {
        gateway,
        orderId: paymentData.orderId,
        transactionId: responseData.transactionId,
        duration: Date.now() - startTime
      });

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      const errorCode = isNetworkError ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.UNKNOWN_ERROR;
      
      const paymentError = error instanceof Error && 'code' in error
        ? error as any
        : createStandardError(error as Error, gateway, errorCode, isNetworkError);
      
      this.logger.error('Payment processing error', {
        gateway,
        orderId: paymentData.orderId,
        error: paymentError,
        duration: Date.now() - startTime
      });
      
      logPaymentError(paymentError, { orderId: paymentData.orderId });
      
      // Check if we should retry
      const shouldRetry = paymentError.retryable !== false && retryAttempt < this.MAX_RETRIES;
      
      if (shouldRetry) {
        const delay = this.RETRY_DELAY_MS * Math.pow(this.BACKOFF_MULTIPLIER, retryAttempt - 1);
        
        this.logger.info(`Retrying payment (attempt ${retryAttempt + 1}/${this.MAX_RETRIES})`, {
          gateway,
          orderId: paymentData.orderId,
          delay,
          previousError: paymentError.code
        });
        
        await this.sleep(delay);
        
        // Generate new idempotency key for retry
        const retryData = {
          ...paymentData,
          idempotencyKey: this.generateIdempotencyKey(paymentData.orderId, retryAttempt + 1)
        };
        
        return this.processPayment(retryData, retryAttempt + 1);
      }
      
      return {
        success: false,
        error: paymentError.userMessage || ERROR_MESSAGES[errorCode],
        errorCode: paymentError.code,
        retryable: paymentError.retryable !== false
      };
    }
  }

  // Generate idempotency key for payment retry safety
  generateIdempotencyKey(orderId: string, attempt: number = 1): string {
    return `${orderId}-${attempt}-${Date.now()}`;
  }

  // Check payment status
  async checkPaymentStatus(gateway: string, paymentId: string) {
    try {
      this.logger.info('Checking payment status', { gateway, paymentId });
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-${gateway}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'get_payment',
          paymentId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to check payment status: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error('Failed to check payment status', { gateway, paymentId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Process refund
  async processRefund(refundData: {
    gateway: string;
    paymentId: string;
    amount?: number;
    reason?: string;
  }) {
    const gateway = refundData.gateway as PaymentGateway;
    
    try {
      this.logger.info('Processing refund', refundData);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-${refundData.gateway}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'refund_payment',
          ...refundData
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const paymentError = mapGatewayError(
          responseData.error || 'REFUND_FAILED',
          gateway,
          responseData
        );
        
        this.logger.error('Refund failed', {
          ...refundData,
          error: paymentError
        });
        
        return {
          success: false,
          error: paymentError.userMessage,
          errorCode: paymentError.code
        };
      }

      this.logger.info('Refund successful', {
        ...refundData,
        refundId: responseData.refundId
      });

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      this.logger.error('Refund processing error', { ...refundData, error });
      
      const paymentError = createStandardError(
        error as Error,
        gateway,
        ERROR_CODES.REFUND_FAILED,
        true
      );
      
      return {
        success: false,
        error: paymentError.userMessage,
        errorCode: paymentError.code
      };
    }
  }

  // Check health of all configured payment gateways
  async checkGatewayHealth(): Promise<{
    [gateway: string]: {
      available: boolean;
      healthy: boolean;
      responseTime?: number;
      error?: string;
    }
  }> {
    const gateways = ['paypal', 'square'];
    const healthChecks: any = {};
    
    await Promise.all(
      gateways.map(async (gateway) => {
        try {
          const startTime = Date.now();
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          
          const response = await fetch(
            `${supabaseUrl}/functions/v1/payments-${gateway}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            healthChecks[gateway] = {
              available: true,
              healthy: data.apiStatus === 'healthy',
              responseTime: Date.now() - startTime,
              configured: data.configured,
              environment: data.environment,
              apiResponseTime: data.apiResponseTime
            };
            
            // Log health check result
            this.logger.logHealthCheck(
              gateway as PaymentGateway,
              data.apiStatus === 'healthy',
              data.apiResponseTime,
              { environment: data.environment }
            );
          } else {
            healthChecks[gateway] = {
              available: false,
              healthy: false,
              error: `HTTP ${response.status}: ${response.statusText}`
            };
          }
        } catch (error) {
          healthChecks[gateway] = {
            available: false,
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          
          this.logger.error(`Health check failed for ${gateway}`, { error });
        }
      })
    );
    
    return healthChecks;
  }

  // Check payment status
  getStatus() {
    return {
      initialized: true,
      hasAvailableGateways: true
    };
  }
}

export const productionPaymentService = ProductionPaymentService.getInstance();