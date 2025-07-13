import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function HeroHeader() {
  const { user } = useAuth();

  const getButtonDestination = () => {
    if (!user) return "/account";
    return "/dashboard";
  };

  const buttonText = user ? "Dashboard" : "Login / Register";

  return (
    <div className="absolute top-4 sm:top-8 right-4 sm:right-6 z-20">
      <Link to={getButtonDestination()}>
        <Button className="bg-[#02a2c8] hover:bg-[#02a2c8]/90 text-white text-xs sm:text-sm py-1.5 px-4 sm:py-2 sm:px-6">
          {buttonText}
        </Button>
      </Link>
    </div>
  );
}