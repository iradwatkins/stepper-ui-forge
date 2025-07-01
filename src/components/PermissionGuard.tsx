/**
 * Permission Guard Component for Epic 4.0 role-based access control
 * 
 * This component provides declarative permission checking for UI elements
 * and can conditionally render content based on team member permissions
 */

import React from 'react'
import { AlertCircle, Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { useTeamPermissions, Permission } from '@/lib/hooks/useTeamPermissions'

interface PermissionGuardProps {
  eventId: string
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean // If true, requires ALL permissions; if false, requires ANY permission
  fallback?: React.ReactNode
  showFallback?: boolean
  loading?: React.ReactNode
  children: React.ReactNode
}

/**
 * Permission Guard component for conditional rendering based on team permissions
 */
export function PermissionGuard({
  eventId,
  permission,
  permissions = [],
  requireAll = true,
  fallback,
  showFallback = true,
  loading,
  children
}: PermissionGuardProps) {
  const teamPermissions = useTeamPermissions({ eventId })

  // Determine which permissions to check
  const permissionsToCheck = permission ? [permission] : permissions

  if (teamPermissions.loading) {
    if (loading) return <>{loading}</>
    
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="w-4 h-4 bg-muted rounded-full"></div>
          <span className="text-muted-foreground">Checking permissions...</span>
        </div>
      </div>
    )
  }

  if (teamPermissions.error) {
    return (
      <Alert className="border-destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load permissions: {teamPermissions.error}
        </AlertDescription>
      </Alert>
    )
  }

  // Check permissions
  let hasAccess = false
  if (permissionsToCheck.length === 0) {
    // No specific permissions required, just check if user is team member or owner
    hasAccess = teamPermissions.isTeamMember || teamPermissions.isEventOwner
  } else if (requireAll) {
    hasAccess = teamPermissions.hasAllPermissions(permissionsToCheck)
  } else {
    hasAccess = teamPermissions.hasAnyPermission(permissionsToCheck)
  }

  if (hasAccess) {
    return <>{children}</>
  }

  // User doesn't have access
  if (!showFallback) {
    return null
  }

  if (fallback) {
    return <>{fallback}</>
  }

  // Default fallback UI
  return (
    <Card className="border-muted">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <Lock className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          Access Restricted
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          You don't have permission to view this content. 
          {permissionsToCheck.length > 0 && (
            <span className="block mt-1">
              Required: {permissionsToCheck.join(', ').replace(/_/g, ' ')}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Higher-order component for wrapping components with permission checks
 */
export function withPermissions<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  eventIdProp: keyof P,
  requiredPermissions: Permission[],
  requireAll = true
) {
  return function PermissionWrappedComponent(props: P) {
    const eventId = props[eventIdProp] as string

    return (
      <PermissionGuard
        eventId={eventId}
        permissions={requiredPermissions}
        requireAll={requireAll}
      >
        <WrappedComponent {...props} />
      </PermissionGuard>
    )
  }
}

/**
 * Permission-aware button component
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  eventId: string
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  children: React.ReactNode
}

export function PermissionButton({
  eventId,
  permission,
  permissions = [],
  requireAll = true,
  children,
  disabled,
  ...buttonProps
}: PermissionButtonProps) {
  const teamPermissions = useTeamPermissions({ eventId })
  
  const permissionsToCheck = permission ? [permission] : permissions
  let hasAccess = false
  
  if (permissionsToCheck.length === 0) {
    hasAccess = teamPermissions.isTeamMember || teamPermissions.isEventOwner
  } else if (requireAll) {
    hasAccess = teamPermissions.hasAllPermissions(permissionsToCheck)
  } else {
    hasAccess = teamPermissions.hasAnyPermission(permissionsToCheck)
  }

  const isDisabled = disabled || teamPermissions.loading || !hasAccess

  return (
    <button
      {...buttonProps}
      disabled={isDisabled}
      title={!hasAccess ? 'Insufficient permissions' : buttonProps.title}
    >
      {children}
    </button>
  )
}

/**
 * Component for displaying user's current role and permissions
 */
interface RoleDisplayProps {
  eventId: string
  showPermissions?: boolean
  className?: string
}

export function RoleDisplay({ eventId, showPermissions = false, className }: RoleDisplayProps) {
  const teamPermissions = useTeamPermissions({ eventId })

  if (teamPermissions.loading) {
    return <div className={`animate-pulse bg-muted rounded h-6 w-24 ${className}`} />
  }

  if (!teamPermissions.isTeamMember && !teamPermissions.isEventOwner) {
    return (
      <span className={`text-muted-foreground text-sm ${className}`}>
        Not a team member
      </span>
    )
  }

  const roleDisplay = teamPermissions.isEventOwner 
    ? 'Event Owner' 
    : teamPermissions.userRole 
      ? teamPermissions.userRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'Team Member'

  return (
    <div className={className}>
      <span className="font-medium text-sm">{roleDisplay}</span>
      {showPermissions && teamPermissions.userRole && (
        <div className="text-xs text-muted-foreground mt-1">
          <details>
            <summary className="cursor-pointer">View permissions</summary>
            <div className="mt-2 space-y-1">
              {Object.entries(teamPermissions).map(([key, value]) => {
                if (key.startsWith('can') && typeof value === 'boolean') {
                  const permissionName = key
                    .replace('can', '')
                    .replace(/([A-Z])/g, ' $1')
                    .trim()
                    .toLowerCase()
                  
                  return (
                    <div key={key} className="flex justify-between">
                      <span>{permissionName}:</span>
                      <span className={value ? 'text-green-600' : 'text-red-600'}>
                        {value ? '✓' : '✗'}
                      </span>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}