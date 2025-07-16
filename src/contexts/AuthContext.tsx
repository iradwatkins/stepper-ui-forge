
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { setupInitialAdmin } from '@/lib/admin/setupAdmin'
import { toast } from '@/components/ui/sonner'

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
    console.log('🔐 AuthContext: Initializing authentication')
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 AuthContext: Initial session retrieved:', session ? 'User logged in' : 'No session')
      if (session) {
        console.log('🔐 AuthContext: Initial user:', session.user.email)
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      setAuthStateId(prev => prev + 1)
      console.log('🔐 AuthContext: Initial state set, loading=false')
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 AuthContext: Auth state change event:', event)
      console.log('🔐 AuthContext: Session:', session ? 'logged in' : 'logged out')
      if (session) {
        console.log('🔐 AuthContext: User email:', session.user.email)
      }
      
      // Add a small delay to ensure state consistency
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      console.log('🔐 AuthContext: State updated after', event)
      console.log('🔐 AuthContext: User state:', session?.user ? 'USER_SET' : 'USER_NULL')
      
      // Show success notification for sign-in events
      if (event === 'SIGNED_IN' && session?.user) {
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
        
        console.log('🔐 AuthContext: Login success notification shown')
      }
      
      // Force a re-render by updating the counter
      setAuthStateId(prev => prev + 1)
      console.log('🔐 AuthContext: Auth state ID incremented to force re-render')
      
      // Additional delay to ensure all components receive the update
      setTimeout(() => {
        console.log('🔐 AuthContext: Auth state should be propagated now')
      }, 50)
    })

    return () => {
      console.log('🔐 AuthContext: Cleaning up subscription')
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
    console.log('🔐 Google sign in redirect URL:', redirectUrl)
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      })
      
      if (error) {
        console.error('🔐 Google sign in error:', error)
        console.error('🔐 Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText
        })
      } else {
        console.log('🔐 Google OAuth initiated successfully')
      }
      return { error }
    } catch (err) {
      console.error('🔐 Google sign in exception:', err)
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
