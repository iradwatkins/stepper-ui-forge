import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Shield,
  UserCheck,
  Headphones,
  Building,
  Users,
  Info,
  Edit,
  Save
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface Permission {
  id: string
  name: string
  description: string
  category: 'event' | 'team' | 'analytics' | 'attendees' | 'financial'
}

interface Role {
  id: string
  name: string
  displayName: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  memberCount: number
  permissions: Record<string, boolean>
  isDefault: boolean
}

const PERMISSIONS: Permission[] = [
  { id: 'view_event', name: 'View Event', description: 'View basic event information', category: 'event' },
  { id: 'edit_event', name: 'Edit Event', description: 'Modify event details and settings', category: 'event' },
  { id: 'manage_team', name: 'Manage Team', description: 'Invite, remove, and manage team members', category: 'team' },
  { id: 'view_analytics', name: 'View Analytics', description: 'Access real-time analytics and reports', category: 'analytics' },
  { id: 'check_in_tickets', name: 'Check-in Tickets', description: 'Validate and check-in attendees', category: 'attendees' },
  { id: 'view_attendees', name: 'View Attendees', description: 'See attendee information and lists', category: 'attendees' },
  { id: 'manage_seating', name: 'Manage Seating', description: 'Modify seating arrangements', category: 'event' },
  { id: 'handle_refunds', name: 'Handle Refunds', description: 'Process refunds and payment issues', category: 'financial' }
]

export default function TeamRoles() {
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 'event_manager',
      name: 'event_manager',
      displayName: 'Event Manager',
      description: 'Full control over all event aspects and team management',
      icon: Shield,
      memberCount: 2,
      isDefault: true,
      permissions: {
        view_event: true,
        edit_event: true,
        manage_team: true,
        view_analytics: true,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: true,
        handle_refunds: true
      }
    },
    {
      id: 'check_in_staff',
      name: 'check_in_staff',
      displayName: 'Check-in Staff',
      description: 'Responsible for ticket validation and attendee check-in',
      icon: UserCheck,
      memberCount: 5,
      isDefault: true,
      permissions: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: false,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: false,
        handle_refunds: false
      }
    },
    {
      id: 'customer_service',
      name: 'customer_service',
      displayName: 'Customer Service',
      description: 'Handle customer inquiries and support requests',
      icon: Headphones,
      memberCount: 3,
      isDefault: true,
      permissions: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: false,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: false,
        handle_refunds: true
      }
    },
    {
      id: 'security',
      name: 'security',
      displayName: 'Security',
      description: 'Monitor security and handle safety-related issues',
      icon: Shield,
      memberCount: 2,
      isDefault: true,
      permissions: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: true,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: false,
        handle_refunds: false
      }
    },
    {
      id: 'vendor_coordinator',
      name: 'vendor_coordinator',
      displayName: 'Vendor Coordinator',
      description: 'Manage vendors and coordinate event logistics',
      icon: Building,
      memberCount: 1,
      isDefault: true,
      permissions: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: false,
        check_in_tickets: false,
        view_attendees: false,
        manage_seating: true,
        handle_refunds: false
      }
    }
  ])

  const [editingRole, setEditingRole] = useState<string | null>(null)

  const handlePermissionChange = (roleId: string, permissionId: string, enabled: boolean) => {
    setRoles(prev => prev.map(role => 
      role.id === roleId 
        ? { ...role, permissions: { ...role.permissions, [permissionId]: enabled } }
        : role
    ))
  }

  const getCategoryPermissions = (category: Permission['category']) => {
    return PERMISSIONS.filter(p => p.category === category)
  }

  const getPermissionCount = (role: Role) => {
    return Object.values(role.permissions).filter(Boolean).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            Configure team roles and their permissions for different event functions
          </p>
        </div>
        <Link to="/dashboard/team">
          <Button variant="outline">
            <Users className="w-4 h-4 mr-2" />
            View Team
          </Button>
        </Link>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Role permissions determine what team members can access and modify. 
          Changes apply to all team members with that role.
        </AlertDescription>
      </Alert>

      {/* Roles Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Team Roles Overview</CardTitle>
          <CardDescription>
            Current roles and their member counts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <role.icon className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{role.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      {role.memberCount} members • {getPermissionCount(role)} permissions
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingRole(editingRole === role.id ? null : role.id)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions Matrix</CardTitle>
          <CardDescription>
            Configure what each role can access and modify
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {['event', 'team', 'analytics', 'attendees', 'financial'].map((category) => (
              <div key={category}>
                <h3 className="font-medium mb-4 capitalize flex items-center">
                  {category} Permissions
                  <Badge variant="outline" className="ml-2 text-xs">
                    {getCategoryPermissions(category as Permission['category']).length}
                  </Badge>
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/3">Permission</TableHead>
                        {roles.map((role) => (
                          <TableHead key={role.id} className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <role.icon className="w-4 h-4" />
                              <span className="text-xs">{role.displayName}</span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCategoryPermissions(category as Permission['category']).map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{permission.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {permission.description}
                              </div>
                            </div>
                          </TableCell>
                          {roles.map((role) => (
                            <TableCell key={role.id} className="text-center">
                              <Switch
                                checked={role.permissions[permission.id] || false}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(role.id, permission.id, checked)
                                }
                                disabled={role.isDefault && role.id === 'event_manager' && permission.id === 'manage_team'}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>

          {/* Save Changes */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              Changes are saved automatically and apply immediately to all team members.
            </div>
            <Button>
              <Save className="w-4 h-4 mr-2" />
              Save All Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Role Details */}
      {editingRole && (
        <Card>
          <CardHeader>
            <CardTitle>
              {roles.find(r => r.id === editingRole)?.displayName} Details
            </CardTitle>
            <CardDescription>
              Detailed permissions and member information for this role
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const role = roles.find(r => r.id === editingRole)
              if (!role) return null
              
              return (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-2">Role Information</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Name:</strong> {role.displayName}</div>
                        <div><strong>Description:</strong> {role.description}</div>
                        <div><strong>Members:</strong> {role.memberCount}</div>
                        <div><strong>Permissions:</strong> {getPermissionCount(role)} of {PERMISSIONS.length}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Enabled Permissions</h4>
                      <div className="space-y-1">
                        {PERMISSIONS.filter(p => role.permissions[p.id]).map(permission => (
                          <Badge key={permission.id} variant="secondary" className="mr-1 mb-1">
                            {permission.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}