
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { setupInitialAdmin } from '@/lib/admin/setupAdmin'

// Helper function to get the correct redirect URL for different environments
const getRedirectUrl = (isAdmin?: boolean): string => {
  const origin = window.location.origin
  const isDev = origin.includes('localhost') || origin.includes('127.0.0.1')
  const isLovable = origin.includes('lovable.app') || origin.includes('lovable.dev')
  
  console.log('🔐 Current origin:', origin, { isDev, isLovable, isAdmin })
  
  // For development and Lovable preview environments, use appropriate dashboard
  if (isDev || isLovable) {
    return isAdmin ? `${origin}/dashboard` : `${origin}/account`
  }
  
  // For production or custom domains, also use appropriate dashboard
  return isAdmin ? `${origin}/dashboard` : `${origin}/account`
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event, session ? 'logged in' : 'logged out')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Auto-setup admin for designated admin email
  useEffect(() => {
    const performAdminSetup = async () => {
      if (user && user.email === 'iradwatkins@gmail.com') {
        console.log('🔐 Auto-setting up admin for:', user.email)
        try {
          const result = await setupInitialAdmin()
          console.log('🔐 Admin setup result:', result)
        } catch (error) {
          console.error('🔐 Admin setup failed:', error)
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
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    })
    
    if (error) {
      console.error('🔐 Google sign in error:', error)
    }
    return { error }
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
    signIn,
    signUp,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
