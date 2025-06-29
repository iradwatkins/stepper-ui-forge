import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { MailIcon, KeyIcon, ChromeIcon, Loader2Icon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react'

export const Auth = () => {
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('signin')

  const handleEmailAuth = async (isSignUp: boolean) => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password)

      if (error) {
        setError(error.message)
      } else if (isSignUp) {
        setMessage('Check your email for the confirmation link!')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      console.log('Attempting to send magic link to:', email)
      const { error } = await signInWithMagicLink(email)
      if (error) {
        console.error('Magic link error:', error)
        setError(error.message)
      } else {
        console.log('Magic link sent successfully')
        setMessage('Magic link sent! Check your email and click the link to sign in.')
      }
    } catch (err) {
      console.error('Magic link exception:', err)
      setError('Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-foreground">
            Welcome to Steppers
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200 dark:border-green-800">
              <CheckCircleIcon className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              {/* Google Authentication */}
              <Button
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

              {/* Magic Link Authentication */}
              <div className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="magic-email" className="text-foreground">Email for Magic Link</Label>
                  <Input
                    id="magic-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="border-border focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                  onClick={handleMagicLink}
                  disabled={loading || !email}
                >
                  {loading ? (
                    <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <MailIcon className="w-4 h-4 mr-2" />
                  )}
                  Send Magic Link
                </Button>
                
                {!email && (
                  <p className="text-xs text-muted-foreground text-center">
                    Enter your email to send a magic link
                  </p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or sign in with email
                  </span>
                </div>
              </div>

              {/* Email/Password Authentication */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="border-border focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="border-border focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                <Button
                  className="w-full button-primary"
                  onClick={() => handleEmailAuth(false)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <KeyIcon className="w-4 h-4 mr-2" />
                  )}
                  Sign In with Email
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              {/* Google Authentication */}
              <Button
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

              {/* Magic Link Authentication */}
              <div className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-magic-email" className="text-foreground">Email for Magic Link</Label>
                  <Input
                    id="signup-magic-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="border-border focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                  onClick={handleMagicLink}
                  disabled={loading || !email}
                >
                  {loading ? (
                    <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <MailIcon className="w-4 h-4 mr-2" />
                  )}
                  Send Magic Link
                </Button>
                
                {!email && (
                  <p className="text-xs text-muted-foreground text-center">
                    Enter your email to send a magic link
                  </p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or sign up with email
                  </span>
                </div>
              </div>

              {/* Email/Password Authentication */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="border-border focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-foreground">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="border-border focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                <Button
                  className="w-full button-primary"
                  onClick={() => handleEmailAuth(true)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <KeyIcon className="w-4 h-4 mr-2" />
                  )}
                  Sign Up with Email
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
