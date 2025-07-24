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
  UserPlusIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
// Removed sessionConfig import - Remember Me is now just a UI preference

interface RegisterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectPath?: string;
}

export const RegisterDialog = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  redirectPath 
}: RegisterDialogProps) => {
  const { signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
    if (error.message.includes('User already registered')) {
      setError('Account already exists. Try signing in instead.');
    } else if (error.message.includes('Password should be')) {
      setError('Password must be at least 6 characters long.');
    } else {
      setError(error.message);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Remember Me is now just a UI preference - sessions last 7 days by default
      
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Remember Me is now just a UI preference - sessions last 7 days by default
      
      const { error } = await signUp(email, password);
      if (error) {
        handleError(error);
      } else {
        setMessage('Registration successful! Please check your email to confirm your account.');
        toast.success('Account created! Check your email to confirm.');
      }
    } catch (err) {
      setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[425px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Your Account</DialogTitle>
          <DialogDescription>
            Join Steppers Life to discover and create amazing events
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Google Sign Up */}
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
                Or register with email
              </span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSignUp} className="space-y-3">
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
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>
          </form>

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

          {/* Sign In Link */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{' '}
            </span>
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={() => {
                onClose();
                // You might want to open a login dialog here
              }}
            >
              Sign in
            </Button>
          </div>

          {/* Terms Notice */}
          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};