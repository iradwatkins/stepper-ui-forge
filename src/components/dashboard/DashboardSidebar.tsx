import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAdminPermissions } from '@/lib/hooks/useAdminPermissions'
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  User,
  Calendar,
  Ticket,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  BarChart3,
  Bell,
  CreditCard,
  UserPlus,
  Shield,
  X,
  DollarSign,
  QrCode,
  Heart,
  Clock,
  PieChart,
  Briefcase,
  Monitor,
  Database
} from 'lucide-react'

interface NavigationItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  children?: NavigationItem[]
}

// Base navigation for all users
const getBaseNavigation = (): NavigationItem[] => [
  {
    title: 'Profile',
    href: '/dashboard/profile',
    icon: User
  }
]

// Navigation for regular users
const getRegularUserNavigation = (): NavigationItem[] => [
  {
    title: 'Browse Events',
    href: '/events',
    icon: Calendar
  },
  {
    title: 'Following',
    href: '/dashboard/following',
    icon: Heart
  }
]

// Navigation for sellers
const getSellerNavigation = (): NavigationItem[] => [
  {
    title: 'Sales Dashboard',
    href: '/dashboard/sales',
    icon: DollarSign
  },
  {
    title: 'Referral Codes',
    href: '/dashboard/referrals',
    icon: CreditCard
  },
  {
    title: 'Earnings',
    href: '/dashboard/earnings',
    icon: BarChart3
  }
]

// Navigation for team members
const getTeamMemberNavigation = (): NavigationItem[] => [
  {
    title: 'Event Assignments',
    href: '/dashboard/assignments',
    icon: Calendar
  },
  {
    title: 'Check-In Tools',
    href: '/dashboard/checkin',
    icon: QrCode
  },
  {
    title: 'Schedule',
    href: '/dashboard/schedule',
    icon: Clock
  }
]

// Navigation for organizers
const getOrganizerNavigation = (): NavigationItem[] => [
  {
    title: 'My Events',
    icon: Calendar,
    children: [
      {
        title: 'All Events',
        href: '/dashboard/events',
        icon: Calendar
      },
      {
        title: 'Create Event',
        href: '/create-event',
        icon: Plus
      },
      {
        title: 'Edit Events',
        href: '/dashboard/events/manage',
        icon: Edit3
      },
      {
        title: 'Draft Events',
        href: '/dashboard/events/drafts',
        icon: Edit3,
        badge: 3
      },
      {
        title: 'Archived',
        href: '/dashboard/events/archived',
        icon: Trash2
      }
    ]
  },
  {
    title: 'Analytics',
    icon: PieChart,
    children: [
      {
        title: 'Event Analytics',
        href: '/dashboard/analytics',
        icon: BarChart3
      },
      {
        title: 'Sales Reports',
        href: '/dashboard/tickets/analytics',
        icon: DollarSign
      },
      {
        title: 'Audience Insights',
        href: '/dashboard/audience',
        icon: Users
      }
    ]
  },
  {
    title: 'Team Management',
    icon: Briefcase,
    children: [
      {
        title: 'Team Members',
        href: '/dashboard/team',
        icon: Users
      },
      {
        title: 'Invite Members',
        href: '/dashboard/team/invite',
        icon: UserPlus
      },
      {
        title: 'Roles & Permissions',
        href: '/dashboard/team/roles',
        icon: Shield
      }
    ]
  },
  {
    title: 'Followers',
    href: '/dashboard/followers',
    icon: Users
  }
]

const accountNavigation: NavigationItem[] = [
  {
    title: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
    badge: 5
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings
  }
]

// Navigation for admins
const getAdminNavigation = (): NavigationItem[] => [
  {
    title: 'Admin Panel',
    icon: Shield,
    children: [
      {
        title: 'User Management',
        href: '/dashboard/admin/users',
        icon: Users
      },
      {
        title: 'Platform Analytics',
        href: '/dashboard/admin/analytics',
        icon: BarChart3
      },
      {
        title: 'System Settings',
        href: '/dashboard/admin/settings',
        icon: Settings
      },
      {
        title: 'System Monitor',
        href: '/dashboard/admin/monitor',
        icon: Monitor
      },
      {
        title: 'Database Admin',
        href: '/dashboard/admin/database',
        icon: Database
      }
    ]
  }
]

interface DashboardSidebarProps {
  open?: boolean
  onClose?: () => void
  className?: string
}

export function DashboardSidebar({ open = true, onClose, className }: DashboardSidebarProps) {
  const location = useLocation()
  const { isAdmin } = useAdminPermissions()
  const { canSellTickets, canWorkEvents, isEventOwner } = useUserPermissions()
  const [expandedItems, setExpandedItems] = useState<string[]>(['My Events'])

  // Build navigation based on user permissions
  const buildNavigation = (): NavigationItem[] => {
    let navigation = getBaseNavigation()
    
    if (isEventOwner) {
      navigation = [...navigation, ...getOrganizerNavigation()]
    } else {
      navigation = [...navigation, ...getRegularUserNavigation()]
      
      if (canSellTickets) {
        navigation = [...navigation, ...getSellerNavigation()]
      }
      
      if (canWorkEvents) {
        navigation = [...navigation, ...getTeamMemberNavigation()]
      }
    }
    
    return navigation
  }

  const navigation = buildNavigation()

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const isActive = (href?: string) => {
    if (!href) return false
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const NavigationGroup = ({ items, title }: { items: NavigationItem[], title?: string }) => (
    <div className="space-y-1">
      {title && (
        <div className="px-3 py-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </h2>
        </div>
      )}
      {items.map((item) => (
        <NavigationItemComponent key={item.title} item={item} />
      ))}
    </div>
  )

  const NavigationItemComponent = ({ item }: { item: NavigationItem }) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.title)
    const isItemActive = isActive(item.href)

    if (hasChildren) {
      return (
        <div>
          <Button
            variant="ghost"
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              'w-full justify-between px-3 py-2 text-left font-medium',
              'hover:bg-accent hover:text-accent-foreground',
              'text-muted-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.badge && (
                <Badge variant="secondary" className="h-5 px-2 text-xs">
                  {item.badge}
                </Badge>
              )}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </Button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children?.map((child) => (
                <Link key={child.title} to={child.href || '#'}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start px-3 py-2 text-sm',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive(child.href) 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground'
                    )}
                  >
                    <child.icon className="mr-3 h-4 w-4" />
                    {child.title}
                    {child.badge && (
                      <Badge variant="secondary" className="ml-auto h-5 px-2 text-xs">
                        {child.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link to={item.href || '#'}>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start px-3 py-2 font-medium',
            'hover:bg-accent hover:text-accent-foreground',
            isItemActive 
              ? 'bg-accent text-accent-foreground' 
              : 'text-muted-foreground'
          )}
        >
          <item.icon className="mr-3 h-5 w-5" />
          {item.title}
          {item.badge && (
            <Badge variant="secondary" className="ml-auto h-5 px-2 text-xs">
              {item.badge}
            </Badge>
          )}
        </Button>
      </Link>
    )
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && onClose && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-80 bg-gradient-to-br from-gray-800 to-gray-900 transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          className
        )}
      >
        {/* Header */}
        <div className="relative border-b border-white/20 p-6">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-white">
              Steppers Dashboard
            </h1>
          </Link>
          
          {/* Mobile close button */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-4 top-4 text-white hover:bg-white/10 lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            <NavigationGroup items={navigation} />
            <Separator className="bg-white/20" />
            <NavigationGroup items={accountNavigation} title="Account" />
            {isAdmin && (
              <>
                <Separator className="bg-white/20" />
                <NavigationGroup items={getAdminNavigation()} title="Administration" />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-white/20 p-4">
          <div className="text-xs text-white/60 text-center">
            © 2024 Steppers Platform
          </div>
        </div>
      </aside>
    </>
  )
}