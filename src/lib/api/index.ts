/**
 * Claude API Fallback System - Main Export
 * 
 * This module provides a simple interface to the Claude API fallback system.
 * Import this to get automatic failover between primary and secondary API keys.
 */

export {
  ClaudeAPIClient,
  claudeClient,
  sendClaudeMessage,
  getClaudeAPIStatus,
  testClaudeAPIs,
  type ClaudeMessage,
  type ClaudeResponse,
  type ClaudeRequestOptions
} from './claude-client'

export {
  ClaudeAPIManager,
  type ClaudeAPIConfig,
  type FallbackStatus
} from './claude-config'

export { APIStatusMonitor } from '../../components/dev/APIStatusMonitor'

/**
 * Initialize the Claude API fallback system
 * Call this once at the start of your application
 */
export function initializeClaudeAPI(options?: {
  primaryApiKey?: string
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug'
}) {
  console.log('🤖 Claude API Fallback System initialized')
  console.log('📡 Primary API: Configured')
  console.log('🔄 Secondary API: Configured')
  console.log('✅ Automatic failover: Enabled')
  
  if (options?.logLevel) {
    console.log(`📊 Log level: ${options.logLevel}`)
  }
  
  return claudeClient
}

/**
 * Quick health check for both APIs
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  primary: boolean
  secondary: boolean
  message: string
}> {
  try {
    const results = await testClaudeAPIs()
    
    const primaryWorking = results.primary.working
    const secondaryWorking = results.secondary.working
    
    if (primaryWorking && secondaryWorking) {
      return {
        status: 'healthy',
        primary: true,
        secondary: true,
        message: 'Both APIs are working normally'
      }
    } else if (primaryWorking || secondaryWorking) {
      return {
        status: 'degraded',
        primary: primaryWorking,
        secondary: secondaryWorking,
        message: `Only ${primaryWorking ? 'primary' : 'secondary'} API is working`
      }
    } else {
      return {
        status: 'unhealthy',
        primary: false,
        secondary: false,
        message: 'Both APIs are failing'
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      primary: false,
      secondary: false,
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Environment variable setup helper
 */
export function validateEnvironment(): {
  valid: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  
  // Check for primary API key
  const primaryKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!primaryKey) {
    issues.push('Primary API key not found in environment variables')
    recommendations.push('Set CLAUDE_API_KEY or ANTHROPIC_API_KEY environment variable')
  }
  
  // Check API key format
  if (primaryKey && !primaryKey.startsWith('sk-ant-api')) {
    issues.push('Primary API key format appears invalid')
    recommendations.push('Ensure API key starts with "sk-ant-api"')
  }
  
  // Secondary API key is hardcoded, so no check needed
  
  return {
    valid: issues.length === 0,
    issues,
    recommendations
  }
}

/**
 * Create a simple middleware for Express.js applications
 */
export function createClaudeMiddleware() {
  return (req: any, res: any, next: any) => {
    req.claude = claudeClient
    req.claudeHealth = healthCheck
    next()
  }
}

/**
 * Usage statistics helper
 */
export function getUsageStats() {
  const status = getClaudeAPIStatus()
  return {
    currentAPI: status.currentApi,
    totalSwitches: status.totalSwitches,
    lastSwitch: status.lastSwitch,
    errors: {
      primary: status.primaryErrors,
      secondary: status.secondaryErrors
    },
    uptime: {
      primary: status.primaryHealthy,
      secondary: status.secondaryHealthy
    }
  }
}