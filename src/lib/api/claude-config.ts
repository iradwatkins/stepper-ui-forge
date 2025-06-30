/**
 * Claude API Configuration and Fallback Management
 * 
 * This module provides a robust fallback system for Claude API usage,
 * automatically switching between primary and secondary API keys when
 * usage limits are reached.
 */

export interface ClaudeAPIConfig {
  apiKey: string
  baseUrl: string
  name: string
  lastUsed?: Date
  usageLimitReached?: boolean
  errorCount: number
  maxRetries: number
}

export interface FallbackStatus {
  currentApi: 'primary' | 'secondary'
  lastSwitch?: Date
  switchReason?: string
  totalSwitches: number
  primaryHealthy: boolean
  secondaryHealthy: boolean
}

export class ClaudeAPIManager {
  private static instance: ClaudeAPIManager
  private primaryConfig: ClaudeAPIConfig
  private secondaryConfig: ClaudeAPIConfig
  private status: FallbackStatus
  private readonly USAGE_LIMIT_COOLDOWN = 60 * 60 * 1000 // 1 hour in ms
  private readonly MAX_ERROR_COUNT = 3

  private constructor() {
    // Initialize with provided API keys
    this.primaryConfig = {
      apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '',
      baseUrl: 'https://api.anthropic.com',
      name: 'Primary',
      errorCount: 0,
      maxRetries: 3
    }

    this.secondaryConfig = {
      apiKey: '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',
      baseUrl: 'https://api.anthropic.com',
      name: 'Secondary',
      errorCount: 0,
      maxRetries: 3
    }

    this.status = {
      currentApi: 'primary',
      totalSwitches: 0,
      primaryHealthy: true,
      secondaryHealthy: true
    }

    // Load persisted status if available
    this.loadPersistedStatus()
  }

  public static getInstance(): ClaudeAPIManager {
    if (!ClaudeAPIManager.instance) {
      ClaudeAPIManager.instance = new ClaudeAPIManager()
    }
    return ClaudeAPIManager.instance
  }

  /**
   * Get the currently active API configuration
   */
  public getCurrentConfig(): ClaudeAPIConfig {
    return this.status.currentApi === 'primary' ? this.primaryConfig : this.secondaryConfig
  }

  /**
   * Get the backup API configuration
   */
  public getBackupConfig(): ClaudeAPIConfig {
    return this.status.currentApi === 'primary' ? this.secondaryConfig : this.primaryConfig
  }

  /**
   * Switch to the backup API
   */
  public switchToBackup(reason: string): ClaudeAPIConfig {
    const previousApi = this.status.currentApi
    this.status.currentApi = previousApi === 'primary' ? 'secondary' : 'primary'
    this.status.lastSwitch = new Date()
    this.status.switchReason = reason
    this.status.totalSwitches++

    // Mark the failed API as having usage limit reached if applicable
    if (reason.toLowerCase().includes('usage') || reason.toLowerCase().includes('limit')) {
      const failedConfig = previousApi === 'primary' ? this.primaryConfig : this.secondaryConfig
      failedConfig.usageLimitReached = true
      failedConfig.lastUsed = new Date()
    }

    this.persistStatus()
    
    console.log(`🔄 API Fallback: Switched from ${previousApi} to ${this.status.currentApi}`)
    console.log(`📍 Reason: ${reason}`)
    console.log(`📊 Total switches: ${this.status.totalSwitches}`)

    return this.getCurrentConfig()
  }

  /**
   * Check if an error indicates usage limit reached
   */
  public isUsageLimitError(error: any): boolean {
    if (!error) return false

    const errorMessage = error.message || error.toString() || ''
    const statusCode = error.status || error.statusCode || 0

    // Check for common usage limit indicators
    const usageLimitIndicators = [
      'usage limit',
      'rate limit',
      'quota exceeded',
      'limit exceeded',
      'too many requests',
      'billing',
      'subscription'
    ]

    const hasUsageLimitMessage = usageLimitIndicators.some(indicator => 
      errorMessage.toLowerCase().includes(indicator)
    )

    const isRateLimitStatus = statusCode === 429 || statusCode === 402

    return hasUsageLimitMessage || isRateLimitStatus
  }

  /**
   * Handle API error and potentially switch APIs
   */
  public handleAPIError(error: any): { shouldRetry: boolean; config: ClaudeAPIConfig } {
    const currentConfig = this.getCurrentConfig()
    const isUsageLimit = this.isUsageLimitError(error)

    if (isUsageLimit) {
      // Immediate switch for usage limit errors
      const newConfig = this.switchToBackup(`Usage limit reached: ${error.message || 'Unknown error'}`)
      return { shouldRetry: true, config: newConfig }
    }

    // Increment error count for other errors
    currentConfig.errorCount++

    if (currentConfig.errorCount >= this.MAX_ERROR_COUNT) {
      // Switch after too many consecutive errors
      currentConfig.errorCount = 0 // Reset for next time
      const newConfig = this.switchToBackup(`Too many errors (${this.MAX_ERROR_COUNT}): ${error.message || 'Unknown error'}`)
      return { shouldRetry: true, config: newConfig }
    }

    // Don't switch, but retry with same API
    return { shouldRetry: currentConfig.errorCount < currentConfig.maxRetries, config: currentConfig }
  }

  /**
   * Record successful API call
   */
  public recordSuccess(): void {
    const currentConfig = this.getCurrentConfig()
    currentConfig.errorCount = 0 // Reset error count on success
    currentConfig.lastUsed = new Date()
    
    // Update health status
    if (this.status.currentApi === 'primary') {
      this.status.primaryHealthy = true
    } else {
      this.status.secondaryHealthy = true
    }

    this.persistStatus()
  }

  /**
   * Check if we should try to switch back to primary API
   */
  public shouldSwitchBackToPrimary(): boolean {
    if (this.status.currentApi === 'primary') return false
    if (!this.primaryConfig.usageLimitReached) return true

    // Check if cooldown period has passed
    if (this.primaryConfig.lastUsed) {
      const timeSinceLastUse = Date.now() - this.primaryConfig.lastUsed.getTime()
      return timeSinceLastUse > this.USAGE_LIMIT_COOLDOWN
    }

    return false
  }

  /**
   * Attempt to switch back to primary if conditions are met
   */
  public attemptSwitchBackToPrimary(): ClaudeAPIConfig | null {
    if (this.shouldSwitchBackToPrimary()) {
      this.primaryConfig.usageLimitReached = false
      this.primaryConfig.errorCount = 0
      this.status.currentApi = 'primary'
      this.status.lastSwitch = new Date()
      this.status.switchReason = 'Switching back to primary after cooldown'
      
      console.log('🔄 API Fallback: Switching back to primary API after cooldown period')
      this.persistStatus()
      
      return this.primaryConfig
    }
    return null
  }

  /**
   * Get current status for monitoring
   */
  public getStatus(): FallbackStatus & { 
    primaryErrors: number
    secondaryErrors: number
    primaryLastUsed?: Date
    secondaryLastUsed?: Date
  } {
    return {
      ...this.status,
      primaryErrors: this.primaryConfig.errorCount,
      secondaryErrors: this.secondaryConfig.errorCount,
      primaryLastUsed: this.primaryConfig.lastUsed,
      secondaryLastUsed: this.secondaryConfig.lastUsed
    }
  }

  /**
   * Reset all error counts and usage limits (for testing)
   */
  public reset(): void {
    this.primaryConfig.errorCount = 0
    this.primaryConfig.usageLimitReached = false
    this.secondaryConfig.errorCount = 0
    this.secondaryConfig.usageLimitReached = false
    this.status.currentApi = 'primary'
    this.status.totalSwitches = 0
    this.status.primaryHealthy = true
    this.status.secondaryHealthy = true
    this.persistStatus()
  }

  /**
   * Persist status to localStorage for browser environments
   */
  private persistStatus(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const persistData = {
          status: this.status,
          primaryConfig: {
            errorCount: this.primaryConfig.errorCount,
            usageLimitReached: this.primaryConfig.usageLimitReached,
            lastUsed: this.primaryConfig.lastUsed?.toISOString()
          },
          secondaryConfig: {
            errorCount: this.secondaryConfig.errorCount,
            usageLimitReached: this.secondaryConfig.usageLimitReached,
            lastUsed: this.secondaryConfig.lastUsed?.toISOString()
          }
        }
        localStorage.setItem('claude-api-fallback-status', JSON.stringify(persistData))
      } catch (error) {
        console.warn('Failed to persist API fallback status:', error)
      }
    }
  }

  /**
   * Load persisted status from localStorage
   */
  private loadPersistedStatus(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('claude-api-fallback-status')
        if (stored) {
          const persistData = JSON.parse(stored)
          
          this.status = { ...this.status, ...persistData.status }
          
          if (persistData.primaryConfig) {
            this.primaryConfig.errorCount = persistData.primaryConfig.errorCount || 0
            this.primaryConfig.usageLimitReached = persistData.primaryConfig.usageLimitReached || false
            if (persistData.primaryConfig.lastUsed) {
              this.primaryConfig.lastUsed = new Date(persistData.primaryConfig.lastUsed)
            }
          }
          
          if (persistData.secondaryConfig) {
            this.secondaryConfig.errorCount = persistData.secondaryConfig.errorCount || 0
            this.secondaryConfig.usageLimitReached = persistData.secondaryConfig.usageLimitReached || false
            if (persistData.secondaryConfig.lastUsed) {
              this.secondaryConfig.lastUsed = new Date(persistData.secondaryConfig.lastUsed)
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load persisted API fallback status:', error)
      }
    }
  }
}