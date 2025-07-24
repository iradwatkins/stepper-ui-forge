import React from 'react';
import { HeroCarousel } from '@/components/hero/HeroCarousel';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedAuthModal } from '@/components/auth/UnifiedAuthModal';
import { Button } from '@/components/ui/button';
import { SparklesIcon, CalendarIcon, UsersIcon, TrendingUpIcon } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen">
      {/* Hero section with carousel */}
      <HeroCarousel />
      
      {/* Enhanced Authentication Section - Only show if not authenticated */}
      {!user && (
        <section className="relative py-24 overflow-hidden">
          {/* Background gradient animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 animate-gradient-shift" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              {/* Main heading with animation */}
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent animate-fade-in">
                  Start Your Journey Today
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-delay">
                  Join thousands of steppers who are already discovering amazing events, 
                  connecting with the community, and sharing their passion for dance.
                </p>
              </div>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="flex flex-col items-center space-y-2 p-6 rounded-lg bg-background/50 backdrop-blur-sm border animate-slide-up">
                  <CalendarIcon className="w-10 h-10 text-primary" />
                  <h3 className="font-semibold">Discover Events</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Find the best stepping events in your area
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-2 p-6 rounded-lg bg-background/50 backdrop-blur-sm border animate-slide-up animation-delay-100">
                  <UsersIcon className="w-10 h-10 text-purple-600" />
                  <h3 className="font-semibold">Join Community</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Connect with passionate steppers worldwide
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-2 p-6 rounded-lg bg-background/50 backdrop-blur-sm border animate-slide-up animation-delay-200">
                  <TrendingUpIcon className="w-10 h-10 text-pink-600" />
                  <h3 className="font-semibold">Grow Together</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Share experiences and elevate your skills
                  </p>
                </div>
              </div>
              
              {/* Call to action */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <UnifiedAuthModal
                  trigger={
                    <Button 
                      size="lg" 
                      className="group relative overflow-hidden bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {/* Animated background */}
                      <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                      
                      <SparklesIcon className="w-5 h-5 mr-2 relative z-10" />
                      <span className="relative z-10">Get Started Free</span>
                    </Button>
                  }
                  title="Welcome to Steppers Life"
                  description="Choose your preferred way to join our community"
                  defaultMode="signup"
                />
                
                <p className="text-sm text-muted-foreground">
                  Already have an account? 
                  <UnifiedAuthModal
                    trigger={
                      <Button variant="link" className="px-2">
                        Sign in here
                      </Button>
                    }
                    title="Welcome Back"
                    description="Sign in to your account"
                    defaultMode="signin"
                  />
                </p>
              </div>
              
              {/* Trust indicators */}
              <div className="flex flex-wrap justify-center gap-8 pt-8 opacity-60">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">10K+</span>
                  <span className="text-sm">Active Members</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">500+</span>
                  <span className="text-sm">Events Monthly</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">50+</span>
                  <span className="text-sm">Cities</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;