// Permission Gate components for conditionally rendering UI based on user permissions
// Provides declarative permission checking for components

import React from 'react'
import { useUserPermissions, usePermissionCheck, useOrganizerPermissions } from '@/lib/hooks/useUserPermissions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Lock, UserPlus } from 'lucide-react'

interface PermissionGateProps {
  action: 'sell_tickets' | 'work_events' | 'manage_events' | 'create_events'
  children: React.ReactNode
  fallback?: React.ReactNode
  showFallback?: boolean
  organizerId?: string
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  action,
  children,
  fallback,
  showFallback = true,
  organizerId
}) => {
  const { hasPermission, loading, error, canAccess } = usePermissionCheck(action)

  if (loading) {
    return showFallback ? (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    ) : null
  }

  if (error) {
    return showFallback ? (
      <Alert variant="destructive">
        <AlertDescription>Failed to check permissions</AlertDescription>
      </Alert>
    ) : null
  }

  if (canAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showFallback) {
    return null
  }

  return <DefaultPermissionFallback action={action} organizerId={organizerId} />
}

// Organizer-specific permission gate
interface OrganizerPermissionGateProps {
  organizerId: string
  permission: 'can_sell_tickets' | 'can_work_events' | 'is_co_organizer'
  children: React.ReactNode
  fallback?: React.ReactNode
  showFallback?: boolean
}

export const OrganizerPermissionGate: React.FC<OrganizerPermissionGateProps> = ({
  organizerId,
  permission,
  children,
  fallback,
  showFallback = true
}) => {
  const { permissions, loading } = useOrganizerPermissions(organizerId)

  if (loading) {
    return showFallback ? (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    ) : null
  }

  const hasPermission = permissions[permission]

  if (hasPermission) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showFallback) {
    return null
  }

  return <DefaultOrganizerPermissionFallback permission={permission} organizerId={organizerId} />
}

// Authentication gate
interface AuthGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showFallback?: boolean
}

export const AuthGate: React.FC<AuthGateProps> = ({ 
  children, 
  fallback, 
  showFallback = true 
}) => {
  const { isAuthenticated, loading } = useUserPermissions()

  if (loading) {
    return showFallback ? (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    ) : null
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showFallback) {
    return null
  }

  return (
    <Alert>
      <Lock className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Please sign in to access this feature</span>
        <Button size="sm" onClick={() => window.location.href = '/auth/signin'}>
          Sign In
        </Button>
      </AlertDescription>
    </Alert>
  )
}

// Follow gate - shows content only if user follows the organizer
interface FollowGateProps {
  organizerId: string
  children: React.ReactNode
  fallback?: React.ReactNode
  showFallback?: boolean
}

export const FollowGate: React.FC<FollowGateProps> = ({
  organizerId,
  children,
  fallback,
  showFallback = true
}) => {
  const { isFollowing, loading } = useOrganizerPermissions(organizerId)

  if (loading) {
    return showFallback ? (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    ) : null
  }

  if (isFollowing) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showFallback) {
    return null
  }

  return (
    <Alert>
      <UserPlus className="h-4 w-4" />
      <AlertDescription>
        Follow this organizer to access exclusive content and features
      </AlertDescription>
    </Alert>
  )
}

// Default fallback components
const DefaultPermissionFallback: React.FC<{ 
  action: string
  organizerId?: string 
}> = ({ action, organizerId }) => {
  const getActionMessage = () => {
    switch (action) {
      case 'sell_tickets':
        return 'You need ticket selling permissions to access this feature'
      case 'work_events':
        return 'You need team member permissions to access this feature'
      case 'manage_events':
        return 'You need event management permissions to access this feature'
      case 'create_events':
        return 'Please sign in to create events'
      default:
        return 'You don\'t have permission to access this feature'
    }
  }

  return (
    <Alert>
      <Lock className="h-4 w-4" />
      <AlertDescription>{getActionMessage()}</AlertDescription>
    </Alert>
  )
}

const DefaultOrganizerPermissionFallback: React.FC<{
  permission: string
  organizerId: string
}> = ({ permission, organizerId }) => {
  const getPermissionMessage = () => {
    switch (permission) {
      case 'can_sell_tickets':
        return 'Ask this organizer for ticket selling permissions'
      case 'can_work_events':
        return 'Ask this organizer for team member permissions'
      case 'is_co_organizer':
        return 'You need co-organizer permissions for this action'
      default:
        return 'You don\'t have the required permissions'
    }
  }

  return (
    <Alert>
      <Lock className="h-4 w-4" />
      <AlertDescription>{getPermissionMessage()}</AlertDescription>
    </Alert>
  )
}

// Higher-order component for permission checking
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  action: 'sell_tickets' | 'work_events' | 'manage_events' | 'create_events',
  fallback?: React.ReactNode
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate action={action} fallback={fallback}>
        <Component {...props} />
      </PermissionGate>
    )
  }
}

// Hook for conditional rendering in components
export const useConditionalRender = () => {
  const { canPerformAction, isAuthenticated } = useUserPermissions()

  const renderIf = (
    condition: boolean | (() => boolean),
    component: React.ReactNode
  ): React.ReactNode => {
    const shouldRender = typeof condition === 'function' ? condition() : condition
    return shouldRender ? component : null
  }

  const renderIfAuth = (component: React.ReactNode): React.ReactNode => {
    return renderIf(isAuthenticated, component)
  }

  const renderIfPermission = (
    action: 'sell_tickets' | 'work_events' | 'manage_events' | 'create_events',
    component: React.ReactNode
  ): React.ReactNode => {
    return renderIf(() => canPerformAction(action), component)
  }

  return {
    renderIf,
    renderIfAuth,
    renderIfPermission
  }
}