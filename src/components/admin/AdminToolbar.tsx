import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings, 
  Calendar,
  CreditCard,
  Plus,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdminToolbarProps {
  className?: string;
}

export default function AdminToolbar({ className = '' }: AdminToolbarProps) {
  const navigate = useNavigate();

  const quickLinks = [
    {
      title: 'Admin Hub',
      href: '/dashboard/admin',
      icon: LayoutDashboard,
      color: 'text-blue-600 hover:text-blue-700'
    },
    {
      title: 'Create Article',
      href: '/dashboard/admin/magazine/create',
      icon: Plus,
      color: 'text-green-600 hover:text-green-700'
    },
    {
      title: 'Magazine',
      href: '/dashboard/admin/magazine',
      icon: BookOpen,
      color: 'text-purple-600 hover:text-purple-700'
    },
    {
      title: 'Users',
      href: '/dashboard/admin/users',
      icon: Users,
      color: 'text-orange-600 hover:text-orange-700'
    },
    {
      title: 'Events',
      href: '/dashboard/admin/events',
      icon: Calendar,
      color: 'text-indigo-600 hover:text-indigo-700'
    },
    {
      title: 'Analytics',
      href: '/dashboard/admin/analytics',
      icon: BarChart3,
      color: 'text-cyan-600 hover:text-cyan-700'
    },
    {
      title: 'Settings',
      href: '/dashboard/admin/settings',
      icon: Settings,
      color: 'text-gray-600 hover:text-gray-700'
    }
  ];

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1 p-2 bg-muted/50 rounded-lg border ${className}`}>
        <span className="text-xs font-medium text-muted-foreground px-2">Quick Access:</span>
        <Separator orientation="vertical" className="h-6" />
        {quickLinks.map((link, index) => (
          <Tooltip key={link.title}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${link.color}`}
                onClick={() => navigate(link.href)}
              >
                <link.icon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{link.title}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}