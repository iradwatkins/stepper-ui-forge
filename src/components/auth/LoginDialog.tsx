import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  MailIcon, 
  KeyIcon,
  Loader2Icon, 
  AlertCircleIcon, 
  CheckCircleIcon,
  LogInIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { setRememberMe } from '@/lib/auth/sessionConfig';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectPath?: string;
}

export const LoginDialog = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  redirectPath 
}: LoginDialogProps) => {
  const { signIn, signInWithGoogle, signInWithMagicLink, user } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [rememberMe, setRememberMeState] = useState(true); // Default to true for better UX

  // Handle successful authentication
  useEffect(() => {
    if (user && isOpen) {
      // User just authenticated
      handleAuthSuccess();
    }
  }, [user, isOpen]);

  const handleAuthSuccess = () => {
    onClose();
    
    // Check for checkout intent
    const checkoutIntent = localStorage.getItem('checkoutIntent');
    if (checkoutIntent === 'true') {
      localStorage.removeItem('checkoutIntent');
      if (onSuccess) {
        onSuccess();
      }
    } else if (redirectPath) {
      navigate(redirectPath);
    }
  };

  const handleError = (error: { message: string }) => {
    if (error.message.includes('Invalid login credentials')) {
      setError('Invalid email or password. Please check your credentials.');
    } else if (error.message.includes('Email not confirmed')) {
      setError('Please confirm your email address. Check your inbox.');
    } else {
      setError(error.message);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Set remember me preference for Google sign in too
      setRememberMe(rememberMe);
      
      const { error } = await signInWithGoogle();
      if (error) {
        handleError(error);
      } else {
        setMessage('Redirecting to Google...');
      }
    } catch (err) {
      setError('Failed to connect to Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        handleError(error);
      } else {
        setMessage('Check your email for the magic link!');
        toast.success('Magic link sent! Check your email inbox.');
      }
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Set remember me preference before signing in
      setRememberMe(rememberMe);
      
      const { error } = await signIn(email, password);
      if (error) {
        handleError(error);
      } else {
        toast.success('Welcome back!');
      }
    } catch (err) {
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[425px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Welcome Back</DialogTitle>
          <DialogDescription>
            Sign in to access your account and continue shopping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-4 h-4 mr-2"
            />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <MailIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          {isMagicLink ? (
            /* Magic Link Option */
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={handleMagicLink}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MailIcon className="mr-2 h-4 w-4" />
                    Send Magic Link
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => setIsMagicLink(false)}
              >
                Sign in with password instead
              </Button>
            </div>
          ) : (
            /* Password Option */
            <form onSubmit={handlePasswordAuth} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <KeyIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
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
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogInIcon className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => setIsMagicLink(true)}
              >
                Sign in with magic link instead
              </Button>
            </form>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert>
              <CheckCircleIcon className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Create Account Link */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              Don't have an account?{' '}
            </span>
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={() => {
                onClose();
                // You might want to open a register dialog here
              }}
            >
              Create one now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};