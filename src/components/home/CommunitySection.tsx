import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { UnifiedAuthModal } from "@/components/auth/UnifiedAuthModal";
import { Badge } from "@/components/ui/badge";
import { CheckCircleIcon, HeartIcon, UsersIcon, StarIcon } from "lucide-react";

export function CommunitySection() {
  const { user } = useAuth();
  
  return (
    <div className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/5 py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 space-y-4">
            <Badge variant="secondary" className="mb-4">
              <StarIcon className="w-3 h-3 mr-1" />
              Community
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Join Our Vibrant Stepping Community
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect with passionate steppers, share your journey, and be part of something special.
              Our community is where dancers become family.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-6 border">
              <HeartIcon className="w-8 h-8 text-red-500 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Share Your Passion</h3>
              <p className="text-muted-foreground mb-4">
                Connect with dancers who share your love for stepping. Exchange tips, celebrate wins, and grow together.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>Join dance circles and groups</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>Share videos and performances</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>Get feedback from pros</span>
                </li>
              </ul>
            </div>

            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-6 border">
              <UsersIcon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Exclusive Access</h3>
              <p className="text-muted-foreground mb-4">
                Unlock member-only benefits and stay ahead with exclusive content and early event access.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>Early bird ticket access</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>Member-only workshops</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>Special community events</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Call to Action */}
          {!user && (
            <div className="text-center space-y-6">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-8 border max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold mb-4">
                  Ready to Join the Movement?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Become part of our growing community and take your stepping journey to the next level.
                </p>
                
                <UnifiedAuthModal
                  trigger={
                    <Button size="lg" className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                      <UsersIcon className="w-5 h-5 mr-2" />
                      Join Community Now
                    </Button>
                  }
                  title="Welcome to the Community"
                  description="Create your account to join our vibrant stepping community"
                  defaultMode="signup"
                />
              </div>
            </div>
          )}
          
          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 text-center">
              <h3 className="font-bold text-2xl mb-1">10K+</h3>
              <p className="text-sm text-muted-foreground">Active Members</p>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 text-center">
              <h3 className="font-bold text-2xl mb-1">500+</h3>
              <p className="text-sm text-muted-foreground">Monthly Events</p>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 text-center">
              <h3 className="font-bold text-2xl mb-1">100+</h3>
              <p className="text-sm text-muted-foreground">Dance Groups</p>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 text-center">
              <h3 className="font-bold text-2xl mb-1">50+</h3>
              <p className="text-sm text-muted-foreground">Cities Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}