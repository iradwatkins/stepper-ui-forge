import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/lib/hooks/useAdminPermissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Shield, 
  LogOut, 
  Home,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Database,
  Monitor,
  User,
  Bell,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/admin");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    navigate("/admin");
    return null;
  }

  const adminNavItems = [
    { path: "/admin", icon: Home, label: "Dashboard" },
    { path: "/admin/users", icon: Users, label: "Users" },
    { path: "/admin/events", icon: Calendar, label: "Events" },
    { path: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/admin/monitor", icon: Monitor, label: "Monitor" },
    { path: "/admin/database", icon: Database, label: "Database" },
  ];

  const accountItems = [
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/dashboard/notifications", icon: Bell, label: "Notifications" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="bg-destructive text-destructive-foreground shadow-md border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold">Admin Portal</h1>
                <p className="text-destructive-foreground/80 text-sm">System Administration</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">
                Welcome, <strong>{user.email}</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="border-destructive-foreground/20 text-destructive-foreground hover:bg-destructive-foreground/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Admin Sidebar */}
        <aside className="w-64 bg-background border-r border-border shadow-sm min-h-screen">
          <nav className="p-4">
            <ul className="space-y-2">
              {adminNavItems.map((item) => (
                <li key={item.path}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Button>
                </li>
              ))}
              
              {/* Account Dropdown */}
              <li>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Account
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {accountItems.map((item) => (
                      <DropdownMenuItem
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="cursor-pointer"
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                        {item.label === "Notifications" && (
                          <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                            5
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-background overflow-y-auto max-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;