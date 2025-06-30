import { useState, useCallback } from 'react'
import { QRValidationService, QRValidationResult, CheckInResult } from '../services/QRValidationService'

export interface UseQRValidationState {
  isValidating: boolean
  isCheckingIn: boolean
  lastValidation: QRValidationResult | null
  lastCheckIn: CheckInResult | null
  error: string | null
}

export interface UseQRValidationActions {
  validateQR: (qrCodeData: string) => Promise<QRValidationResult>
  checkInTicket: (ticketId: string, checkedInBy?: string) => Promise<CheckInResult>
  validateAndCheckIn: (qrCodeData: string, checkedInBy?: string) => Promise<CheckInResult>
  clearState: () => void
  clearError: () => void
}

export type UseQRValidationReturn = UseQRValidationState & UseQRValidationActions

/**
 * React hook for QR code validation and ticket check-in
 */
export function useQRValidation(): UseQRValidationReturn {
  const [state, setState] = useState<UseQRValidationState>({
    isValidating: false,
    isCheckingIn: false,
    lastValidation: null,
    lastCheckIn: null,
    error: null
  })

  const validateQR = useCallback(async (qrCodeData: string): Promise<QRValidationResult> => {
    setState(prev => ({ ...prev, isValidating: true, error: null }))
    
    try {
      const result = await QRValidationService.validateQRCode(qrCodeData)
      setState(prev => ({ 
        ...prev, 
        isValidating: false, 
        lastValidation: result,
        error: result.valid ? null : result.error || 'Validation failed'
      }))
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed'
      setState(prev => ({ 
        ...prev, 
        isValidating: false, 
        error: errorMessage 
      }))
      throw error
    }
  }, [])

  const checkInTicket = useCallback(async (ticketId: string, checkedInBy?: string): Promise<CheckInResult> => {
    setState(prev => ({ ...prev, isCheckingIn: true, error: null }))
    
    try {
      const result = await QRValidationService.checkInTicket(ticketId, checkedInBy)
      setState(prev => ({ 
        ...prev, 
        isCheckingIn: false, 
        lastCheckIn: result,
        error: result.success ? null : result.error || 'Check-in failed'
      }))
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Check-in failed'
      setState(prev => ({ 
        ...prev, 
        isCheckingIn: false, 
        error: errorMessage 
      }))
      throw error
    }
  }, [])

  const validateAndCheckIn = useCallback(async (qrCodeData: string, checkedInBy?: string): Promise<CheckInResult> => {
    setState(prev => ({ ...prev, isValidating: true, isCheckingIn: true, error: null }))
    
    try {
      const result = await QRValidationService.validateAndCheckIn(qrCodeData, checkedInBy)
      setState(prev => ({ 
        ...prev, 
        isValidating: false, 
        isCheckingIn: false, 
        lastCheckIn: result,
        error: result.success ? null : result.error || 'Operation failed'
      }))
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed'
      setState(prev => ({ 
        ...prev, 
        isValidating: false, 
        isCheckingIn: false, 
        error: errorMessage 
      }))
      throw error
    }
  }, [])

  const clearState = useCallback(() => {
    setState({
      isValidating: false,
      isCheckingIn: false,
      lastValidation: null,
      lastCheckIn: null,
      error: null
    })
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    validateQR,
    checkInTicket,
    validateAndCheckIn,
    clearState,
    clearError
  }
}

/**
 * Hook for bulk QR validation operations
 */
export function useBulkQRValidation() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<QRValidationResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const validateBulk = useCallback(async (qrCodes: string[]) => {
    setIsProcessing(true)
    setError(null)
    
    try {
      const { results, summary } = await QRValidationService.bulkValidate(qrCodes)
      setResults(results)
      setIsProcessing(false)
      return { results, summary }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk validation failed'
      setError(errorMessage)
      setIsProcessing(false)
      throw error
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  return {
    isProcessing,
    results,
    error,
    validateBulk,
    clearResults
  }
}