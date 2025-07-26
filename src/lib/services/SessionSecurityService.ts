/**
 * Session Security Service
 * Manages session timeouts, security monitoring, and suspicious activity detection
 */

import { supabase } from '@/lib/supabase'

export interface SessionConfig {
  idleTimeoutMs: number;
  absoluteTimeoutMs: number;
  warningBeforeTimeoutMs: number;
  refreshTokenBeforeExpiryMs: number;
}

export interface SessionActivity {
  lastActivity: number;
  sessionStart: number;
  activityCount: number;
  suspiciousActivity: boolean;
  deviceFingerprint?: string;
  ipAddress?: string;
}

export interface SecurityEvent {
  type: 'session_timeout' | 'suspicious_activity' | 'concurrent_sessions' | 'location_change';
  timestamp: number;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class SessionSecurityService {
  private static readonly STORAGE_KEY = 'session_security_data';
  private static readonly ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  // SECURITY ENHANCED: Configurable session timeouts
  static readonly DEFAULT_CONFIG: SessionConfig = {
    idleTimeoutMs: 30 * 60 * 1000, // 30 minutes idle
    absoluteTimeoutMs: 8 * 60 * 60 * 1000, // 8 hours absolute
    warningBeforeTimeoutMs: 5 * 60 * 1000, // 5 minutes warning
    refreshTokenBeforeExpiryMs: 10 * 60 * 1000, // Refresh 10 minutes before expiry
  };

  private static sessionActivity: SessionActivity | null = null;
  private static config: SessionConfig = this.DEFAULT_CONFIG;
  private static timeoutWarningCallback: (() => void) | null = null;
  private static sessionExpiredCallback: (() => void) | null = null;
  private static activityListeners: (() => void)[] = [];

  /**
   * Initialize session security monitoring
   */
  static initialize(
    config?: Partial<SessionConfig>,
    onTimeoutWarning?: () => void,
    onSessionExpired?: () => void
  ) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.timeoutWarningCallback = onTimeoutWarning || null;
    this.sessionExpiredCallback = onSessionExpired || null;

    // Load existing session activity
    this.loadSessionActivity();

    // Start monitoring
    this.startActivityMonitoring();
    this.startSessionChecks();

    console.log('🔒 Session security monitoring initialized');
  }

  /**
   * Start monitoring user activity
   */
  private static startActivityMonitoring() {
    const updateActivity = () => {
      this.updateActivity();
    };

    // Add activity listeners
    this.ACTIVITY_EVENTS.forEach(event => {
      const listener = () => updateActivity();
      document.addEventListener(event, listener, { passive: true });
      this.activityListeners.push(() => document.removeEventListener(event, listener));
    });

    // Also monitor page visibility
    const visibilityListener = () => {
      if (!document.hidden) {
        this.updateActivity();
      }
    };
    document.addEventListener('visibilitychange', visibilityListener);
    this.activityListeners.push(() => document.removeEventListener('visibilitychange', visibilityListener));
  }

  /**
   * Start periodic session checks
   */
  private static startSessionChecks() {
    // Check every minute
    setInterval(() => {
      this.checkSessionValidity();
    }, 60 * 1000);

    // Initial check
    this.checkSessionValidity();
  }

  /**
   * Update user activity timestamp
   */
  private static updateActivity() {
    const now = Date.now();
    
    if (!this.sessionActivity) {
      this.sessionActivity = {
        lastActivity: now,
        sessionStart: now,
        activityCount: 1,
        suspiciousActivity: false,
        deviceFingerprint: this.generateDeviceFingerprint(),
      };
    } else {
      this.sessionActivity.lastActivity = now;
      this.sessionActivity.activityCount++;
    }

    this.saveSessionActivity();
  }

  /**
   * Check if current session is valid
   */
  private static checkSessionValidity(): boolean {
    if (!this.sessionActivity) {
      return false;
    }

    const now = Date.now();
    const { lastActivity, sessionStart } = this.sessionActivity;

    // Check idle timeout
    const idleTime = now - lastActivity;
    if (idleTime > this.config.idleTimeoutMs) {
      this.handleSessionExpired('idle_timeout', { idleTime });
      return false;
    }

    // Check absolute timeout
    const sessionDuration = now - sessionStart;
    if (sessionDuration > this.config.absoluteTimeoutMs) {
      this.handleSessionExpired('absolute_timeout', { sessionDuration });
      return false;
    }

    // Check if warning should be shown
    const timeUntilIdleTimeout = this.config.idleTimeoutMs - idleTime;
    if (timeUntilIdleTimeout <= this.config.warningBeforeTimeoutMs && this.timeoutWarningCallback) {
      this.timeoutWarningCallback();
    }

    return true;
  }

  /**
   * Handle session expiration
   */
  private static async handleSessionExpired(reason: string, details: Record<string, any>) {
    console.warn('🔒 Session expired:', reason, details);

    // Log security event
    await this.logSecurityEvent({
      type: 'session_timeout',
      timestamp: Date.now(),
      details: { reason, ...details },
      riskLevel: 'medium',
    });

    // Clear session data
    this.clearSession();

    // Sign out user
    await supabase.auth.signOut();

    // Notify application
    if (this.sessionExpiredCallback) {
      this.sessionExpiredCallback();
    }
  }

  /**
   * Extend session (reset idle timer)
   */
  static extendSession() {
    this.updateActivity();
    console.log('🔒 Session extended');
  }

  /**
   * Check for suspicious activity patterns
   */
  private static detectSuspiciousActivity(): boolean {
    if (!this.sessionActivity) return false;

    const now = Date.now();
    const { sessionStart, activityCount } = this.sessionActivity;
    const sessionDuration = now - sessionStart;

    // Check for unusually high activity rate (potential bot)
    const activityRate = activityCount / (sessionDuration / 1000 / 60); // per minute
    if (activityRate > 1000) { // More than 1000 actions per minute
      return true;
    }

    // Check for device fingerprint changes
    const currentFingerprint = this.generateDeviceFingerprint();
    if (this.sessionActivity.deviceFingerprint && 
        this.sessionActivity.deviceFingerprint !== currentFingerprint) {
      return true;
    }

    return false;
  }

  /**
   * Generate device fingerprint
   */
  private static generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      canvas.toDataURL(),
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(16);
  }

  /**
   * Save session activity to storage
   */
  private static saveSessionActivity() {
    if (this.sessionActivity) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.sessionActivity));
    }
  }

  /**
   * Load session activity from storage
   */
  private static loadSessionActivity() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.sessionActivity = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load session activity:', error);
      this.sessionActivity = null;
    }
  }

  /**
   * Clear session data
   */
  private static clearSession() {
    this.sessionActivity = null;
    localStorage.removeItem(this.STORAGE_KEY);
    
    // Remove activity listeners
    this.activityListeners.forEach(removeListener => removeListener());
    this.activityListeners = [];
  }

  /**
   * Log security event
   */
  private static async logSecurityEvent(event: SecurityEvent) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('security_events')
          .insert({
            user_id: user.id,
            event_type: event.type,
            details: event.details,
            risk_level: event.riskLevel,
            created_at: new Date(event.timestamp).toISOString(),
          });
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get current session info
   */
  static getSessionInfo(): {
    isActive: boolean;
    timeUntilIdleTimeout?: number;
    timeUntilAbsoluteTimeout?: number;
    sessionDuration?: number;
  } {
    if (!this.sessionActivity) {
      return { isActive: false };
    }

    const now = Date.now();
    const { lastActivity, sessionStart } = this.sessionActivity;
    
    const idleTime = now - lastActivity;
    const sessionDuration = now - sessionStart;
    
    const timeUntilIdleTimeout = Math.max(0, this.config.idleTimeoutMs - idleTime);
    const timeUntilAbsoluteTimeout = Math.max(0, this.config.absoluteTimeoutMs - sessionDuration);

    return {
      isActive: true,
      timeUntilIdleTimeout,
      timeUntilAbsoluteTimeout,
      sessionDuration,
    };
  }

  /**
   * Cleanup resources
   */
  static cleanup() {
    this.clearSession();
    console.log('🔒 Session security monitoring cleaned up');
  }
}