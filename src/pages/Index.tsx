import React from 'react';
import { HeroCarousel } from '@/components/hero/HeroCarousel';
import { AuthButton } from '@/components/auth/AuthButton';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero section with carousel */}
      <HeroCarousel />
      
      {/* Single authentication section - only show if not authenticated */}
      {!user && (
        <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Join Steppers Life Today
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect with the stepping community, discover events, and share your passion for dance.
            </p>
            <AuthButton 
              size="lg" 
              className="bg-primary hover:bg-blue-600 px-8 py-3 text-lg font-semibold"
              mode="unified"
            >
              Sign In / Register
            </AuthButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;