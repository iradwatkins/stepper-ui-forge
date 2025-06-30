import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { ClaudeAPIManager } from '../claude-config'
import { ClaudeAPIClient } from '../claude-client'

// Mock fetch for testing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

describe('Claude API Fallback System', () => {
  let apiManager: ClaudeAPIManager
  let apiClient: ClaudeAPIClient

  beforeEach(() => {
    apiManager = ClaudeAPIManager.getInstance()
    apiClient = new ClaudeAPIClient()
    apiManager.reset()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('ClaudeAPIManager', () => {
    it('should start with primary API as default', () => {
      const config = apiManager.getCurrentConfig()
      expect(config.name).toBe('Primary')
      
      const status = apiManager.getStatus()
      expect(status.currentApi).toBe('primary')
    })

    it('should detect usage limit errors correctly', () => {
      const usageLimitError = { message: 'usage limit exceeded', status: 429 }
      const rateLimitError = { statusCode: 429 }
      const quotaError = { message: 'quota exceeded' }
      const regularError = { message: 'network error' }

      expect(apiManager.isUsageLimitError(usageLimitError)).toBe(true)
      expect(apiManager.isUsageLimitError(rateLimitError)).toBe(true)
      expect(apiManager.isUsageLimitError(quotaError)).toBe(true)
      expect(apiManager.isUsageLimitError(regularError)).toBe(false)
    })

    it('should switch to backup on usage limit error', () => {
      const usageLimitError = { message: 'usage limit exceeded' }
      const result = apiManager.handleAPIError(usageLimitError)
      
      expect(result.shouldRetry).toBe(true)
      expect(result.config.name).toBe('Secondary')
      expect(apiManager.getStatus().currentApi).toBe('secondary')
    })

    it('should switch after max errors reached', () => {
      const regularError = { message: 'network error' }
      
      // First 2 errors should not switch
      let result = apiManager.handleAPIError(regularError)
      expect(result.config.name).toBe('Primary')
      
      result = apiManager.handleAPIError(regularError)
      expect(result.config.name).toBe('Primary')
      
      // 3rd error should trigger switch
      result = apiManager.handleAPIError(regularError)
      expect(result.config.name).toBe('Secondary')
      expect(apiManager.getStatus().currentApi).toBe('secondary')
    })

    it('should reset error count on success', () => {
      const regularError = { message: 'network error' }
      
      // Generate some errors
      apiManager.handleAPIError(regularError)
      apiManager.handleAPIError(regularError)
      
      const status = apiManager.getStatus()
      expect(status.primaryErrors).toBe(2)
      
      // Record success should reset errors
      apiManager.recordSuccess()
      const newStatus = apiManager.getStatus()
      expect(newStatus.primaryErrors).toBe(0)
    })

    it('should track switch statistics', () => {
      const initialStatus = apiManager.getStatus()
      expect(initialStatus.totalSwitches).toBe(0)
      
      // Trigger a switch
      const usageLimitError = { message: 'usage limit exceeded' }
      apiManager.handleAPIError(usageLimitError)
      
      const newStatus = apiManager.getStatus()
      expect(newStatus.totalSwitches).toBe(1)
      expect(newStatus.lastSwitch).toBeDefined()
      expect(newStatus.switchReason).toContain('usage limit')
    })
  })

  describe('ClaudeAPIClient', () => {
    const mockSuccessResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Test response' }],
        id: 'test-id',
        model: 'claude-3-5-sonnet-20241022',
        role: 'assistant',
        stop_reason: 'end_turn',
        stop_sequence: null,
        type: 'message',
        usage: { input_tokens: 10, output_tokens: 20 }
      })
    } as Response

    it('should make successful API calls', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse)

      const messages = [{ role: 'user' as const, content: 'Test message' }]
      const response = await apiClient.sendMessage(messages)

      expect(response.content[0].text).toBe('Test response')
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should switch APIs on usage limit error', async () => {
      const usageLimitError = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: { message: 'usage limit exceeded' } })
      } as Response

      mockFetch
        .mockResolvedValueOnce(usageLimitError) // First call fails with usage limit
        .mockResolvedValueOnce(mockSuccessResponse) // Second call succeeds

      const messages = [{ role: 'user' as const, content: 'Test message' }]
      const response = await apiClient.sendMessage(messages)

      expect(response.content[0].text).toBe('Test response')
      expect(global.fetch).toHaveBeenCalledTimes(2) // Should have retried with backup API
      expect(apiClient.getStatus().currentApi).toBe('secondary')
    })

    it('should retry with same API for non-usage-limit errors', async () => {
      const networkError = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: { message: 'Internal server error' } })
      } as Response

      mockFetch
        .mockResolvedValueOnce(networkError) // First call fails
        .mockResolvedValueOnce(mockSuccessResponse) // Second call succeeds

      const messages = [{ role: 'user' as const, content: 'Test message' }]
      const response = await apiClient.sendMessage(messages)

      expect(response.content[0].text).toBe('Test response')
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(apiClient.getStatus().currentApi).toBe('primary') // Should stay on primary
    })

    it('should throw error after max retries', async () => {
      const networkError = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: { message: 'Internal server error' } })
      } as Response

      mockFetch.mockResolvedValue(networkError)

      const messages = [{ role: 'user' as const, content: 'Test message' }]
      
      await expect(apiClient.sendMessage(messages)).rejects.toThrow()
      expect(global.fetch).toHaveBeenCalledTimes(5) // Should have made 5 attempts (max retries)
    })
  })

  describe('Integration Tests', () => {
    it('should maintain status across client instances', () => {
      // Switch API using manager
      const usageLimitError = { message: 'usage limit exceeded' }
      apiManager.handleAPIError(usageLimitError)
      
      // Create new client instance
      const newClient = new ClaudeAPIClient()
      
      // Should use the same status
      expect(newClient.getStatus().currentApi).toBe('secondary')
    })

    it('should handle manual API switching', () => {
      const initialStatus = apiClient.getStatus()
      expect(initialStatus.currentApi).toBe('primary')
      
      apiClient.switchToBackup('Manual test switch')
      
      const newStatus = apiClient.getStatus()
      expect(newStatus.currentApi).toBe('secondary')
      expect(newStatus.switchReason).toBe('Manual test switch')
    })

    it('should reset system correctly', () => {
      // Generate some activity
      const usageLimitError = { message: 'usage limit exceeded' }
      apiManager.handleAPIError(usageLimitError)
      apiManager.handleAPIError({ message: 'network error' })
      
      // Reset
      apiClient.reset()
      
      const status = apiClient.getStatus()
      expect(status.currentApi).toBe('primary')
      expect(status.totalSwitches).toBe(0)
      expect(status.primaryErrors).toBe(0)
      expect(status.secondaryErrors).toBe(0)
    })
  })
})