// Signup Intent Service for preserving user intentions during authentication interrupts
// Handles follow intentions, cart preservation, and post-signup redirections

export type SignupIntentType = 
  | 'follow_organizer'
  | 'purchase_tickets'
  | 'create_event'
  | 'referral_click'

export interface SignupIntent {
  type: SignupIntentType
  data: Record<string, any>
  redirectPath?: string
  timestamp: number
}

export interface FollowIntent {
  organizerId: string
  organizerName: string
}

export interface PurchaseIntent {
  eventId: string
  cartItems: Array<{
    ticketTypeId: string
    quantity: number
    eventId: string
  }>
  referralCode?: string
}

export interface ReferralIntent {
  referralCode: string
  targetPath: string
}

export class SignupIntentService {
  private static readonly INTENT_STORAGE_KEY = 'signup_intent'
  private static readonly INTENT_EXPIRY_HOURS = 24

  /**
   * Store follow organizer intent
   */
  static storeFollowIntent(organizerId: string, organizerName: string, redirectPath?: string): void {
    const intent: SignupIntent = {
      type: 'follow_organizer',
      data: {
        organizerId,
        organizerName
      },
      redirectPath,
      timestamp: Date.now()
    }
    
    this.storeIntent(intent)
  }

  /**
   * Store ticket purchase intent with cart data
   */
  static storePurchaseIntent(
    eventId: string, 
    cartItems: PurchaseIntent['cartItems'],
    referralCode?: string,
    redirectPath?: string
  ): void {
    const intent: SignupIntent = {
      type: 'purchase_tickets',
      data: {
        eventId,
        cartItems,
        referralCode
      },
      redirectPath,
      timestamp: Date.now()
    }
    
    this.storeIntent(intent)
  }

  /**
   * Store event creation intent
   */
  static storeCreateEventIntent(redirectPath?: string): void {
    const intent: SignupIntent = {
      type: 'create_event',
      data: {},
      redirectPath: redirectPath || '/create-event',
      timestamp: Date.now()
    }
    
    this.storeIntent(intent)
  }

  /**
   * Store referral click intent
   */
  static storeReferralIntent(referralCode: string, targetPath: string): void {
    const intent: SignupIntent = {
      type: 'referral_click',
      data: {
        referralCode,
        targetPath
      },
      redirectPath: targetPath,
      timestamp: Date.now()
    }
    
    this.storeIntent(intent)
  }

  /**
   * Generic store intent function
   */
  private static storeIntent(intent: SignupIntent): void {
    try {
      localStorage.setItem(this.INTENT_STORAGE_KEY, JSON.stringify(intent))
    } catch (error) {
      console.error('Failed to store signup intent:', error)
    }
  }

  /**
   * Retrieve stored intent
   */
  static getStoredIntent(): SignupIntent | null {
    try {
      const stored = localStorage.getItem(this.INTENT_STORAGE_KEY)
      if (!stored) return null

      const intent: SignupIntent = JSON.parse(stored)
      
      // Check if intent has expired
      const hoursAgo = (Date.now() - intent.timestamp) / (1000 * 60 * 60)
      if (hoursAgo > this.INTENT_EXPIRY_HOURS) {
        this.clearIntent()
        return null
      }

      return intent
    } catch (error) {
      console.error('Failed to retrieve signup intent:', error)
      this.clearIntent()
      return null
    }
  }

  /**
   * Clear stored intent
   */
  static clearIntent(): void {
    try {
      localStorage.removeItem(this.INTENT_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear signup intent:', error)
    }
  }

  /**
   * Execute stored intent after successful signup/signin
   */
  static async executeIntent(userId: string): Promise<{
    success: boolean
    redirectPath?: string
    message?: string
    error?: string
  }> {
    const intent = this.getStoredIntent()
    if (!intent) {
      return { success: false, error: 'No intent found' }
    }

    try {
      switch (intent.type) {
        case 'follow_organizer':
          return await this.executeFollowIntent(userId, intent.data as FollowIntent, intent.redirectPath)
        
        case 'purchase_tickets':
          return await this.executePurchaseIntent(userId, intent.data as PurchaseIntent, intent.redirectPath)
        
        case 'create_event':
          return this.executeCreateEventIntent(intent.redirectPath)
        
        case 'referral_click':
          return this.executeReferralIntent(intent.data as ReferralIntent)
        
        default:
          return { success: false, error: 'Unknown intent type' }
      }
    } catch (error) {
      console.error('Failed to execute intent:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    } finally {
      this.clearIntent()
    }
  }

  /**
   * Execute follow organizer intent
   */
  private static async executeFollowIntent(
    userId: string, 
    data: FollowIntent, 
    redirectPath?: string
  ): Promise<{
    success: boolean
    redirectPath?: string
    message?: string
    error?: string
  }> {
    try {
      const { FollowerService } = await import('./FollowerService')
      
      const result = await FollowerService.followOrganizer(userId, data.organizerId)
      
      if (result.success) {
        return {
          success: true,
          redirectPath: redirectPath || `/organizer/${data.organizerId}`,
          message: `You are now following ${data.organizerName}!`
        }
      } else {
        return {
          success: false,
          error: result.error || 'Failed to follow organizer',
          redirectPath: redirectPath || `/organizer/${data.organizerId}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to execute follow intent',
        redirectPath: redirectPath || '/'
      }
    }
  }

  /**
   * Execute purchase intent by restoring cart
   */
  private static async executePurchaseIntent(
    userId: string,
    data: PurchaseIntent,
    redirectPath?: string
  ): Promise<{
    success: boolean
    redirectPath?: string
    message?: string
    error?: string
  }> {
    try {
      // Import cart context helper or service
      // For now, we'll store the cart data in session storage for the cart to pickup
      const cartData = {
        items: data.cartItems,
        referralCode: data.referralCode,
        userId: userId
      }
      
      sessionStorage.setItem('restored_cart', JSON.stringify(cartData))
      
      return {
        success: true,
        redirectPath: redirectPath || `/event/${data.eventId}`,
        message: 'Your cart has been restored! Complete your purchase below.'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to restore cart',
        redirectPath: redirectPath || '/'
      }
    }
  }

  /**
   * Execute create event intent
   */
  private static executeCreateEventIntent(redirectPath?: string): {
    success: boolean
    redirectPath?: string
    message?: string
  } {
    return {
      success: true,
      redirectPath: redirectPath || '/create-event',
      message: 'Welcome! You can now create your event.'
    }
  }

  /**
   * Execute referral intent
   */
  private static executeReferralIntent(data: ReferralIntent): {
    success: boolean
    redirectPath?: string
    message?: string
  } {
    // Track the referral click now that user is authenticated
    import('./ReferralService').then(({ ReferralService }) => {
      ReferralService.trackReferralClick(data.referralCode)
    }).catch(console.error)

    return {
      success: true,
      redirectPath: data.targetPath,
      message: 'Welcome! You arrived via a referral link.'
    }
  }

  /**
   * Check if there's a pending intent (for UI display)
   */
  static hasPendingIntent(): boolean {
    return this.getStoredIntent() !== null
  }

  /**
   * Get pending intent type for UI messaging
   */
  static getPendingIntentType(): SignupIntentType | null {
    const intent = this.getStoredIntent()
    return intent?.type || null
  }

  /**
   * Generate signup prompt message based on intent
   */
  static getSignupPromptMessage(): string {
    const intent = this.getStoredIntent()
    if (!intent) return 'Sign up to continue'

    switch (intent.type) {
      case 'follow_organizer':
        const organizer = intent.data as FollowIntent
        return `We noticed you liked ${organizer.organizerName}. Sign up for an account!`
      
      case 'purchase_tickets':
        return 'Sign up to purchase tickets and complete your order'
      
      case 'create_event':
        return 'Sign up to start creating your event'
      
      case 'referral_click':
        return 'Sign up to access this exclusive content'
      
      default:
        return 'Sign up to continue'
    }
  }

  /**
   * Handle cart preservation for anonymous users
   */
  static preserveAnonymousCart(cartItems: Array<{
    ticketTypeId: string
    quantity: number
    eventId: string
  }>): void {
    try {
      sessionStorage.setItem('anonymous_cart', JSON.stringify(cartItems))
    } catch (error) {
      console.error('Failed to preserve anonymous cart:', error)
    }
  }

  /**
   * Restore anonymous cart after signup
   */
  static getPreservedCart(): Array<{
    ticketTypeId: string
    quantity: number
    eventId: string
  }> | null {
    try {
      const stored = sessionStorage.getItem('anonymous_cart') || sessionStorage.getItem('restored_cart')
      if (!stored) return null

      const data = JSON.parse(stored)
      
      // Clear the stored data
      sessionStorage.removeItem('anonymous_cart')
      sessionStorage.removeItem('restored_cart')
      
      return data.items || data
    } catch (error) {
      console.error('Failed to restore preserved cart:', error)
      return null
    }
  }
}