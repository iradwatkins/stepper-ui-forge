import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminPermissions } from '@/lib/hooks/useAdminPermissions'
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import { useEventPermissions } from '@/hooks/useEventPermissions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Calendar,
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
  Building2,
  Clock,
  PieChart,
  Briefcase,
  Monitor,
  Database,
  BookOpen,
  LayoutDashboard,
  Search
} from 'lucide-react'

interface NavigationItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  children?: NavigationItem[]
}

interface DashboardSidebarProps {
  open?: boolean
  onClose?: () => void
  className?: string
}

export function DashboardSidebar({ open = true, onClose, className }: DashboardSidebarProps) {
  const location = useLocation()
  const { user } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdminPermissions()
  const { isEventOwner, isOrganizer } = useUserPermissions()
  const eventPermissions = useEventPermissions()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  // Initialize from localStorage to prevent flicker
  const [showAdminSection, setShowAdminSection] = useState(() => {
    const stored = localStorage.getItem('showAdminSection')
    return stored === 'true'
  })
  
  // Update showAdminSection based on isAdmin, but only hide after loading completes
  useEffect(() => {
    if (!adminLoading) {
      setShowAdminSection(isAdmin)
      // Store the value to prevent flicker on next load
      localStorage.setItem('showAdminSection', String(isAdmin))
    } else if (isAdmin) {
      // If we detect admin status during loading, show immediately
      setShowAdminSection(true)
      localStorage.setItem('showAdminSection', 'true')
    }
  }, [isAdmin, adminLoading])

  const isActive = (href?: string) => {
    if (!href) return false
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  // Filter navigation items based on search query
  const filterNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
    if (!searchQuery.trim()) return items
    
    const query = searchQuery.toLowerCase()
    
    return items.reduce((filtered: NavigationItem[], item) => {
      const matchesTitle = item.title.toLowerCase().includes(query)
      
      if (item.children) {
        const filteredChildren = item.children.filter(child => 
          child.title.toLowerCase().includes(query)
        )
        
        if (matchesTitle || filteredChildren.length > 0) {
          filtered.push({
            ...item,
            children: filteredChildren.length > 0 ? filteredChildren : item.children
          })
        }
      } else if (matchesTitle) {
        filtered.push(item)
      }
      
      return filtered
    }, [])
  }

  // Auto-expand items when searching
  useEffect(() => {
    if (searchQuery) {
      // Expand all items with children when searching
      const allNavItems = [
        ...getMainNavigation(),
        ...getEventsAndSalesNavigation(),
        ...getOperationsNavigation(),
        ...getAnalyticsNavigation(),
        ...getManagementNavigation(),
        ...getAccountNavigation(),
        ...(showAdminSection ? getAdminNavigation() : [])
      ]
      
      const itemsWithChildren = allNavItems
        .filter(item => item.children && item.children.length > 0)
        .map(item => item.title)
      
      setExpandedItems(itemsWithChildren)
    }
  }, [searchQuery])

  // Build navigation based on user permissions - Progressive Enhancement System
  const getMainNavigation = (): NavigationItem[] => {
    // Core navigation for all users
    const items: NavigationItem[] = [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard
      },
      {
        title: 'My Tickets',
        href: '/dashboard/tickets',
        icon: CreditCard
      },
      {
        title: 'Liked Events',
        href: '/dashboard/liked',
        icon: Heart
      }
    ]

    // Add following/followers based on context
    if (isEventOwner || isOrganizer) {
      items.push({
        title: 'Followers',
        href: '/dashboard/followers',
        icon: Users
      })
    } else {
      items.push({
        title: 'Following',
        href: '/dashboard/following',
        icon: Users
      })
    }

    return items
  }

  // Events & Sales section
  const getEventsAndSalesNavigation = (): NavigationItem[] => {
    const items: NavigationItem[] = [
      {
        title: 'Browse Events',
        href: '/events',
        icon: Calendar
      }
    ]

    // Event management for organizers
    if (isEventOwner || isOrganizer) {
      items.push({
        title: 'My Events',
        icon: Calendar,
        children: [
          {
            title: 'Create New',
            href: '/create-event',
            icon: Plus
          },
          {
            title: 'Manage Events',
            href: '/dashboard/events',
            icon: Edit3
          },
          {
            title: 'Drafts',
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
      })
      
      items.push({
        title: 'Venues',
        href: '/dashboard/venues',
        icon: Building2
      })
    }

    // Sales tools for sellers
    if (eventPermissions.canSellTickets) {
      items.push({
        title: 'Sales Tools',
        icon: DollarSign,
        children: [
          {
            title: 'Sales Dashboard',
            href: '/dashboard/sales',
            icon: BarChart3
          },
          {
            title: 'Referral Codes',
            href: '/dashboard/referrals',
            icon: CreditCard
          },
          {
            title: 'Earnings',
            href: '/dashboard/earnings',
            icon: DollarSign
          },
          {
            title: 'Payouts',
            href: '/dashboard/payouts',
            icon: CreditCard
          }
        ]
      })
    }

    return items
  }

  // Operations section for staff and organizers
  const getOperationsNavigation = (): NavigationItem[] => {
    const items: NavigationItem[] = []

    // Staff operations
    if (eventPermissions.canWorkEvents) {
      items.push({
        title: 'Check-In & Scanning',
        icon: QrCode,
        children: [
          {
            title: 'QR Scanner',
            href: '/dashboard/scanner',
            icon: QrCode
          },
          {
            title: 'Check-In Tools',
            href: '/dashboard/checkin',
            icon: Shield
          }
        ]
      })
      
      items.push({
        title: 'Team & Assignments',
        icon: Briefcase,
        children: [
          {
            title: 'Event Assignments',
            href: '/dashboard/assignments',
            icon: Calendar,
            badge: eventPermissions.teamMemberEvents.length
          },
          {
            title: 'My Schedule',
            href: '/dashboard/schedule',
            icon: Clock
          }
        ]
      })
    }

    return items
  }

  // Analytics section for organizers
  const getAnalyticsNavigation = (): NavigationItem[] => {
    if (!isEventOwner && !isOrganizer) return []
    
    return [
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
  }

  // Management section for organizers
  const getManagementNavigation = (): NavigationItem[] => {
    if (!isEventOwner && !isOrganizer) return []
    
    return [
      {
        title: 'Team Management',
        icon: Users,
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
            title: 'Permissions',
            href: '/dashboard/team/roles',
            icon: Shield
          }
        ]
      },
      {
        title: 'Seller Payouts',
        href: '/dashboard/seller-payouts',
        icon: DollarSign
      }
    ]
  }

  const getAccountNavigation = (): NavigationItem[] => [
    {
      title: 'Profile',
      href: '/dashboard/profile',
      icon: User
    },
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

  const getAdminNavigation = (): NavigationItem[] => [
    {
      title: 'Admin Hub',
      href: '/dashboard/admin',
      icon: LayoutDashboard
    },
    {
      title: 'Content',
      icon: BookOpen,
      children: [
        {
          title: 'Magazine',
          href: '/dashboard/admin/magazine',
          icon: BookOpen
        },
        {
          title: 'Events',
          href: '/dashboard/admin/events',
          icon: Calendar
        }
      ]
    },
    {
      title: 'Users & Data',
      icon: Users,
      children: [
        {
          title: 'Users',
          href: '/dashboard/admin/users',
          icon: Users
        },
        {
          title: 'Analytics',
          href: '/dashboard/admin/analytics',
          icon: BarChart3
        }
      ]
    },
    {
      title: 'System',
      icon: Settings,
      children: [
        {
          title: 'Settings',
          href: '/dashboard/admin/settings',
          icon: Settings
        },
        {
          title: 'Payments',
          href: '/dashboard/admin/payments',
          icon: CreditCard
        },
        {
          title: 'Monitor',
          href: '/dashboard/admin/monitor',
          icon: Monitor
        },
        {
          title: 'Database',
          href: '/dashboard/admin/database',
          icon: Database
        }
      ]
    }
  ]

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
              'hover:bg-accent hover:text-accent-foreground transition-colors',
              'text-muted-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{item.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.badge && (
                <Badge variant="secondary" className="h-4 px-1.5 text-xs">
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
            <div className="ml-6 mt-1 space-y-1">
              {item.children?.map((child) => (
                <Link key={child.title} to={child.href || '#'}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start px-3 py-2 text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive(child.href) 
                        ? 'bg-accent text-accent-foreground font-medium' 
                        : 'text-muted-foreground'
                    )}
                  >
                    <child.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{child.title}</span>
                    {child.badge && (
                      <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-xs">
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
            'w-full justify-start px-3 py-2 font-medium transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            isItemActive 
              ? 'bg-accent text-accent-foreground' 
              : 'text-muted-foreground'
          )}
        >
          <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
          <span className="truncate">{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-xs">
              {item.badge}
            </Badge>
          )}
        </Button>
      </Link>
    )
  }

  const NavigationGroup = ({ items, title }: { items: NavigationItem[], title?: string }) => (
    <div className="space-y-1">
      {title && (
        <div className="px-3 py-2 mb-1">
          <h2 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            <span>{title}</span>
            <span className="h-px flex-1 bg-border" />
          </h2>
        </div>
      )}
      {items.map((item) => (
        <NavigationItemComponent key={item.title} item={item} />
      ))}
    </div>
  )

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="border-b border-border">
        <div className="flex h-16 items-center justify-between px-6">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Calendar className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">Dashboard</span>
          </Link>
          
          {/* Mobile close button */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search navigation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {/* Main Navigation */}
          <NavigationGroup items={filterNavigationItems(getMainNavigation())} />
          
          {/* Events & Sales Section */}
          {getEventsAndSalesNavigation().length > 0 && filterNavigationItems(getEventsAndSalesNavigation()).length > 0 && (
            <>
              <Separator />
              <NavigationGroup items={filterNavigationItems(getEventsAndSalesNavigation())} title="Events & Sales" />
            </>
          )}
          
          {/* Operations Section */}
          {getOperationsNavigation().length > 0 && filterNavigationItems(getOperationsNavigation()).length > 0 && (
            <>
              <Separator />
              <NavigationGroup items={filterNavigationItems(getOperationsNavigation())} title="Operations" />
            </>
          )}
          
          {/* Analytics Section */}
          {getAnalyticsNavigation().length > 0 && filterNavigationItems(getAnalyticsNavigation()).length > 0 && (
            <>
              <Separator />
              <NavigationGroup items={filterNavigationItems(getAnalyticsNavigation())} title="Analytics" />
            </>
          )}
          
          {/* Management Section */}
          {getManagementNavigation().length > 0 && filterNavigationItems(getManagementNavigation()).length > 0 && (
            <>
              <Separator />
              <NavigationGroup items={filterNavigationItems(getManagementNavigation())} title="Management" />
            </>
          )}
          
          {/* Account Section */}
          {filterNavigationItems(getAccountNavigation()).length > 0 && (
            <>
              <Separator />
              <NavigationGroup items={filterNavigationItems(getAccountNavigation())} title="Account" />
            </>
          )}
          
          {/* Admin Section */}
          {showAdminSection && filterNavigationItems(getAdminNavigation()).length > 0 && (
            <>
              <Separator />
              <NavigationGroup items={filterNavigationItems(getAdminNavigation())} title="Administration" />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="text-xs text-center text-muted-foreground">
          © 2024 Steppers Platform
        </div>
      </div>
    </>
  )

  // Mobile sidebar
  if (onClose) {
    return (
      <>
        {/* Mobile overlay */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
        )}

        {/* Mobile sidebar */}
        <aside
          className={cn(
            'fixed left-0 top-0 z-50 h-full w-80 transform bg-background shadow-lg transition-transform duration-300 ease-in-out',
            open ? 'translate-x-0' : '-translate-x-full',
            className
          )}
        >
          {sidebarContent}
        </aside>
      </>
    )
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 h-full w-80 border-r border-border bg-background',
        className
      )}
    >
      {sidebarContent}
    </aside>
  )
}