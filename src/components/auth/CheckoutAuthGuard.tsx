import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, LogIn } from "lucide-react";
import { UnifiedAuthModal } from "./UnifiedAuthModal";
import { useState } from "react";

interface CheckoutAuthGuardProps {
  itemCount: number;
  totalAmount: number;
  onAuthenticated?: () => void;
}

export function CheckoutAuthGuard({ itemCount, totalAmount, onAuthenticated }: CheckoutAuthGuardProps) {
  const [showAuth, setShowAuth] = useState(false);

  const handleAuthSuccess = () => {
    // Store checkout intent for post-login redirect
    localStorage.setItem('checkoutIntent', 'true');
    
    // Close modal
    setShowAuth(false);
    
    // Notify parent component
    if (onAuthenticated) {
      onAuthenticated();
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShoppingCart className="w-12 h-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Login to Complete Purchase</CardTitle>
          <CardDescription className="text-lg">
            You have {itemCount} {itemCount === 1 ? 'item' : 'items'} ready for checkout
            (${totalAmount.toFixed(2)})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Please sign in or create an account to complete your ticket purchase. 
            Your cart items will be saved.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => setShowAuth(true)}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In or Register to Continue
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>

      <UnifiedAuthModal 
        title="Complete Your Purchase"
        description="Sign in or create an account to continue with checkout"
        mode="modal"
        onSuccess={handleAuthSuccess}
        redirectPath="/checkout"
        isOpen={showAuth}
        onOpenChange={setShowAuth}
      />
    </>
  );
}