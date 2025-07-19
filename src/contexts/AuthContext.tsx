
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { setupInitialAdmin } from '@/lib/admin/setupAdmin'
import { toast } from '@/components/ui/sonner'
// Removed sessionConfig imports - using Supabase's built-in session management

// Real-time registration monitoring system
const createRegistrationLogger = () => {
  const logs: any[] = []
  
  const log = (type: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      type,
      message,
      data,
      url: window.location.href
    }
    
    logs.push(logEntry)
    console.log(`🔍 [${type.toUpperCase()}] ${timestamp}: ${message}`, data || '')
    
    // Store in localStorage for persistence
    try {
      const existingLogs = JSON.parse(localStorage.getItem('auth_test_logs') || '[]')
      existingLogs.push(logEntry)
      localStorage.setItem('auth_test_logs', JSON.stringify(existingLogs.slice(-50))) // Keep last 50 logs
    } catch (e) {
      console.warn('Failed to store log in localStorage:', e)
    }
  }
  
  const exportLogs = () => {
    const allLogs = JSON.parse(localStorage.getItem('auth_test_logs') || '[]')
    console.log('📊 COMPLETE REGISTRATION LOGS:', allLogs)
    return allLogs
  }
  
  const clearLogs = () => {
    localStorage.removeItem('auth_test_logs')
    logs.length = 0
    console.log('🧹 Registration logs cleared')
  }
  
  return { log, exportLogs, clearLogs }
}

// Global logger instance
const regLogger = createRegistrationLogger()

// Expose logger to window for debugging
if (typeof window !== 'undefined') {
  (window as any).authLogger = regLogger
}

// Helper function to get the correct redirect URL for different environments
const getRedirectUrl = (): string => {
  const origin = window.location.origin
  console.log('🔐 Current origin:', origin)
  
  // All users should go to events page after authentication
  // This provides immediate access to browse and discover events
  return `${origin}/events`
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  authStateId: number
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authStateId, setAuthStateId] = useState(0) // Counter to force re-renders

  useEffect(() => {
    regLogger.log('init', 'AuthContext: Initializing authentication system')
    
    // Listen for auth changes with enhanced monitoring FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      regLogger.log('auth_event', `Auth state change: ${event}`, {
        event,
        hasSession: !!session,
        userEmail: session?.user?.email,
        userId: session?.user?.id,
        userMetadata: session?.user?.user_metadata,
        rawUserMetadata: session?.user?.raw_user_meta_data,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
      
      // Check URL for error parameters
      const urlParams = new URLSearchParams(window.location.search)
      const urlHash = new URLSearchParams(window.location.hash.substring(1))
      
      if (urlParams.get('error') || urlHash.get('error')) {
        regLogger.log('error_url', 'Error detected in URL parameters', {
          searchParams: Object.fromEntries(urlParams),
          hashParams: Object.fromEntries(urlHash),
          fullUrl: window.location.href
        })
      }
      
      // Update state immediately
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Enhanced success handling with profile checking
      if (event === 'SIGNED_IN' && session?.user) {
        regLogger.log('signin_success', 'User signed in successfully', {
          userId: session.user.id,
          email: session.user.email,
          metadata: session.user.user_metadata,
          rawMetadata: session.user.raw_user_meta_data
        })
        
        // Check if profile exists in database (deferred to prevent deadlock)
        setTimeout(async () => {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
              
            regLogger.log('profile_check', 'Profile existence check', {
              profileExists: !!profile,
              profileData: profile,
              error: profileError?.message,
              userId: session.user.id
            })
          } catch (err) {
            regLogger.log('profile_error', 'Error checking profile', {
              error: err,
              userId: session.user.id
            })
          }
        }, 100)
        
        const userName = session.user.user_metadata?.full_name || 
                        session.user.email?.split('@')[0] || 
                        'User'
        
        toast.success(`Welcome back, ${userName}! 👋`, {
          description: 'You can now access your profile and dashboard',
          duration: 4000,
          action: {
            label: 'View Profile',
            onClick: () => window.location.href = '/dashboard/profile'
          }
        })
      }
      
      // Enhanced error handling
      if (event === 'SIGNED_OUT') {
        regLogger.log('signout', 'User signed out')
      }
      
      // Force a re-render by updating the counter
      setAuthStateId(prev => prev + 1)
      
      // Additional delay to ensure all components receive the update
      setTimeout(() => {
        regLogger.log('state_propagated', 'Auth state propagated to components', {
          hasUser: !!session?.user,
          authStateId: authStateId + 1
        })
      }, 50)
    })

    // Get initial session AFTER setting up listener
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      regLogger.log('session', 'Initial session retrieved', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        error: error?.message,
        storageKeys: Object.keys(localStorage).filter(k => k.includes('auth')),
        stepperAuthExists: !!localStorage.getItem('stepper-auth')
      })
      
      // Debug: log raw session data
      if (session) {
        console.log('🔐 Session found:', {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: session.expires_at,
          expiresIn: session.expires_in
        })
      } else {
        console.log('🔐 No session found on initial load')
      }
      
      // Always update session state to ensure consistency
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      setAuthStateId(prev => prev + 1)
    })

    return () => {
      regLogger.log('cleanup', 'AuthContext: Cleaning up subscription')
      subscription.unsubscribe()
    }
  }, [])

  // Auto-setup admin for designated admin email (with session flag to prevent spam)
  useEffect(() => {
    const performAdminSetup = async () => {
      // Check if we've already attempted admin setup this session
      const setupAttempted = sessionStorage.getItem('adminSetupAttempted')
      
      if (user && user.email === 'iradwatkins@gmail.com' && !setupAttempted) {
        console.log('🔐 Auto-setting up admin for:', user.email)
        // Mark as attempted to prevent repeated tries
        sessionStorage.setItem('adminSetupAttempted', 'true')
        
        try {
          const result = await setupInitialAdmin()
          if (result.success) {
            console.log('🔐 Admin setup successful')
          }
        } catch (error) {
          // Silently fail - admin can use manual setup if needed
          console.debug('🔐 Admin auto-setup skipped:', error)
        }
      }
    }

    performAdminSetup()
  }, [user])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const redirectUrl = getRedirectUrl()
    console.log('🔐 Sign up redirect URL:', redirectUrl)
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    })
    
    if (error) {
      console.error('🔐 Sign up error:', error)
    }
    return { error }
  }

  const signInWithGoogle = async () => {
    const redirectUrl = getRedirectUrl()
    regLogger.log('google_start', 'Initiating Google OAuth', {
      redirectUrl,
      currentUrl: window.location.href,
      timestamp: new Date().toISOString()
    })
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
      
      if (error) {
        regLogger.log('google_error', 'Google OAuth error', {
          message: error.message,
          status: error.status,
          fullError: error
        })
      } else {
        regLogger.log('google_initiated', 'Google OAuth initiated successfully', {
          data,
          redirectUrl,
          timestamp: new Date().toISOString()
        })
      }
      return { error }
    } catch (err) {
      regLogger.log('google_exception', 'Google OAuth exception', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      })
      return { error: err }
    }
  }

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = getRedirectUrl()
    console.log('🔐 Magic link redirect URL:', redirectUrl)
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser: true
      }
    })
    
    if (error) {
      console.error('🔐 Magic link error:', error)
    }
    return { error }
  }

  const signOut = async () => {
    // Supabase handles all session cleanup automatically
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    authStateId,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
