import { supabase } from '@/integrations/supabase/client';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked?: boolean;
  blockedUntil?: number;
}

export class RateLimitService {
  private static memoryStore = new Map<string, RateLimitEntry>();
  
  // Default configurations for different operations
  static readonly CONFIGS = {
    QR_VALIDATION: {
      maxAttempts: 10,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 15 * 60 * 1000, // 15 minutes
    },
    LOGIN_ATTEMPT: {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000, // 30 minutes
    },
    API_GENERAL: {
      maxAttempts: 100,
      windowMs: 60 * 1000, // 1 minute
    },
  };

  /**
   * Check if an action is rate limited
   */
  static async checkRateLimit(
    key: string,
    config: RateLimitConfig = this.CONFIGS.API_GENERAL
  ): Promise<{ allowed: boolean; remainingAttempts?: number; resetTime?: number }> {
    const now = Date.now();
    let entry = this.memoryStore.get(key);

    // Clean up old entries periodically
    if (this.memoryStore.size > 10000) {
      this.cleanup();
    }

    if (!entry) {
      entry = {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
      };
      this.memoryStore.set(key, entry);
      return { 
        allowed: true, 
        remainingAttempts: config.maxAttempts - 1,
        resetTime: now + config.windowMs 
      };
    }

    // Check if blocked
    if (entry.blocked && entry.blockedUntil && entry.blockedUntil > now) {
      return { 
        allowed: false, 
        remainingAttempts: 0,
        resetTime: entry.blockedUntil 
      };
    }

    // Reset if outside window
    if (now - entry.firstAttempt > config.windowMs) {
      entry = {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
      };
      this.memoryStore.set(key, entry);
      return { 
        allowed: true, 
        remainingAttempts: config.maxAttempts - 1,
        resetTime: now + config.windowMs 
      };
    }

    // Increment attempts
    entry.attempts++;
    entry.lastAttempt = now;

    // Check if exceeded
    if (entry.attempts > config.maxAttempts) {
      if (config.blockDurationMs) {
        entry.blocked = true;
        entry.blockedUntil = now + config.blockDurationMs;
      }
      this.memoryStore.set(key, entry);
      return { 
        allowed: false, 
        remainingAttempts: 0,
        resetTime: entry.blockedUntil || now + config.windowMs 
      };
    }

    this.memoryStore.set(key, entry);
    return { 
      allowed: true, 
      remainingAttempts: config.maxAttempts - entry.attempts,
      resetTime: entry.firstAttempt + config.windowMs 
    };
  }

  /**
   * Record successful action (optionally reset rate limit)
   */
  static recordSuccess(key: string, reset: boolean = false): void {
    if (reset) {
      this.memoryStore.delete(key);
    }
  }

  /**
   * Get rate limit status without incrementing
   */
  static getStatus(
    key: string,
    config: RateLimitConfig = this.CONFIGS.API_GENERAL
  ): { attempts: number; remainingAttempts: number; resetTime: number } {
    const now = Date.now();
    const entry = this.memoryStore.get(key);

    if (!entry || now - entry.firstAttempt > config.windowMs) {
      return {
        attempts: 0,
        remainingAttempts: config.maxAttempts,
        resetTime: now + config.windowMs,
      };
    }

    return {
      attempts: entry.attempts,
      remainingAttempts: Math.max(0, config.maxAttempts - entry.attempts),
      resetTime: entry.firstAttempt + config.windowMs,
    };
  }

  /**
   * Clean up old entries from memory
   */
  private static cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, entry] of this.memoryStore.entries()) {
      if (now - entry.lastAttempt > maxAge) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Generate rate limit key for QR validation
   */
  static getQRValidationKey(ticketId: string, ipAddress?: string): string {
    // Combine ticket ID and IP for more granular limiting
    return `qr_validation:${ticketId}:${ipAddress || 'unknown'}`;
  }

  /**
   * Generate rate limit key for login attempts
   */
  static getLoginKey(email: string, ipAddress?: string): string {
    return `login:${email}:${ipAddress || 'unknown'}`;
  }

  /**
   * Log suspicious activity to database
   */
  static async logSuspiciousActivity(
    type: string,
    details: {
      key: string;
      attempts: number;
      ipAddress?: string;
      userAgent?: string;
      metadata?: any;
    }
  ): Promise<void> {
    try {
      await supabase.from('security_logs').insert({
        type,
        severity: 'warning',
        details,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  }
}

export default RateLimitService;