
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, ShoppingBag } from "lucide-react";
import { useTheme } from "next-themes";
import DayNightSwitch from "@/components/ui/DayNightSwitch";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { UserProfile } from "@/components/auth/UserProfile";
import { CartDrawer } from "@/components/cart";
import PWAInstallButton from "@/components/PWAInstallButton";
import MobileMenu from "@/components/MobileMenu";

const Navbar = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const { user } = useAuth();
  const { totalItems, isCartOpen, setIsCartOpen } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const handleThemeToggle = (isDay: boolean) => {
    setTheme(isDay ? "light" : "dark");
  };

  // Use resolvedTheme to get the actual theme (system theme resolved)
  const isLightMode = resolvedTheme === "light";

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 sm:h-16">
        {/* Mobile Layout */}
        <div className="md:hidden flex items-center justify-between h-full">
          {/* Left: Mobile Menu */}
          <MobileMenu 
            isOpen={isMobileMenuOpen} 
            onOpenChange={setIsMobileMenuOpen} 
          />
          
          {/* Center: Logo */}
          <Link to="/" className="absolute left-1/2 transform -translate-x-1/2">
            <img 
              src="/lovable-uploads/2e635021-dedb-40f2-9817-c404d5bd828d.png" 
              alt="Steppers Life Logo" 
              className="h-8 w-auto object-contain dark:hidden"
            />
            <img 
              src="/lovable-uploads/6bcc30f5-9623-4562-a26a-1c4b50f3028b.png" 
              alt="Steppers Life Logo" 
              className="h-8 w-auto object-contain hidden dark:block"
            />
          </Link>
          
          {/* Right: Cart + User */}
          <div className="flex items-center gap-2">
            {/* Cart Icon */}
            <Button
              variant="ghost"
              size="sm"
              className="relative h-8 w-8 p-0 touch-manipulation"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag className="h-4 w-4" />
              {totalItems > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs"
                >
                  {totalItems > 99 ? '99+' : totalItems}
                </Badge>
              )}
              <span className="sr-only">Shopping cart</span>
            </Button>
            
            <UserProfile />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between h-full">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/2e635021-dedb-40f2-9817-c404d5bd828d.png" 
              alt="Steppers Life Logo" 
              className="h-10 w-auto object-contain dark:hidden"
            />
            <img 
              src="/lovable-uploads/6bcc30f5-9623-4562-a26a-1c4b50f3028b.png" 
              alt="Steppers Life Logo" 
              className="h-10 w-auto object-contain hidden dark:block"
            />
          </Link>
          
          {/* Right: Full Navigation */}
          <div className="flex items-center gap-3">
            <Link to="/events">
              <Button 
                variant={location.pathname === "/events" ? "default" : "ghost"}
                className="font-medium text-sm px-3 h-9"
              >
                Events
              </Button>
            </Link>

            <Link to="/magazine">
              <Button 
                variant={location.pathname === "/magazine" ? "default" : "ghost"}
                className="font-medium text-sm px-3 h-9"
              >
                Magazine
              </Button>
            </Link>

            <Link to="/classes">
              <Button 
                variant={location.pathname === "/classes" ? "default" : "ghost"}
                className="font-medium text-sm px-3 h-9"
              >
                Classes
              </Button>
            </Link>

            <Link to="/community">
              <Button 
                variant={location.pathname === "/community" ? "default" : "ghost"}
                className="font-medium text-sm px-3 h-9"
              >
                Community
              </Button>
            </Link>
            
            {user && (
              <Link to="/create-event">
                <Button variant="outline" size="sm" className="text-sm px-3 h-9">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </Link>
            )}
            
            {/* PWA Install Button */}
            <PWAInstallButton 
              variant="ghost" 
              size="sm" 
              showText={false}
              className="h-9 w-9 p-0"
            />

            <DayNightSwitch
              checked={isLightMode}
              onToggle={handleThemeToggle}
              className="h-9 w-20"
            />

            {/* Cart Icon */}
            <Button
              variant="ghost"
              size="sm"
              className="relative h-9 w-9 p-0 touch-manipulation"
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
      </div>

      {/* Cart Drawer */}
      <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </nav>
  );
};

export default Navbar;
