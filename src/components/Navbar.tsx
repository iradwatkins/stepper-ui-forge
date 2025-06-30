
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
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-foreground">
          Stepperslife
        </Link>
        
        <div className="flex items-center gap-4">
          <Link to="/events">
            <Button 
              variant={location.pathname === "/events" ? "default" : "ghost"}
              className="font-medium"
            >
              Events
            </Button>
          </Link>
          
          {user && (
            <>
              <Link to="/dashboard">
                <Button 
                  variant={location.pathname.startsWith("/dashboard") ? "default" : "ghost"}
                  className="font-medium"
                >
                  Dashboard
                </Button>
              </Link>
              <Link to="/create-event">
                <Button variant="outline" size="sm">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </Link>
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Cart Icon */}
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag className="h-4 w-4" />
            {totalItems > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
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
