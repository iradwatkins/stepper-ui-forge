import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Menu, PlusIcon, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import DayNightSwitch from "@/components/ui/DayNightSwitch";
import PWAInstallButton from "@/components/PWAInstallButton";

interface MobileMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileMenu = ({ isOpen, onOpenChange }: MobileMenuProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleThemeToggle = (isDay: boolean) => {
    setTheme(isDay ? "light" : "dark");
  };

  const handleLinkClick = () => {
    onOpenChange(false);
  };

  const isActiveRoute = (path: string) => location.pathname === path;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden h-8 w-8 p-0"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full">
          {/* Navigation Links */}
          <nav className="flex-1 px-6 py-4">
            <div className="space-y-2">
              <Link to="/events" onClick={handleLinkClick}>
                <Button 
                  variant={isActiveRoute("/events") ? "default" : "ghost"}
                  className="w-full justify-start text-left font-medium"
                >
                  Events
                </Button>
              </Link>

              <Link to="/magazine" onClick={handleLinkClick}>
                <Button 
                  variant={isActiveRoute("/magazine") ? "default" : "ghost"}
                  className="w-full justify-start text-left font-medium"
                >
                  Magazine
                </Button>
              </Link>

              <Link to="/classes" onClick={handleLinkClick}>
                <Button 
                  variant={isActiveRoute("/classes") ? "default" : "ghost"}
                  className="w-full justify-start text-left font-medium"
                >
                  Classes
                </Button>
              </Link>

              <Link to="/community" onClick={handleLinkClick}>
                <Button 
                  variant={isActiveRoute("/community") ? "default" : "ghost"}
                  className="w-full justify-start text-left font-medium"
                >
                  Community
                </Button>
              </Link>

              {user && (
                <Link to="/create-event" onClick={handleLinkClick}>
                  <Button 
                    variant={isActiveRoute("/create-event") ? "default" : "outline"}
                    className="w-full justify-start text-left font-medium"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Event
                  </Button>
                </Link>
              )}
            </div>
          </nav>

          {/* Bottom Section with Theme Toggle and PWA */}
          <div className="px-6 py-4 border-t mt-auto">
            <div className="space-y-4">
              <Separator />
              
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Theme</span>
                <DayNightSwitch
                  checked={theme !== "dark"}
                  onToggle={handleThemeToggle}
                  className="h-8 w-16"
                />
              </div>

              {/* PWA Install */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Install App</span>
                <PWAInstallButton 
                  variant="ghost" 
                  size="sm" 
                  showText={false}
                  className="h-8 w-8 p-0"
                />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;