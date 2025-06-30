
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoonIcon, SunIcon, PlusIcon, ShoppingBag } from "lucide-react";
import { useTheme } from "next-themes";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { UserProfile } from "@/components/auth/UserProfile";
import { CartDrawer } from "@/components/cart";

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const { user } = useAuth();
  const { totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/" className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">
          Stepperslife
        </Link>
        
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          <Link to="/events">
            <Button 
              variant={location.pathname === "/events" ? "default" : "ghost"}
              className="font-medium text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
            >
              Events
            </Button>
          </Link>
          
          {user && (
            <>
              <Link to="/dashboard" className="hidden sm:block">
                <Button 
                  variant={location.pathname.startsWith("/dashboard") ? "default" : "ghost"}
                  className="font-medium text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                >
                  Dashboard
                </Button>
              </Link>
              <Link to="/create-event" className="hidden md:block">
                <Button variant="outline" size="sm" className="text-xs px-2 h-8">
                  <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Create Event</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </Link>
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <SunIcon className="h-3 w-3 sm:h-4 sm:w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-3 w-3 sm:h-4 sm:w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Cart Icon */}
          <Button
            variant="ghost"
            size="sm"
            className="relative h-8 w-8 sm:h-9 sm:w-9 p-0 touch-manipulation"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
            {totalItems > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs"
              >
                {totalItems > 99 ? '99+' : totalItems}
              </Badge>
            )}
            <span className="sr-only">Shopping cart</span>
          </Button>
          
          <UserProfile />
        </div>
      </div>

      {/* Cart Drawer */}
      <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </nav>
  );
};

export default Navbar;
