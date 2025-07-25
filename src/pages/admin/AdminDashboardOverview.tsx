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
      {/* Header - Enhanced with Icons */}
      <div className="bg-gradient-to-r from-background to-muted/20 rounded-lg p-6 border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary rounded-lg">
              <Settings className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                Admin Dashboard
                <Badge className="font-normal">Administrator</Badge>
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Manage your platform from this central hub
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate('/dashboard/admin/magazine/create')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Article
            </Button>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 py-2">
              <Activity className="w-4 h-4 mr-2 animate-pulse" />
              System Online
            </Badge>
          </div>
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

      {/* Quick Actions - Prominent Section */}
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary rounded-lg">
                <Activity className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Quick Actions</h2>
                <p className="text-sm text-muted-foreground">Access your most used admin tools</p>
              </div>
            </div>
          </div>
          
          {/* Top-level prominent actions grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.slice(0, 6).map((action) => (
              <Card 
                key={action.title}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 group border-2 hover:border-primary/50 bg-background/95 backdrop-blur"
                onClick={() => navigate(action.href)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl ${action.color} bg-opacity-20 group-hover:bg-opacity-30 transition-colors`}>
                      <action.icon className={`w-8 h-8 ${action.color.replace('bg-', 'text-')}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors flex items-center gap-2">
                        {action.title}
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Additional actions by category */}
        {Object.entries(groupedActions).map(([category, actions]) => (
          <div key={category} className="bg-muted/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {category === 'Content' && <BookOpen className="w-5 h-5 text-blue-500" />}
              {category === 'Users' && <Users className="w-5 h-5 text-purple-500" />}
              {category === 'System' && <Settings className="w-5 h-5 text-gray-500" />}
              {category} Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {actions.slice(6).map((action) => (
                <Button
                  key={action.title}
                  variant="outline"
                  className="h-auto p-4 justify-start hover:bg-background hover:shadow-md transition-all group"
                  onClick={() => navigate(action.href)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <action.icon className={`w-5 h-5 ${action.color.replace('bg-', 'text-')} group-hover:scale-110 transition-transform`} />
                    <span className="text-left font-medium">{action.title}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity - Enhanced with Icons */}
      <Card className="border-2">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            Recent Admin Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="p-2 bg-green-100 rounded-lg">
                <BookOpen className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">New article published</p>
                <p className="text-xs text-muted-foreground">"Stepping Techniques" - 2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">User permissions updated</p>
                <p className="text-xs text-muted-foreground">3 organizers modified - 4 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CreditCard className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Payment gateway updated</p>
                <p className="text-xs text-muted-foreground">Configuration changes applied - 1 day ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Database backup completed</p>
                <p className="text-xs text-muted-foreground">Automated backup successful - 1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access Footer - Enhanced */}
      <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Frequently Used Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button 
            onClick={() => navigate('/dashboard/admin/magazine/create')}
            className="h-auto p-4 bg-green-600 hover:bg-green-700 flex flex-col items-center gap-2"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">New Article</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/admin/magazine')}
            className="h-auto p-4 hover:bg-background hover:shadow-md flex flex-col items-center gap-2 group"
          >
            <BookOpen className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Articles</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/admin/users')}
            className="h-auto p-4 hover:bg-background hover:shadow-md flex flex-col items-center gap-2 group"
          >
            <UserCheck className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Users</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/admin/analytics')}
            className="h-auto p-4 hover:bg-background hover:shadow-md flex flex-col items-center gap-2 group"
          >
            <BarChart3 className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Analytics</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/admin/monitor')}
            className="h-auto p-4 hover:bg-background hover:shadow-md flex flex-col items-center gap-2 group"
          >
            <Monitor className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Monitor</span>
          </Button>
        </div>
      </div>
    </div>
  );
}