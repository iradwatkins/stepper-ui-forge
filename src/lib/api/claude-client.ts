/**
 * Claude API Client with Automatic Fallback
 * 
 * This client wraps the standard Claude API calls and provides automatic
 * failover between primary and secondary API keys when usage limits are reached.
 */

import { ClaudeAPIManager } from './claude-config'

export interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ClaudeResponse {
  content: Array<{
    type: string
    text: string
  }>
  id: string
  model: string
  role: string
  stop_reason: string
  stop_sequence: null | string
  type: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface ClaudeRequestOptions {
  model?: string
  max_tokens?: number
  temperature?: number
  system?: string
  messages: ClaudeMessage[]
  stream?: boolean
}

export class ClaudeAPIClient {
  private manager: ClaudeAPIManager
  private readonly DEFAULT_MODEL = 'claude-3-5-sonnet-20241022'
  private readonly DEFAULT_MAX_TOKENS = 4096

  constructor() {
    this.manager = ClaudeAPIManager.getInstance()
  }

  /**
   * Send a message to Claude with automatic fallback
   */
  async sendMessage(
    messages: ClaudeMessage[],
    options: Partial<ClaudeRequestOptions> = {}
  ): Promise<ClaudeResponse> {
    const requestOptions: ClaudeRequestOptions = {
      model: options.model || this.DEFAULT_MODEL,
      max_tokens: options.max_tokens || this.DEFAULT_MAX_TOKENS,
      temperature: options.temperature || 0.7,
      messages,
      ...options
    }

    return this.makeRequestWithFallback(requestOptions)
  }

  /**
   * Make API request with automatic fallback handling
   */
  private async makeRequestWithFallback(
    options: ClaudeRequestOptions,
    attempt: number = 1
  ): Promise<ClaudeResponse> {
    // Check if we should switch back to primary
    this.manager.attemptSwitchBackToPrimary()
    
    const config = this.manager.getCurrentConfig()
    
    try {
      console.log(`🤖 Claude API: Using ${config.name} API (attempt ${attempt})`)
      
      const response = await this.makeRequest(config.apiKey, options)
      
      // Record success and return response
      this.manager.recordSuccess()
      console.log(`✅ Claude API: Request successful with ${config.name}`)
      
      return response
      
    } catch (error) {
      console.error(`❌ Claude API: Error with ${config.name}:`, error)
      
      // Handle the error and determine if we should retry
      const { shouldRetry, config: newConfig } = this.manager.handleAPIError(error)
      
      if (shouldRetry && attempt < 5) { // Max 5 total attempts
        console.log(`🔄 Retrying with ${newConfig.name} API...`)
        return this.makeRequestWithFallback(options, attempt + 1)
      }
      
      // If we've exhausted retries, throw the original error
      throw error
    }
  }

  /**
   * Make the actual HTTP request to Claude API
   */
  private async makeRequest(apiKey: string, options: ClaudeRequestOptions): Promise<ClaudeResponse> {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'anthropic-version': '2023-06-01'
    }

    const body = JSON.stringify({
      model: options.model,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      system: options.system,
      messages: options.messages,
      stream: false // We'll handle streaming separately if needed
    })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      ;(error as any).status = response.status
      ;(error as any).statusCode = response.status
      ;(error as any).response = errorData
      throw error
    }

    return response.json()
  }

  /**
   * Get current API status for monitoring
   */
  getStatus() {
    return this.manager.getStatus()
  }

  /**
   * Reset the fallback system (useful for testing)
   */
  reset() {
    this.manager.reset()
  }

  /**
   * Manually switch to backup API
   */
  switchToBackup(reason: string = 'Manual switch') {
    return this.manager.switchToBackup(reason)
  }

  /**
   * Test both APIs to ensure they're working
   */
  async testAPIs(): Promise<{
    primary: { working: boolean; error?: string }
    secondary: { working: boolean; error?: string }
    currentActive: string
  }> {
    const testMessage: ClaudeMessage[] = [
      { role: 'user', content: 'Test message - please respond with "API test successful"' }
    ]

    const results = {
      primary: { working: false, error: undefined as string | undefined },
      secondary: { working: false, error: undefined as string | undefined },
      currentActive: this.manager.getStatus().currentApi
    }

    // Test primary API
    try {
      this.manager.reset() // Start fresh
      const response = await this.makeRequest(
        process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '',
        {
          model: this.DEFAULT_MODEL,
          max_tokens: 100,
          messages: testMessage
        }
      )
      results.primary.working = true
      console.log('✅ Primary API test successful')
    } catch (error) {
      results.primary.working = false
      results.primary.error = error instanceof Error ? error.message : 'Unknown error'
      console.log('❌ Primary API test failed:', results.primary.error)
    }

    // Test secondary API
    try {
      const response = await this.makeRequest(
        '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',
        {
          model: this.DEFAULT_MODEL,
          max_tokens: 100,
          messages: testMessage
        }
      )
      results.secondary.working = true
      console.log('✅ Secondary API test successful')
    } catch (error) {
      results.secondary.working = false
      results.secondary.error = error instanceof Error ? error.message : 'Unknown error'
      console.log('❌ Secondary API test failed:', results.secondary.error)
    }

    return results
  }
}

// Export singleton instance
export const claudeClient = new ClaudeAPIClient()

// Export helper functions for easy integration
export async function sendClaudeMessage(
  messages: ClaudeMessage[],
  options?: Partial<ClaudeRequestOptions>
): Promise<ClaudeResponse> {
  return claudeClient.sendMessage(messages, options)
}

export function getClaudeAPIStatus() {
  return claudeClient.getStatus()
}

export async function testClaudeAPIs() {
  return claudeClient.testAPIs()
}