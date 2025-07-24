import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  BookOpen, 
  BarChart3, 
  Settings, 
  Monitor, 
  Database, 
  CreditCard,
  ArrowRight,
  TrendingUp,
  FileText,
  UserCheck,
  DollarSign,
  Activity,
  Plus
} from 'lucide-react';
import { useIsAdmin } from '@/lib/hooks/useAdminPermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  color: string;
}

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
}

export default function AdminDashboardOverview() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useIsAdmin();
  const [stats, setStats] = useState<StatCard[]>([]);

  // Mock stats - in real app, these would come from API
  useEffect(() => {
    setStats([
      {
        title: 'Total Users',
        value: '2,847',
        change: '+12%',
        trend: 'up',
        icon: Users
      },
      {
        title: 'Active Events',
        value: 42,
        change: '+8%',
        trend: 'up',
        icon: Calendar
      },
      {
        title: 'Articles Published',
        value: 18,
        change: '+3',
        trend: 'up',
        icon: BookOpen
      },
      {
        title: 'Monthly Revenue',
        value: '$12,450',
        change: '+18%',
        trend: 'up',
        icon: DollarSign
      }
    ]);
  }, []);

  const quickActions: QuickAction[] = [
    // Content Management
    {
      title: 'Create Article',
      description: 'Write and publish new magazine articles',
      href: '/dashboard/admin/magazine/create',
      icon: Plus,
      category: 'Content',
      color: 'bg-green-500'
    },
    {
      title: 'Magazine Articles',
      description: 'View, edit, and manage magazine content',
      href: '/dashboard/admin/magazine',
      icon: BookOpen,
      category: 'Content',
      color: 'bg-blue-500'
    },
    {
      title: 'Event Management',
      description: 'Oversee platform events and organizers',
      href: '/dashboard/admin/events',
      icon: Calendar,
      category: 'Content',
      color: 'bg-green-500'
    },
    
    // User & Analytics
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      href: '/dashboard/admin/users',
      icon: Users,
      category: 'Users',
      color: 'bg-purple-500'
    },
    {
      title: 'Platform Analytics',
      description: 'View comprehensive platform metrics',
      href: '/dashboard/admin/analytics',
      icon: BarChart3,
      category: 'Users',
      color: 'bg-orange-500'
    },
    
    // System & Config
    {
      title: 'System Settings',
      description: 'Configure platform settings and features',
      href: '/dashboard/admin/settings',
      icon: Settings,
      category: 'System',
      color: 'bg-gray-500'
    },
    {
      title: 'Payment Config',
      description: 'Manage payment gateways and settings',
      href: '/dashboard/admin/payments',
      icon: CreditCard,
      category: 'System',
      color: 'bg-indigo-500'
    },
    {
      title: 'System Monitor',
      description: 'Monitor system health and performance',
      href: '/dashboard/admin/monitor',
      icon: Monitor,
      category: 'System',
      color: 'bg-red-500'
    },
    {
      title: 'Database Admin',
      description: 'Direct database access and management',
      href: '/dashboard/admin/database',
      icon: Database,
      category: 'System',
      color: 'bg-yellow-500'
    }
  ];

  const groupedActions = quickActions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your platform from this central hub</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate('/dashboard/admin/magazine/create')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Article
          </Button>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Activity className="w-3 h-3 mr-1" />
            System Online
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.change && (
                    <p className={`text-xs flex items-center gap-1 mt-1 ${
                      stat.trend === 'up' ? 'text-green-600' : 
                      stat.trend === 'down' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      <TrendingUp className="w-3 h-3" />
                      {stat.change}
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${
                  stat.trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        
        {Object.entries(groupedActions).map(([category, actions]) => (
          <div key={category}>
            <h3 className="text-lg font-medium mb-3 text-muted-foreground border-b pb-2">
              {category} Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {actions.map((action) => (
                <Card 
                  key={action.title}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 group border-l-4 border-l-transparent hover:border-l-primary"
                  onClick={() => navigate(action.href)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${action.color} bg-opacity-10`}>
                        <action.icon className={`w-5 h-5 ${action.color.replace('bg-', 'text-')}`} />
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      {action.title}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recent Admin Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">New article published: "Stepping Techniques"</span>
              </div>
              <span className="text-xs text-muted-foreground">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">User permissions updated for 3 organizers</span>
              </div>
              <span className="text-xs text-muted-foreground">4 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm">Payment gateway configuration updated</span>
              </div>
              <span className="text-xs text-muted-foreground">1 day ago</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Database backup completed successfully</span>
              </div>
              <span className="text-xs text-muted-foreground">1 day ago</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access Footer */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <Button 
          size="sm" 
          onClick={() => navigate('/dashboard/admin/magazine/create')}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Article
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/admin/magazine')}>
          <BookOpen className="w-4 h-4 mr-2" />
          Manage Articles
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/admin/users')}>
          <UserCheck className="w-4 h-4 mr-2" />
          User Actions
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/admin/analytics')}>
          <BarChart3 className="w-4 h-4 mr-2" />
          View Reports
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/admin/monitor')}>
          <Monitor className="w-4 h-4 mr-2" />
          System Status
        </Button>
      </div>
    </div>
  );
}