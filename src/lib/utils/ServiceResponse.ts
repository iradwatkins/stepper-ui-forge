// Standardized Service Response Types and Error Handling
// Provides consistent error handling across all services

/**
 * Standard service response interface
 */
export interface ServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: ServiceError
  timestamp: Date
}

/**
 * Service error with context and categorization
 */
export interface ServiceError {
  code: string
  message: string
  details?: any
  userMessage?: string // User-friendly message for UI display
  category: ErrorCategory
  isRetryable: boolean
}

/**
 * Error categories for consistent handling
 */
export type ErrorCategory = 
  | 'authentication'     // Auth/permission errors
  | 'validation'         // Input validation errors  
  | 'not_found'         // Resource not found
  | 'conflict'          // Data conflicts (duplicates, etc)
  | 'network'           // Network/connectivity issues
  | 'database'          // Database operation errors
  | 'external_service'  // Third-party service errors
  | 'business_logic'    // Business rule violations
  | 'system'            // System/internal errors
  | 'unknown'           // Unclassified errors

/**
 * Predefined error codes for common scenarios
 */
export const ErrorCodes = {
  // Authentication
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Validation
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Business Logic
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  
  // External
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

/**
 * Utility class for creating standardized service responses
 */
export class ServiceResponseBuilder {
  /**
   * Create a successful response
   */
  static success<T>(data?: T, message?: string): ServiceResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date()
    }
  }

  /**
   * Create an error response
   */
  static error(
    code: string,
    message: string,
    category: ErrorCategory,
    options?: {
      details?: any
      userMessage?: string
      isRetryable?: boolean
      data?: any
    }
  ): ServiceResponse {
    return {
      success: false,
      data: options?.data,
      error: {
        code,
        message,
        details: options?.details,
        userMessage: options?.userMessage || this.getDefaultUserMessage(category),
        category,
        isRetryable: options?.isRetryable ?? this.getDefaultRetryable(category)
      },
      timestamp: new Date()
    }
  }

  /**
   * Create error from caught exception
   */
  static fromError(error: any, context?: string): ServiceResponse {
    // Handle Supabase errors
    if (error?.code) {
      return this.fromSupabaseError(error, context)
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      return this.error(
        ErrorCodes.INTERNAL_ERROR,
        `${context ? context + ': ' : ''}${error.message}`,
        'system',
        {
          details: { stack: error.stack },
          isRetryable: false
        }
      )
    }

    // Handle string errors
    if (typeof error === 'string') {
      return this.error(
        ErrorCodes.UNKNOWN_ERROR,
        context ? `${context}: ${error}` : error,
        'unknown'
      )
    }

    // Handle unknown error types
    return this.error(
      ErrorCodes.UNKNOWN_ERROR,
      context ? `${context}: Unknown error occurred` : 'Unknown error occurred',
      'unknown',
      { details: error }
    )
  }

  /**
   * Handle Supabase-specific errors
   */
  private static fromSupabaseError(error: any, context?: string): ServiceResponse {
    const message = context ? `${context}: ${error.message}` : error.message

    // Authentication errors
    if (error.code === 'PGRST116' || error.message?.includes('JWT')) {
      return this.error(
        ErrorCodes.AUTH_INVALID,
        message,
        'authentication',
        { details: error }
      )
    }

    // Permission errors
    if (error.code === 'PGRST301' || error.message?.includes('permission')) {
      return this.error(
        ErrorCodes.PERMISSION_DENIED,
        message,
        'authentication',
        { details: error }
      )
    }

    // Not found errors
    if (error.code === 'PGRST116' || error.message?.includes('not found')) {
      return this.error(
        ErrorCodes.NOT_FOUND,
        message,
        'not_found',
        { details: error }
      )
    }

    // Constraint violations (duplicates, etc)
    if (error.code?.startsWith('23') || error.message?.includes('duplicate')) {
      return this.error(
        ErrorCodes.ALREADY_EXISTS,
        message,
        'conflict',
        { details: error }
      )
    }

    // Network errors
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return this.error(
        ErrorCodes.NETWORK_ERROR,
        message,
        'network',
        { 
          details: error,
          isRetryable: true
        }
      )
    }

    // Default to database error
    return this.error(
      ErrorCodes.DATABASE_ERROR,
      message,
      'database',
      { details: error }
    )
  }

  /**
   * Get default user-friendly message for error category
   */
  private static getDefaultUserMessage(category: ErrorCategory): string {
    switch (category) {
      case 'authentication':
        return 'Please sign in to continue'
      case 'validation':
        return 'Please check your input and try again'
      case 'not_found':
        return 'The requested item was not found'
      case 'conflict':
        return 'This item already exists'
      case 'network':
        return 'Connection error. Please check your internet connection'
      case 'database':
        return 'A database error occurred. Please try again'
      case 'external_service':
        return 'An external service is temporarily unavailable'
      case 'business_logic':
        return 'This operation is not allowed'
      case 'system':
        return 'A system error occurred. Please contact support'
      default:
        return 'An unexpected error occurred. Please try again'
    }
  }

  /**
   * Determine if error category is retryable by default
   */
  private static getDefaultRetryable(category: ErrorCategory): boolean {
    switch (category) {
      case 'network':
      case 'external_service':
      case 'system':
        return true
      case 'authentication':
      case 'validation':
      case 'not_found':
      case 'conflict':
      case 'business_logic':
        return false
      default:
        return false
    }
  }
}

/**
 * Logger utility for consistent service logging
 */
export class ServiceLogger {
  static info(service: string, operation: string, message: string, data?: any): void {
    console.log(`🔧 [${service}:${operation}] ${message}`, data || '')
  }

  static warn(service: string, operation: string, message: string, data?: any): void {
    console.warn(`⚠️ [${service}:${operation}] ${message}`, data || '')
  }

  static error(service: string, operation: string, error: any, context?: any): void {
    console.error(`❌ [${service}:${operation}] Error:`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error,
      context
    })
  }

  static debug(service: string, operation: string, message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`🐛 [${service}:${operation}] ${message}`, data || '')
    }
  }
}

/**
 * Base service class with standardized error handling
 */
export abstract class BaseService {
  protected static serviceName: string = 'BaseService'

  /**
   * Execute a service operation with standardized error handling
   */
  protected static async executeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: any
  ): Promise<ServiceResponse<T>> {
    try {
      ServiceLogger.debug(this.serviceName, operation, 'Starting operation', context)
      
      const result = await fn()
      
      ServiceLogger.debug(this.serviceName, operation, 'Operation completed successfully')
      return ServiceResponseBuilder.success(result)
      
    } catch (error) {
      ServiceLogger.error(this.serviceName, operation, error, context)
      return ServiceResponseBuilder.fromError(error, `${this.serviceName}.${operation}`)
    }
  }

  /**
   * Validate required authentication
   */
  protected static async validateAuth(): Promise<ServiceResponse<{ userId: string }>> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return ServiceResponseBuilder.error(
          ErrorCodes.AUTH_REQUIRED,
          'Authentication required',
          'authentication'
        )
      }

      return ServiceResponseBuilder.success({ userId: user.id })
    } catch (error) {
      return ServiceResponseBuilder.fromError(error, 'Authentication validation')
    }
  }

  /**
   * Validate required parameters
   */
  protected static validateRequired(params: Record<string, any>): ServiceResponse | null {
    const missing = Object.entries(params)
      .filter(([key, value]) => value === undefined || value === null || value === '')
      .map(([key]) => key)

    if (missing.length > 0) {
      return ServiceResponseBuilder.error(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        `Missing required fields: ${missing.join(', ')}`,
        'validation',
        { details: { missingFields: missing } }
      )
    }

    return null
  }
}

// Import supabase for auth validation
import { supabase } from '../supabase'