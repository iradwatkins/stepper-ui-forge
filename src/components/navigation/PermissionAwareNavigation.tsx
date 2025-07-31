// Permission-aware navigation components
// Shows/hides navigation items based on user permissions and authentication status

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Calendar, 
  Settings, 
  TrendingUp,
  UserPlus,
  QrCode,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import { useAuth } from '@/contexts/AuthContext'

interface NavigationItem {
  label: string
  href: string
  icon: React.ReactNode
  permission?: 'sell_tickets' | 'work_events' | 'manage_events' | 'create_events'
  requireAuth?: boolean
  badge?: string | number
}

// Main dashboard navigation menu
export const DashboardNavigation: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { 
    canSellTickets, 
    canWorkEvents, 
    isCoOrganizer, 
    isEventOwner,
    canPerformAction,
    loading 
  } = useUserPermissions()

  if (!user || loading) {
    return null
  }

  const navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      requireAuth: true
    },
    {
      label: 'Events',
      href: '/events',
      icon: <Calendar className="h-4 w-4" />
    },
    {
      label: 'Create Event',
      href: '/create-event',
      icon: <UserPlus className="h-4 w-4" />,
      permission: 'create_events'
    }
  ]

  // Add permission-based navigation items
  if (canSellTickets) {
    navigationItems.push({
      label: 'Ticket Sales',
      href: '/dashboard/ticket-sales',
      icon: <ShoppingCart className="h-4 w-4" />,
      permission: 'sell_tickets'
    })
  }

  if (canWorkEvents) {
    navigationItems.push({
      label: 'Team Dashboard',
      href: '/dashboard/team',
      icon: <QrCode className="h-4 w-4" />,
      permission: 'work_events'
    })
  }

  if (isCoOrganizer || isEventOwner) {
    navigationItems.push({
      label: 'Manage Events',
      href: '/dashboard/events',
      icon: <Settings className="h-4 w-4" />,
      permission: 'manage_events'
    })
  }

  if (isEventOwner) {
    navigationItems.push({
      label: 'Followers',
      href: '/dashboard/followers',
      icon: <Users className="h-4 w-4" />,
      permission: 'manage_events'
    })
  }

  const filteredItems = navigationItems.filter(item => {
    if (item.requireAuth && !user) return false
    if (item.permission && !canPerformAction(item.permission)) return false
    return true
  })

  return (
    <nav className="flex flex-col sm:flex-row gap-2 sm:gap-4">
      {filteredItems.map((item) => (
        <Button
          key={item.href}
          variant={location.pathname === item.href ? 'default' : 'ghost'}
          onClick={() => navigate(item.href)}
          className="flex items-center gap-2 justify-start w-full sm:w-auto"
        >
          {item.icon}
          <span>{item.label}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto sm:ml-2">
              {item.badge}
            </Badge>
          )}
        </Button>
      ))}
    </nav>
  )
}

// User menu dropdown with permission-based items
export const UserMenuDropdown: React.FC<{ trigger: React.ReactNode }> = ({ trigger }) => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { 
    canSellTickets, 
    canWorkEvents, 
    isEventOwner, 
    sellingPermissions 
  } = useUserPermissions()

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <Settings className="mr-2 h-4 w-4" />
          Profile Settings
        </DropdownMenuItem>

        {/* Dashboard links based on permissions */}
        {(canSellTickets || canWorkEvents) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Dashboard</DropdownMenuLabel>
            
            {canSellTickets && (
              <DropdownMenuItem onClick={() => navigate('/dashboard/follower')}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Ticket Sales
                <Badge variant="secondary" className="ml-auto">
                  {sellingPermissions.length}
                </Badge>
              </DropdownMenuItem>
            )}
            
            {canWorkEvents && (
              <DropdownMenuItem onClick={() => navigate('/dashboard/team')}>
                <QrCode className="mr-2 h-4 w-4" />
                Team Dashboard
              </DropdownMenuItem>
            )}
          </>
        )}

        {/* Organizer-specific options */}
        {isEventOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Organizer Tools</DropdownMenuLabel>
            
            <DropdownMenuItem onClick={() => navigate('/dashboard/events')}>
              <Calendar className="mr-2 h-4 w-4" />
              My Events
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => navigate('/dashboard/followers')}>
              <Users className="mr-2 h-4 w-4" />
              Manage Followers
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => navigate('/dashboard/analytics')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Quick actions toolbar based on permissions
export const QuickActionsToolbar: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { canSellTickets, canWorkEvents, canPerformAction } = useUserPermissions()

  if (!user) {
    return null
  }

  return (
    <div className="flex items-center space-x-2">
      {canPerformAction('create_events') && (
        <Button 
          size="sm" 
          onClick={() => navigate('/create-event')}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      )}

      {canSellTickets && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/dashboard/referrals')}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Generate Link
        </Button>
      )}

      {canWorkEvents && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/dashboard/scanner')}
        >
          <QrCode className="h-4 w-4 mr-2" />
          Scan Tickets
        </Button>
      )}
    </div>
  )
}

// Sidebar navigation for dashboard pages
export const DashboardSidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { 
    canSellTickets, 
    canWorkEvents, 
    isEventOwner, 
    canPerformAction 
  } = useUserPermissions()

  if (!user) {
    return null
  }

  const sidebarSections = [
    {
      label: 'Overview',
      items: [
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: <LayoutDashboard className="h-4 w-4" />
        }
      ]
    }
  ]

  // Add permission-based sections
  if (canSellTickets) {
    sidebarSections.push({
      label: 'Selling',
      items: [
        {
          label: 'My Sales',
          href: '/dashboard/follower',
          icon: <ShoppingCart className="h-4 w-4" />
        },
        {
          label: 'Referral Codes',
          href: '/dashboard/referrals',
          icon: <DollarSign className="h-4 w-4" />
        }
      ]
    })
  }

  if (canWorkEvents) {
    sidebarSections.push({
      label: 'Team',
      items: [
        {
          label: 'Schedule',
          href: '/dashboard/schedule',
          icon: <Calendar className="h-4 w-4" />
        },
        {
          label: 'Check-in',
          href: '/dashboard/checkin',
          icon: <QrCode className="h-4 w-4" />
        }
      ]
    })
  }

  if (isEventOwner) {
    sidebarSections.push({
      label: 'Organizer',
      items: [
        {
          label: 'Events',
          href: '/dashboard/events',
          icon: <Calendar className="h-4 w-4" />
        },
        {
          label: 'Followers',
          href: '/dashboard/followers',
          icon: <Users className="h-4 w-4" />
        },
        {
          label: 'Analytics',
          href: '/dashboard/analytics',
          icon: <TrendingUp className="h-4 w-4" />
        }
      ]
    })
  }

  return (
    <aside className="w-64 bg-gray-50 border-r min-h-screen p-4">
      <div className="space-y-6">
        {sidebarSections.map((section) => (
          <div key={section.label}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {section.label}
            </h3>
            <nav className="space-y-1">
              {section.items.map((item) => (
                <Button
                  key={item.href}
                  variant={location.pathname === item.href ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => navigate(item.href)}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Button>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  )
}

// Context menu for events with permission-based actions
interface EventContextMenuProps {
  eventId: string
  organizerId: string
  trigger: React.ReactNode
}

export const EventContextMenu: React.FC<EventContextMenuProps> = ({
  eventId,
  organizerId,
  trigger
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { } = useUserPermissions()

  if (!user) {
    return <>{trigger}</>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => navigate(`/event/${eventId}`)}>
          View Event
        </DropdownMenuItem>
        
        {/* Permission-based actions */}
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate(`/event/${eventId}/tickets`)}>
          Buy Tickets
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}