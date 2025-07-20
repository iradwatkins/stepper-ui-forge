import { useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth';
import { Loader2 } from 'lucide-react';

interface StablePaymentWrapperProps {
  children: ReactNode;
  minStabilityDelay?: number;
}

export function StablePaymentWrapper({ 
  children, 
  minStabilityDelay = 500 
}: StablePaymentWrapperProps) {
  const { user, loading } = useAuth();
  const [isStable, setIsStable] = useState(false);
  const [authStateId, setAuthStateId] = useState(0);
  
  useEffect(() => {
    console.log('[StablePaymentWrapper] Auth state change:', {
      loading,
      hasUser: !!user,
      userId: user?.id,
      authStateId
    });
    
    if (!loading && user) {
      // Increment auth state counter
      setAuthStateId(prev => prev + 1);
      
      // Wait for auth to fully settle
      const timer = setTimeout(() => {
        console.log('[StablePaymentWrapper] Auth stabilized, mounting payment components');
        setIsStable(true);
      }, minStabilityDelay);
      
      return () => clearTimeout(timer);
    } else {
      setIsStable(false);
    }
  }, [loading, user?.id, minStabilityDelay]); // Only re-run if user ID actually changes
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading authentication...</span>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Please sign in to use payments</p>
      </div>
    );
  }
  
  if (!isStable) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Initializing payment system...</span>
      </div>
    );
  }
  
  // Only render payment components after auth is stable
  return <>{children}</>;
}