// Payment Logging System
// Standardized logging for all payment operations

import { PaymentGateway, PaymentRequest, PaymentResponse, PaymentError } from './types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface PaymentLogEntry {
  timestamp: Date;
  level: LogLevel;
  gateway: PaymentGateway;
  event: string;
  transactionId?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error?: PaymentError;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PaymentLoggerConfig {
  enabled: boolean;
  level: LogLevel;
  includeMetadata: boolean;
  redactSensitiveData: boolean;
  maxLogEntries: number;
}

export class PaymentLogger {
  private static instance: PaymentLogger | null = null;
  private config: PaymentLoggerConfig;
  private logs: PaymentLogEntry[] = [];
  private sensitiveKeys = [
    'password', 'secret', 'token', 'key', 'credential', 'authorization',
    'signature', 'cvv', 'cvc', 'pan', 'cardNumber', 'accountNumber',
    'ssn', 'socialSecurityNumber', 'taxId', 'drivingLicense'
  ];

  private constructor(config: PaymentLoggerConfig) {
    this.config = config;
  }

  static getInstance(): PaymentLogger {
    if (!PaymentLogger.instance) {
      PaymentLogger.instance = new PaymentLogger({
        enabled: true,
        level: import.meta.env.DEV ? 'debug' : 'info',
        includeMetadata: true,
        redactSensitiveData: true,
        maxLogEntries: 1000
      });
    }
    return PaymentLogger.instance;
  }

  /**
   * Log payment initiation
   */
  logPaymentStart(
    gateway: PaymentGateway,
    request: PaymentRequest,
    metadata?: Record<string, any>
  ): string {
    const transactionId = this.generateTransactionId();
    
    this.addLog({
      level: 'info',
      gateway,
      event: 'payment_started',
      transactionId,
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency,
      metadata: this.sanitizeMetadata(metadata)
    });

    return transactionId;
  }

  /**
   * Log payment success
   */
  logPaymentSuccess(
    gateway: PaymentGateway,
    response: PaymentResponse,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    this.addLog({
      level: 'info',
      gateway,
      event: 'payment_completed',
      transactionId: response.transactionId,
      amount: response.amount,
      currency: response.currency,
      status: response.status,
      duration,
      metadata: this.sanitizeMetadata(metadata)
    });
  }

  /**
   * Log payment failure
   */
  logPaymentFailure(
    gateway: PaymentGateway,
    error: PaymentError,
    duration: number,
    orderId?: string,
    metadata?: Record<string, any>
  ): void {
    this.addLog({
      level: 'error',
      gateway,
      event: 'payment_failed',
      orderId,
      error,
      duration,
      metadata: this.sanitizeMetadata(metadata)
    });
  }

  /**
   * Log refund operation
   */
  logRefund(
    gateway: PaymentGateway,
    transactionId: string,
    amount: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    this.addLog({
      level: success ? 'info' : 'error',
      gateway,
      event: success ? 'refund_completed' : 'refund_failed',
      transactionId,
      amount,
      metadata: this.sanitizeMetadata(metadata)
    });
  }

  /**
   * Log webhook received
   */
  logWebhook(
    gateway: PaymentGateway,
    eventType: string,
    transactionId?: string,
    metadata?: Record<string, any>
  ): void {
    this.addLog({
      level: 'info',
      gateway,
      event: 'webhook_received',
      transactionId,
      status: eventType,
      metadata: this.sanitizeMetadata(metadata)
    });
  }

  /**
   * Log gateway configuration
   */
  logGatewayConfig(
    gateway: PaymentGateway,
    configured: boolean,
    environment: string,
    metadata?: Record<string, any>
  ): void {
    this.addLog({
      level: configured ? 'info' : 'warn',
      gateway,
      event: 'gateway_configured',
      status: configured ? 'success' : 'failed',
      metadata: {
        environment,
        ...this.sanitizeMetadata(metadata)
      }
    });
  }

  /**
   * Log gateway health check
   */
  logHealthCheck(
    gateway: PaymentGateway,
    healthy: boolean,
    responseTime?: number,
    metadata?: Record<string, any>
  ): void {
    this.addLog({
      level: healthy ? 'debug' : 'warn',
      gateway,
      event: 'health_check',
      status: healthy ? 'healthy' : 'unhealthy',
      duration: responseTime,
      metadata: this.sanitizeMetadata(metadata)
    });
  }

  /**
   * Get logs filtered by criteria
   */
  getLogs(filter?: {
    gateway?: PaymentGateway;
    level?: LogLevel;
    event?: string;
    since?: Date;
    transactionId?: string;
  }): PaymentLogEntry[] {
    let filtered = this.logs;

    if (filter) {
      if (filter.gateway) {
        filtered = filtered.filter(log => log.gateway === filter.gateway);
      }
      if (filter.level) {
        filtered = filtered.filter(log => log.level === filter.level);
      }
      if (filter.event) {
        filtered = filtered.filter(log => log.event === filter.event);
      }
      if (filter.since) {
        filtered = filtered.filter(log => log.timestamp >= filter.since!);
      }
      if (filter.transactionId) {
        filtered = filtered.filter(log => log.transactionId === filter.transactionId);
      }
    }

    return filtered;
  }

  /**
   * Get payment statistics
   */
  getPaymentStats(since?: Date): {
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    successRate: number;
    totalAmount: number;
    averageAmount: number;
    gatewayStats: Record<PaymentGateway, {
      count: number;
      successRate: number;
      totalAmount: number;
    }>;
  } {
    const logs = since ? this.getLogs({ since }) : this.logs;
    const paymentLogs = logs.filter(log => 
      log.event === 'payment_completed' || log.event === 'payment_failed'
    );

    const successful = paymentLogs.filter(log => log.event === 'payment_completed');
    const failed = paymentLogs.filter(log => log.event === 'payment_failed');
    
    const totalAmount = successful.reduce((sum, log) => sum + (log.amount || 0), 0);
    const totalPayments = paymentLogs.length;
    
    const gatewayStats: Record<string, any> = {};
    ['paypal', 'square', 'cashapp'].forEach(gateway => {
      const gatewayLogs = paymentLogs.filter(log => log.gateway === gateway);
      const gatewaySuccessful = gatewayLogs.filter(log => log.event === 'payment_completed');
      
      gatewayStats[gateway] = {
        count: gatewayLogs.length,
        successRate: gatewayLogs.length > 0 ? gatewaySuccessful.length / gatewayLogs.length : 0,
        totalAmount: gatewaySuccessful.reduce((sum, log) => sum + (log.amount || 0), 0)
      };
    });

    return {
      totalPayments,
      successfulPayments: successful.length,
      failedPayments: failed.length,
      successRate: totalPayments > 0 ? successful.length / totalPayments : 0,
      totalAmount,
      averageAmount: successful.length > 0 ? totalAmount / successful.length : 0,
      gatewayStats: gatewayStats as any
    };
  }

  /**
   * Clear old logs to prevent memory issues
   */
  clearOldLogs(): void {
    if (this.logs.length > this.config.maxLogEntries) {
      const excess = this.logs.length - this.config.maxLogEntries;
      this.logs.splice(0, excess);
    }
  }

  /**
   * Export logs for analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'timestamp', 'level', 'gateway', 'event', 'transactionId',
        'orderId', 'amount', 'currency', 'status', 'duration'
      ];
      
      const rows = this.logs.map(log => [
        log.timestamp.toISOString(),
        log.level,
        log.gateway,
        log.event,
        log.transactionId || '',
        log.orderId || '',
        log.amount?.toString() || '',
        log.currency || '',
        log.status || '',
        log.duration?.toString() || ''
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Add log entry
   */
  private addLog(entry: Omit<PaymentLogEntry, 'timestamp'>): void {
    if (!this.config.enabled) return;

    const logEntry: PaymentLogEntry = {
      ...entry,
      timestamp: new Date()
    };

    // Check log level
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const entryLevelIndex = levels.indexOf(entry.level);
    
    if (entryLevelIndex < currentLevelIndex) return;

    this.logs.push(logEntry);
    
    // Output to console if in development
    if (import.meta.env.DEV) {
      this.outputToConsole(logEntry);
    }

    // Clean up old logs
    this.clearOldLogs();
  }

  /**
   * Output log to console
   */
  private outputToConsole(entry: PaymentLogEntry): void {
    const prefix = `[${entry.gateway.toUpperCase()}] ${entry.event}`;
    const data = {
      transactionId: entry.transactionId,
      orderId: entry.orderId,
      amount: entry.amount,
      currency: entry.currency,
      status: entry.status,
      duration: entry.duration ? `${entry.duration}ms` : undefined,
      error: entry.error ? {
        code: entry.error.code,
        message: entry.error.message,
        retryable: entry.error.retryable
      } : undefined,
      metadata: entry.metadata
    };

    // Remove undefined values
    Object.keys(data).forEach(key => {
      if (data[key as keyof typeof data] === undefined) {
        delete data[key as keyof typeof data];
      }
    });

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, data);
        break;
      case 'info':
        console.info(prefix, data);
        break;
      case 'warn':
        console.warn(prefix, data);
        break;
      case 'error':
        console.error(prefix, data);
        break;
    }
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata || !this.config.redactSensitiveData) {
      return metadata;
    }

    const sanitized = { ...metadata };
    
    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const result = Array.isArray(obj) ? [] : {};
      
      Object.keys(obj).forEach(key => {
        const lowerKey = key.toLowerCase();
        const isSensitive = this.sensitiveKeys.some(sensitive => 
          lowerKey.includes(sensitive)
        );
        
        if (isSensitive) {
          (result as any)[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          (result as any)[key] = sanitizeObject(obj[key]);
        } else {
          (result as any)[key] = obj[key];
        }
      });
      
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Generate unique transaction ID for logging
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Simplified logging methods for easier use
  debug(message: string, data?: any): void {
    this.addLog({
      level: 'debug',
      gateway: 'system' as PaymentGateway,
      event: message,
      metadata: data
    });
  }

  info(message: string, data?: any): void {
    this.addLog({
      level: 'info',
      gateway: data?.gateway || 'system' as PaymentGateway,
      event: message,
      transactionId: data?.transactionId,
      orderId: data?.orderId,
      amount: data?.amount,
      currency: data?.currency,
      status: data?.status,
      duration: data?.duration,
      metadata: data
    });
  }

  warn(message: string, data?: any): void {
    this.addLog({
      level: 'warn',
      gateway: data?.gateway || 'system' as PaymentGateway,
      event: message,
      metadata: data
    });
  }

  error(message: string, data?: any): void {
    this.addLog({
      level: 'error',
      gateway: data?.gateway || 'system' as PaymentGateway,
      event: message,
      error: data?.error,
      orderId: data?.orderId,
      metadata: data
    });
  }
}

// Export singleton instance
export const paymentLogger = PaymentLogger.getInstance();

export default paymentLogger;