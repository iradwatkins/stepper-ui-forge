// React hook for managing signup intents and authentication flow interrupts
// Provides utilities for intent storage, execution, and UI state management

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { SignupIntentService, SignupIntentType } from '@/lib/services/SignupIntentService'
import { useRouter } from 'next/router'

export interface UseSignupIntentResult {
  // Intent state
  hasPendingIntent: boolean
  intentType: SignupIntentType | null
  signupPromptMessage: string
  
  // Intent storage methods
  storeFollowIntent: (organizerId: string, organizerName: string, redirectPath?: string) => void
  storePurchaseIntent: (eventId: string, cartItems: any[], referralCode?: string, redirectPath?: string) => void
  storeCreateEventIntent: (redirectPath?: string) => void
  storeReferralIntent: (referralCode: string, targetPath: string) => void
  
  // Intent execution
  executeStoredIntent: () => Promise<void>
  clearIntent: () => void
  
  // UI helpers
  shouldShowSignupPrompt: boolean
  isExecutingIntent: boolean
  intentMessage: string | null
}

export const useSignupIntent = (): UseSignupIntentResult => {
  const { user } = useAuth()
  const router = useRouter()
  
  const [hasPendingIntent, setHasPendingIntent] = useState(false)
  const [intentType, setIntentType] = useState<SignupIntentType | null>(null)
  const [isExecutingIntent, setIsExecutingIntent] = useState(false)
  const [intentMessage, setIntentMessage] = useState<string | null>(null)

  // Check for pending intents on mount and when user changes
  useEffect(() => {
    const checkPendingIntent = () => {
      const pending = SignupIntentService.hasPendingIntent()
      const type = SignupIntentService.getPendingIntentType()
      
      setHasPendingIntent(pending)
      setIntentType(type)
    }

    checkPendingIntent()
  }, [user])

  // Auto-execute intent when user becomes authenticated
  useEffect(() => {
    if (user && hasPendingIntent) {
      executeStoredIntent()
    }
  }, [user, hasPendingIntent])

  const storeFollowIntent = useCallback((organizerId: string, organizerName: string, redirectPath?: string) => {
    SignupIntentService.storeFollowIntent(organizerId, organizerName, redirectPath)
    setHasPendingIntent(true)
    setIntentType('follow_organizer')
  }, [])

  const storePurchaseIntent = useCallback((
    eventId: string, 
    cartItems: any[], 
    referralCode?: string, 
    redirectPath?: string
  ) => {
    SignupIntentService.storePurchaseIntent(eventId, cartItems, referralCode, redirectPath)
    setHasPendingIntent(true)
    setIntentType('purchase_tickets')
  }, [])

  const storeCreateEventIntent = useCallback((redirectPath?: string) => {
    SignupIntentService.storeCreateEventIntent(redirectPath)
    setHasPendingIntent(true)
    setIntentType('create_event')
  }, [])

  const storeReferralIntent = useCallback((referralCode: string, targetPath: string) => {
    SignupIntentService.storeReferralIntent(referralCode, targetPath)
    setHasPendingIntent(true)
    setIntentType('referral_click')
  }, [])

  const executeStoredIntent = useCallback(async () => {
    if (!user) return

    setIsExecutingIntent(true)
    setIntentMessage(null)

    try {
      const result = await SignupIntentService.executeIntent(user.id)
      
      if (result.success) {
        setIntentMessage(result.message || 'Welcome!')
        
        // Redirect if needed
        if (result.redirectPath && result.redirectPath !== router.asPath) {
          setTimeout(() => {
            router.push(result.redirectPath!)
          }, 1000) // Give user time to see the message
        }
      } else {
        setIntentMessage(result.error || 'Something went wrong')
        
        // Still redirect on error if path is provided
        if (result.redirectPath && result.redirectPath !== router.asPath) {
          setTimeout(() => {
            router.push(result.redirectPath!)
          }, 2000)
        }
      }
      
      // Clear intent state
      setHasPendingIntent(false)
      setIntentType(null)
      
    } catch (error) {
      console.error('Failed to execute stored intent:', error)
      setIntentMessage('Welcome! Something went wrong with your previous action.')
      setHasPendingIntent(false)
      setIntentType(null)
    } finally {
      setIsExecutingIntent(false)
      
      // Clear message after delay
      setTimeout(() => {
        setIntentMessage(null)
      }, 5000)
    }
  }, [user, router])

  const clearIntent = useCallback(() => {
    SignupIntentService.clearIntent()
    setHasPendingIntent(false)
    setIntentType(null)
    setIntentMessage(null)
  }, [])

  const signupPromptMessage = SignupIntentService.getSignupPromptMessage()
  const shouldShowSignupPrompt = !user && hasPendingIntent

  return {
    hasPendingIntent,
    intentType,
    signupPromptMessage,
    storeFollowIntent,
    storePurchaseIntent,
    storeCreateEventIntent,
    storeReferralIntent,
    executeStoredIntent,
    clearIntent,
    shouldShowSignupPrompt,
    isExecutingIntent,
    intentMessage
  }
}

// Utility hook for handling authentication-required actions
export const useAuthRequiredAction = () => {
  const { user } = useAuth()
  const { storeFollowIntent, storePurchaseIntent, storeCreateEventIntent } = useSignupIntent()
  const router = useRouter()

  const handleFollowAction = useCallback((organizerId: string, organizerName: string) => {
    if (!user) {
      storeFollowIntent(organizerId, organizerName, router.asPath)
      router.push('/auth/signup')
      return false
    }
    return true
  }, [user, storeFollowIntent, router])

  const handlePurchaseAction = useCallback((eventId: string, cartItems: any[], referralCode?: string) => {
    if (!user) {
      storePurchaseIntent(eventId, cartItems, referralCode, router.asPath)
      router.push('/auth/signup')
      return false
    }
    return true
  }, [user, storePurchaseIntent, router])

  const handleCreateEventAction = useCallback(() => {
    if (!user) {
      storeCreateEventIntent('/create-event')
      router.push('/auth/signup')
      return false
    }
    return true
  }, [user, storeCreateEventIntent, router])

  return {
    handleFollowAction,
    handlePurchaseAction,
    handleCreateEventAction,
    isAuthenticated: !!user
  }
}