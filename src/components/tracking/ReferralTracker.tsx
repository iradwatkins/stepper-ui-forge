// Referral Tracker component for handling referral codes in URL parameters
// Automatically tracks referral clicks and stores intent for unauthenticated users

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useSignupIntent } from '@/lib/hooks/useSignupIntent'
import { ReferralService } from '@/lib/services/ReferralService'

export const ReferralTracker: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const { storeReferralIntent } = useSignupIntent()

  useEffect(() => {
    const handleReferralCode = async () => {
      const { ref } = router.query
      
      if (!ref || typeof ref !== 'string') {
        return
      }

      try {
        // Validate the referral code
        const validation = await ReferralService.validateReferralCode(ref)
        
        if (!validation.valid) {
          console.warn('Invalid referral code:', ref)
          return
        }

        if (user) {
          // User is authenticated, track the click immediately
          await ReferralService.trackReferralClick(ref)
        } else {
          // User is not authenticated, store intent for after signup
          storeReferralIntent(ref, router.asPath)
        }

        // Store referral code in session for checkout process
        sessionStorage.setItem('referral_code', ref)

      } catch (error) {
        console.error('Error handling referral code:', error)
      }
    }

    if (router.isReady) {
      handleReferralCode()
    }
  }, [router.isReady, router.query.ref, router.asPath, user, storeReferralIntent])

  // This component doesn't render anything
  return null
}

// Hook for getting current referral code
export const useReferralCode = () => {
  const router = useRouter()
  
  const getCurrentReferralCode = (): string | null => {
    // First check URL parameter
    const { ref } = router.query
    if (ref && typeof ref === 'string') {
      return ref
    }

    // Then check session storage
    try {
      return sessionStorage.getItem('referral_code')
    } catch {
      return null
    }
  }

  const clearReferralCode = () => {
    try {
      sessionStorage.removeItem('referral_code')
    } catch {
      // Ignore error
    }
  }

  return {
    referralCode: getCurrentReferralCode(),
    clearReferralCode
  }
}

// Component for adding referral tracking to specific buttons/links
interface TrackedLinkProps {
  href: string
  referralCode?: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export const TrackedLink: React.FC<TrackedLinkProps> = ({ 
  href, 
  referralCode, 
  children, 
  className,
  onClick 
}) => {
  const router = useRouter()

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (referralCode) {
      try {
        await ReferralService.trackReferralClick(referralCode)
      } catch (error) {
        console.error('Failed to track referral click:', error)
      }
    }
    
    onClick?.()
    router.push(href)
  }

  return (
    <a 
      href={href}
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}