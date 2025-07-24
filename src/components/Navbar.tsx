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
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const { user } = useAuth();
  const { totalItems, isCartOpen, setIsCartOpen } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const handleThemeToggle = (isDay: boolean) => {
    setTheme(isDay ? "light" : "dark");
  };

  const isActiveRoute = (path: string) => location.pathname === path;

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      {/* Safe area support for devices with notches/dynamic islands */}
      <div 
        className="w-full" 
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="container mx-auto px-4">
          
          {/* ULTRA-NARROW MOBILE: 360px-374px (Galaxy S24, older Android) */}
          <div className="flex items-center justify-between h-14 sm:hidden">
            {/* Left: Mobile Menu */}
            <MobileMenu 
              isOpen={isMobileMenuOpen} 
              onOpenChange={setIsMobileMenuOpen} 
            />
            
            {/* Center: Compact Logo */}
            <Link to="/" className="flex items-center">
              <img 
                src="/lovable-uploads/2e635021-dedb-40f2-9817-c404d5bd828d.png" 
                alt="Steppers Life Logo" 
                className="h-6 w-auto object-contain dark:hidden"
              />
              <img 
                src="/lovable-uploads/6bcc30f5-9623-4562-a26a-1c4b50f3028b.png" 
                alt="Steppers Life Logo" 
                className="h-6 w-auto object-contain hidden dark:block"
              />
            </Link>
            
            {/* Right: Minimal Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="relative h-8 w-8 p-0 touch-manipulation"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                {totalItems > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center p-0 text-xs scale-75"
                  >
                    {totalItems > 9 ? '9+' : totalItems}
                  </Badge>
                )}
                <span className="sr-only">Shopping cart</span>
              </Button>
              
              <UserProfile />
            </div>
          </div>

          {/* STANDARD MOBILE: 375px-767px (Most phones) */}
          <div className="hidden sm:flex lg:hidden items-center justify-between h-16">
            {/* Left: Mobile Menu */}
            <MobileMenu 
              isOpen={isMobileMenuOpen} 
              onOpenChange={setIsMobileMenuOpen} 
            />
            
            {/* Center: Standard Logo */}
            <Link to="/" className="flex items-center">
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
            
            {/* Right: Standard Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="relative h-10 w-10 p-0 touch-manipulation"
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

          {/* TABLET/FOLDABLES: 768px-1023px (Folds open, tablets) */}
          <div className="hidden lg:hidden md:flex items-center justify-between h-16">
            {/* Left: Logo with crease offset */}
            <Link to="/" className="flex items-center ml-4">
              <img 
                src="/lovable-uploads/2e635021-dedb-40f2-9817-c404d5bd828d.png" 
                alt="Steppers Life Logo" 
                className="h-9 w-auto object-contain dark:hidden"
              />
              <img 
                src="/lovable-uploads/6bcc30f5-9623-4562-a26a-1c4b50f3028b.png" 
                alt="Steppers Life Logo" 
                className="h-9 w-auto object-contain hidden dark:block"
              />
            </Link>
            
            {/* Center: Core Navigation */}
            <div className="flex items-center gap-2">
              <Link to="/events">
                <Button 
                  variant={isActiveRoute("/events") ? "default" : "ghost"}
                  size="sm"
                  className="font-medium text-sm px-3 h-9"
                >
                  Events
                </Button>
              </Link>

              <Link to="/magazine">
                <Button 
                  variant={isActiveRoute("/magazine") ? "default" : "ghost"}
                  size="sm"
                  className="font-medium text-sm px-3 h-9"
                >
                  Magazine
                </Button>
              </Link>

              <Link to="/classes">
                <Button 
                  variant={isActiveRoute("/classes") ? "default" : "ghost"}
                  size="sm"
                  className="font-medium text-sm px-3 h-9"
                >
                  Classes
                </Button>
              </Link>

              <Link to="/community">
                <Button 
                  variant={isActiveRoute("/community") ? "default" : "ghost"}
                  size="sm"
                  className="font-medium text-sm px-3 h-9"
                >
                  Community
                </Button>
              </Link>
            </div>
            
            {/* Right: Actions optimized for two-hand use */}
            <div className="flex items-center gap-2 mr-4">
              <DayNightSwitch
                checked={theme !== "dark"}
                onToggle={handleThemeToggle}
                className="h-9 w-16"
              />

              <Button
                variant="ghost"
                size="sm"
                className="relative h-12 w-12 p-0 touch-manipulation"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingBag className="h-5 w-5" />
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

          {/* DESKTOP: 1024px+ (Full desktop experience) */}
          <div className="hidden lg:flex items-center justify-between h-16">
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
            <div className="flex items-center gap-4">
              <Link to="/events">
                <Button 
                  variant={isActiveRoute("/events") ? "default" : "ghost"}
                  className="font-medium text-sm px-4 h-10"
                >
                  Events
                </Button>
              </Link>

              <Link to="/magazine">
                <Button 
                  variant={isActiveRoute("/magazine") ? "default" : "ghost"}
                  className="font-medium text-sm px-4 h-10"
                >
                  Magazine
                </Button>
              </Link>

              <Link to="/classes">
                <Button 
                  variant={isActiveRoute("/classes") ? "default" : "ghost"}
                  className="font-medium text-sm px-4 h-10"
                >
                  Classes
                </Button>
              </Link>

              <Link to="/community">
                <Button 
                  variant={isActiveRoute("/community") ? "default" : "ghost"}
                  className="font-medium text-sm px-4 h-10"
                >
                  Community
                </Button>
              </Link>
              
              {user && (
                <Link to="/create-event">
                  <Button variant="outline" size="sm" className="text-sm px-4 h-10">
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
                className="h-10 w-10 p-0"
              />

              <DayNightSwitch
                checked={theme !== "dark"}
                onToggle={handleThemeToggle}
                className="h-10 w-20"
              />

              {/* Cart Icon */}
              <Button
                variant="ghost"
                size="sm"
                className="relative h-10 w-10 p-0 touch-manipulation"
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
      </div>

      {/* Cart Drawer */}
      <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </nav>
  );
};

export default Navbar;