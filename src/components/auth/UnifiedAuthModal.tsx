import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  MailIcon, 
  ChevronDownIcon,
  ChevronUpIcon,
  KeyIcon,
  Loader2Icon, 
  AlertCircleIcon, 
  CheckCircleIcon,
  LogInIcon
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
// Removed sessionConfig import - Remember Me is now just a UI preference

interface UnifiedAuthModalProps {
  trigger?: React.ReactNode
  title?: string
  description?: string
  defaultMode?: 'signin' | 'signup'
  mode?: 'modal' | 'page'
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  redirectPath?: string
}

export const UnifiedAuthModal = ({ 
  trigger, 
  title = "Sign In / Register",
  description = "Choose your preferred sign-in method",
  defaultMode = 'signin',
  mode = 'modal',
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess,
  redirectPath
}: UnifiedAuthModalProps) => {
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink } = useAuth()
  
  // State management
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = externalIsOpen ?? internalIsOpen
  const setIsOpen = externalOnOpenChange ?? setInternalIsOpen
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(defaultMode)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [rememberMe, setRememberMeState] = useState(true) // Default to true for better UX

  // Focus management
  const googleButtonRef = useRef<HTMLButtonElement>(null)

  // Reset form when modal opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      // Reset state when opening
      setEmail('')
      setPassword('')
      setError(null)
      setMessage(null)
      setIsAdvancedOpen(false)
      setAuthMode('signin')
      
      // Focus first interactive element
      setTimeout(() => {
        googleButtonRef.current?.focus()
      }, 100)
    }
  }

  // Error handling
  const handleError = (error: { message: string }) => {
    if (error.message.includes('Invalid login credentials')) {
      setError('Invalid email or password. Please check your credentials.')
    } else if (error.message.includes('Email not confirmed')) {
      setError('Please confirm your email address. Check your inbox.')
    } else if (error.message.includes('User already registered')) {
      setError('Account already exists. Try signing in instead.')
      setAuthMode('signin')
    } else if (error.message.includes('Database error')) {
      setError('Registration temporarily unavailable. Please try again.')
    } else {
      setError(error.message)
    }
  }

  // Google OAuth handler
  const handleGoogleAuth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Remember Me is now just a UI preference - sessions last 7 days by default
      
      const { error } = await signInWithGoogle()
      if (error) {
        handleError(error)
      } else {
        setMessage('Redirecting to Google...')
        // Modal will close when auth context updates
      }
    } catch (err) {
      setError('Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Magic Link handler
  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const { error } = await signInWithMagicLink(email)
      if (error) {
        handleError(error)
      } else {
        setMessage('Magic link sent! Check your email and click the link to sign in.')
      }
    } catch (err) {
      setError('Failed to send magic link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Email/Password handler
  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    if (authMode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // Remember Me is now just a UI preference - sessions last 7 days by default
      
      const { error } = authMode === 'signup' 
        ? await signUp(email, password)
        : await signIn(email, password)
        
      if (error) {
        handleError(error)
      } else if (authMode === 'signup') {
        setMessage('Account created! Check your email to confirm your account.')
      } else {
        setMessage('Welcome back! Redirecting...')
        setIsOpen(false)
        onSuccess?.()
      }
    } catch (err) {
      setError('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Default trigger if none provided
  const defaultTrigger = (
    <Button variant="default" size="sm">
      <LogInIcon className="w-4 h-4 mr-2" />
      Sign In / Register
    </Button>
  )

  // Render auth content (shared between modal and page modes)
  const renderAuthContent = () => (
    <div className="space-y-4">
      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircleIcon className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Primary: Google OAuth */}
      <Button
        ref={googleButtonRef}
        variant="outline"
        className="w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
        onClick={handleGoogleAuth}
        disabled={loading}
      >
        {loading ? (
          <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Continue with Google
      </Button>

      <Separator className="my-4" />

      {/* Secondary: Magic Link */}
      <div className="space-y-3">
        <Label htmlFor="magic-email" className="text-sm font-medium">
          Email Address
        </Label>
        <div className="flex space-x-2">
          <Input
            id="magic-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleMagicLink()}
          />
          <Button
            variant="outline"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
            onClick={handleMagicLink}
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <Loader2Icon className="w-4 h-4 animate-spin" />
            ) : (
              <MailIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          We'll send you a secure link to sign in instantly
        </p>
      </div>

      {/* Tertiary: Email/Password (Collapsible) */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between text-sm text-muted-foreground hover:text-foreground"
          >
            More sign-in options
            {isAdvancedOpen ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 pt-3">
          <Separator />
          
          {/* Mode Toggle */}
          <div className="flex justify-center space-x-1 bg-muted rounded-md p-1">
            <button
              type="button"
              className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                authMode === 'signin' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setAuthMode('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                authMode === 'signup' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setAuthMode('signup')}
            >
              Register
            </button>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={authMode === 'signup' ? 'Create a password (min. 6 characters)' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMeState(checked as boolean)}
            />
            <Label
              htmlFor="remember-me"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Remember me for 7 days
            </Label>
          </div>

          <Button
            className="w-full"
            onClick={handleEmailAuth}
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? (
              <>
                <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                {authMode === 'signup' ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              <>
                <KeyIcon className="w-4 h-4 mr-2" />
                {authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </>
            )}
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )

  // Page mode rendering
  if (mode === 'page') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-6 space-y-4">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
            {renderAuthContent()}
          </div>
        </div>
      </div>
    )
  }

  // Modal mode rendering
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md" aria-describedby="auth-description">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <VisuallyHidden>
            <div id="auth-description">{description}</div>
          </VisuallyHidden>
        </DialogHeader>

        {renderAuthContent()}

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}