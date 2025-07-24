import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function HeroHeader() {
  const { user } = useAuth();

  // Only show Dashboard button for authenticated users
  // Remove duplicate "Login / Register" button - navbar handles authentication
  if (!user) return null;

  return (
    <div className="absolute top-4 sm:top-8 right-4 sm:right-6 z-20">
      <Link to="/dashboard">
        <Button className="bg-[#02a2c8] hover:bg-[#02a2c8]/90 text-white text-xs sm:text-sm py-1.5 px-4 sm:py-2 sm:px-6">
          Dashboard
        </Button>
      </Link>
    </div>
  );
}