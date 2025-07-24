import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/lib/hooks/useAdminPermissions";
import { Button } from "@/components/ui/button";
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
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [administrationExpanded, setAdministrationExpanded] = useState(false);

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

  const accountItems = [
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/dashboard/notifications", icon: Bell, label: "Notifications", badge: 5 },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const administrationItems = [
    { path: "/admin", icon: Home, label: "Admin Panel" },
    { path: "/admin/users", icon: Users, label: "User Management" },
    { path: "/admin/analytics", icon: BarChart3, label: "Platform Analytics" },
    { path: "/admin/settings", icon: Settings, label: "System Settings" },
    { path: "/admin/monitor", icon: Monitor, label: "System Monitor" },
    { path: "/admin/database", icon: Database, label: "Database Admin" },
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
              {/* Account Section */}
              <li>
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => setAccountExpanded(!accountExpanded)}
                >
                  <User className="h-4 w-4 mr-3" />
                  Account
                  {accountExpanded ? (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </Button>
                {accountExpanded && (
                  <ul className="ml-6 mt-2 space-y-1">
                    {accountItems.map((item) => (
                      <li key={item.path}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
                          onClick={() => navigate(item.path)}
                        >
                          <item.icon className="h-3 w-3 mr-2" />
                          {item.label}
                          {item.badge && (
                            <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>

              {/* Administration Section */}
              <li>
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => setAdministrationExpanded(!administrationExpanded)}
                >
                  <Shield className="h-4 w-4 mr-3" />
                  Administration
                  {administrationExpanded ? (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </Button>
                {administrationExpanded && (
                  <ul className="ml-6 mt-2 space-y-1">
                    {administrationItems.map((item) => (
                      <li key={item.path}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
                          onClick={() => navigate(item.path)}
                        >
                          <item.icon className="h-3 w-3 mr-2" />
                          {item.label}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
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