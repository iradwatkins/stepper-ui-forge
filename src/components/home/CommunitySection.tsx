import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function CommunitySection() {
  const { user } = useAuth();
  
  return (
    <div className="bg-primary/10 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Join Our Stepping Community</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Connect with fellow dancers, share your passion, access exclusive content, 
            and stay updated on the latest stepping events and trends.
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="bg-primary hover:bg-blue-600">
                <Link to="/account">Create Account</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/account">Sign In</Link>
              </Button>
            </div>
          )}
          
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <div className="bg-background rounded-lg p-4 shadow-sm w-full sm:w-auto">
              <h3 className="font-semibold text-xl mb-1">500+</h3>
              <p className="text-sm text-muted-foreground">Active Members</p>
            </div>
            <div className="bg-background rounded-lg p-4 shadow-sm w-full sm:w-auto">
              <h3 className="font-semibold text-xl mb-1">200+</h3>
              <p className="text-sm text-muted-foreground">Events Listed</p>
            </div>
            <div className="bg-background rounded-lg p-4 shadow-sm w-full sm:w-auto">
              <h3 className="font-semibold text-xl mb-1">50+</h3>
              <p className="text-sm text-muted-foreground">Dance Classes</p>
            </div>
            <div className="bg-background rounded-lg p-4 shadow-sm w-full sm:w-auto">
              <h3 className="font-semibold text-xl mb-1">20+</h3>
              <p className="text-sm text-muted-foreground">Community Members</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}