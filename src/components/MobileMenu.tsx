import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Menu, PlusIcon, Download, UserIcon, LogOutIcon, LayoutDashboardIcon, TicketIcon, SettingsIcon, LogInIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import DayNightSwitch from "@/components/ui/DayNightSwitch";
import PWAInstallButton from "@/components/PWAInstallButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthButton } from "@/components/auth/AuthButton";
import { AvatarService } from "@/lib/avatars";
import { useState, useEffect } from "react";
import { ProfileService } from "@/lib/profiles";
import { Database } from "@/types/database";

type Profile = Database['public']['Tables']['profiles']['Row'];

interface MobileMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileMenu = ({ isOpen, onOpenChange }: MobileMenuProps) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const profileData = await ProfileService.getProfile(user.id);
          setProfile(profileData);
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    };
    loadProfile();
  }, [user]);

  const handleThemeToggle = (isDay: boolean) => {
    setTheme(isDay ? "light" : "dark");
  };

  // Use resolvedTheme to get the actual theme (system theme resolved)
  const isLightMode = resolvedTheme === "light";

  const handleLinkClick = () => {
    onOpenChange(false);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      onOpenChange(false);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Get user avatar and initials
  const userAvatarUrl = user ? AvatarService.getAvatarUrl(user, profile) : '';
  const userInitials = user ? AvatarService.getInitials(user, profile) : '';

  const isActiveRoute = (path: string) => location.pathname === path;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        {/* User Profile Section */}
        {user ? (
          <div className="px-6 py-4 border-b bg-muted/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={userAvatarUrl} alt={user.email || ''} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.user_metadata?.full_name || profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to="/dashboard/profile" onClick={handleLinkClick} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <UserIcon className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Link to="/dashboard" onClick={handleLinkClick} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <LayoutDashboardIcon className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 border-b">
            <AuthButton variant="default" className="w-full" mode="unified">
              <LogInIcon className="w-4 h-4 mr-2" />
              Sign In / Register
            </AuthButton>
          </div>
        )}
        
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
                <>
                  <Separator className="my-2" />
                  
                  <Link to="/my-tickets" onClick={handleLinkClick}>
                    <Button 
                      variant={isActiveRoute("/my-tickets") ? "default" : "ghost"}
                      className="w-full justify-start text-left font-medium"
                    >
                      <TicketIcon className="w-4 h-4 mr-2" />
                      My Tickets
                    </Button>
                  </Link>
                  
                  <Link to="/create-event" onClick={handleLinkClick}>
                    <Button 
                      variant={isActiveRoute("/create-event") ? "default" : "outline"}
                      className="w-full justify-start text-left font-medium"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Create Event
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Bottom Section with Settings and Sign Out */}
          <div className="px-6 py-4 border-t mt-auto">
            <div className="space-y-2">
              {user && (
                <>
                  <Link to="/dashboard/settings" onClick={handleLinkClick}>
                    <Button 
                      variant="ghost"
                      className="w-full justify-start text-left font-medium"
                    >
                      <SettingsIcon className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                  
                  <Separator className="my-2" />
                </>
              )}
              
              {/* Theme Toggle */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium">Theme</span>
                <DayNightSwitch
                  checked={isLightMode}
                  onToggle={handleThemeToggle}
                  className="h-8 w-16"
                />
              </div>

              {/* PWA Install */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium">Install App</span>
                <PWAInstallButton 
                  variant="ghost" 
                  size="sm" 
                  showText={false}
                  className="h-8 w-8 p-0"
                />
              </div>
              
              {user && (
                <>
                  <Separator className="my-2" />
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left font-medium text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                  >
                    <LogOutIcon className="w-4 h-4 mr-2" />
                    {isSigningOut ? 'Signing out...' : 'Sign Out'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;