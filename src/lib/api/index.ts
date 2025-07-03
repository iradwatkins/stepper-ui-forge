// Placeholder API module - temporarily disabled to resolve build errors
// This will be re-enabled once the core application is stable

export const apiClient = {
  test: () => Promise.resolve({ message: 'API module temporarily disabled' })
}

export const ClaudeAPIClient = apiClient
export const claudeClient = apiClient
export const sendClaudeMessage = () => Promise.resolve({ message: 'disabled' })
export const getClaudeAPIStatus = () => ({ status: 'disabled' })
export const testClaudeAPIs = () => Promise.resolve({ primary: { working: false }, secondary: { working: false } })

export default apiClient