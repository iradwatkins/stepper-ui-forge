import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function SquareOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    handleSquareOAuthCallback();
  }, [searchParams]);

  const handleSquareOAuthCallback = async () => {
    try {
      // Get OAuth parameters from URL
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth errors
      if (error) {
        setStatus('error');
        setMessage(errorDescription || 'Square OAuth authorization failed');
        return;
      }

      // Validate required parameters
      if (!code || !state) {
        setStatus('error');
        setMessage('Missing required OAuth parameters');
        return;
      }

      // Validate user is authenticated
      if (!user) {
        setStatus('error');
        setMessage('You must be logged in to connect Square');
        return;
      }

      // Exchange authorization code for access token via Supabase Edge Function
      const { data, error: exchangeError } = await supabase.functions.invoke('square-oauth-exchange', {
        body: {
          code,
          state,
          userId: user.id,
        },
      });

      if (exchangeError || !data?.success) {
        setStatus('error');
        setMessage(data?.error || 'Failed to exchange authorization code');
        return;
      }

      // Success
      setStatus('success');
      setMessage('Square account connected successfully!');

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/dashboard/payment-management');
      }, 2000);
    } catch (err) {
      console.error('Square OAuth callback error:', err);
      setStatus('error');
      setMessage('An unexpected error occurred');
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-8 h-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-destructive" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'processing':
        return 'Connecting Square Account...';
      case 'success':
        return 'Square Connected Successfully!';
      case 'error':
        return 'Connection Failed';
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>
            {status === 'processing' && 'Please wait while we connect your Square account...'}
            {status === 'success' && 'Your Square account has been connected to Steppers Life'}
            {status === 'error' && 'We encountered an issue connecting your Square account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={status === 'error' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/payment-management')}
              >
                Back to Dashboard
              </Button>
              <Button
                onClick={() => window.location.href = '/dashboard/payment-management?connect=square'}
              >
                Try Again
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center text-sm text-muted-foreground">
              Redirecting to your dashboard...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}