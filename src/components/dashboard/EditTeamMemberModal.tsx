import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Save, 
  User, 
  Shield, 
  Clock, 
  AlertCircle,
  UserCheck,
  Headphones,
  Building,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Settings
} from 'lucide-react';
import { TeamService, TeamMember, TeamRole } from '@/lib/services/TeamService';

const teamMemberSchema = z.object({
  role: z.enum(['event_manager', 'check_in_staff', 'customer_service', 'security', 'vendor_coordinator']),
  notes: z.string().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  shiftStart: z.string().optional(),
  shiftEnd: z.string().optional(),
  permissions: z.object({
    view_event: z.boolean(),
    edit_event: z.boolean(),
    manage_team: z.boolean(),
    view_analytics: z.boolean(),
    check_in_tickets: z.boolean(),
    view_attendees: z.boolean(),
    manage_seating: z.boolean(),
    handle_refunds: z.boolean(),
  }),
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    checkInAlerts: z.boolean(),
    teamUpdates: z.boolean()
  })
});

type TeamMemberFormData = z.infer<typeof teamMemberSchema>;

interface EditTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMember: TeamMember | null;
  eventId: string;
  onUpdate: (updatedMember: TeamMember) => void;
}

export function EditTeamMemberModal({ 
  isOpen, 
  onClose, 
  teamMember, 
  eventId,
  onUpdate 
}: EditTeamMemberModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('role');

  const form = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      role: 'check_in_staff',
      notes: '',
      phone: '',
      emergencyContact: '',
      shiftStart: '',
      shiftEnd: '',
      permissions: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: false,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: false,
        handle_refunds: false,
      },
      notifications: {
        email: true,
        sms: false,
        checkInAlerts: true,
        teamUpdates: true
      }
    }
  });

  useEffect(() => {
    if (teamMember) {
      form.reset({
        role: teamMember.role_type,
        notes: teamMember.notes || '',
        phone: teamMember.phone || '',
        emergencyContact: teamMember.emergency_contact || '',
        shiftStart: teamMember.shift_start || '',
        shiftEnd: teamMember.shift_end || '',
        permissions: teamMember.permissions || getDefaultPermissions(teamMember.role_type),
        notifications: teamMember.notifications || {
          email: true,
          sms: false,
          checkInAlerts: true,
          teamUpdates: true
        }
      });
    }
  }, [teamMember, form]);

  const getDefaultPermissions = (role: TeamRole) => {
    const permissions = {
      event_manager: {
        view_event: true,
        edit_event: true,
        manage_team: true,
        view_analytics: true,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: true,
        handle_refunds: true
      },
      check_in_staff: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: false,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: false,
        handle_refunds: false
      },
      customer_service: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: false,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: false,
        handle_refunds: true
      },
      security: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: true,
        check_in_tickets: true,
        view_attendees: true,
        manage_seating: false,
        handle_refunds: false
      },
      vendor_coordinator: {
        view_event: true,
        edit_event: false,
        manage_team: false,
        view_analytics: false,
        check_in_tickets: false,
        view_attendees: false,
        manage_seating: true,
        handle_refunds: false
      }
    };
    return permissions[role] || permissions.check_in_staff;
  };

  const handleRoleChange = (newRole: TeamRole) => {
    form.setValue('role', newRole);
    // Update permissions based on role
    const defaultPerms = getDefaultPermissions(newRole);
    form.setValue('permissions', defaultPerms);
  };

  const getRoleIcon = (role: TeamRole) => {
    const icons = {
      event_manager: Shield,
      check_in_staff: UserCheck,
      customer_service: Headphones,
      security: Shield,
      vendor_coordinator: Building
    };
    const Icon = icons[role] || User;
    return <Icon className="w-4 h-4" />;
  };

  const getRoleDisplayName = (role: TeamRole): string => {
    const names = {
      event_manager: 'Event Manager',
      check_in_staff: 'Check-in Staff',
      customer_service: 'Customer Service',
      security: 'Security',
      vendor_coordinator: 'Vendor Coordinator'
    };
    return names[role] || role;
  };

  const handleSubmit = async (data: TeamMemberFormData) => {
    if (!teamMember) return;

    setIsSaving(true);
    try {
      // Update team member via service
      const result = await TeamService.updateTeamMember(eventId, teamMember.user_id, {
        role_type: data.role,
        notes: data.notes,
        phone: data.phone,
        emergency_contact: data.emergencyContact,
        shift_start: data.shiftStart,
        shift_end: data.shiftEnd,
        permissions: data.permissions,
        notifications: data.notifications
      });

      if (result.success && result.data) {
        toast.success('Team member updated successfully');
        onUpdate(result.data);
        onClose();
      } else {
        throw new Error(result.error || 'Failed to update team member');
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      toast.error('Failed to update team member');
    } finally {
      setIsSaving(false);
    }
  };

  if (!teamMember) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>
            Update role, permissions, and settings for {teamMember.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="role">Role</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="role" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label>Current Role</Label>
                  <Select
                    value={form.watch('role')}
                    onValueChange={(value: TeamRole) => handleRoleChange(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event_manager">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Event Manager
                        </div>
                      </SelectItem>
                      <SelectItem value="check_in_staff">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4" />
                          Check-in Staff
                        </div>
                      </SelectItem>
                      <SelectItem value="customer_service">
                        <div className="flex items-center gap-2">
                          <Headphones className="w-4 h-4" />
                          Customer Service
                        </div>
                      </SelectItem>
                      <SelectItem value="security">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Security
                        </div>
                      </SelectItem>
                      <SelectItem value="vendor_coordinator">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Vendor Coordinator
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes about this team member..."
                    {...form.register('notes')}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      {...form.register('phone')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      placeholder="Emergency phone number"
                      {...form.register('emergencyContact')}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Permissions control what this team member can do within the event
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>View Event Details</Label>
                      <p className="text-sm text-muted-foreground">Can view event information</p>
                    </div>
                    <Switch
                      checked={form.watch('permissions.view_event')}
                      onCheckedChange={(checked) => form.setValue('permissions.view_event', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Edit Event</Label>
                      <p className="text-sm text-muted-foreground">Can modify event details</p>
                    </div>
                    <Switch
                      checked={form.watch('permissions.edit_event')}
                      onCheckedChange={(checked) => form.setValue('permissions.edit_event', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Manage Team</Label>
                      <p className="text-sm text-muted-foreground">Can add/remove team members</p>
                    </div>
                    <Switch
                      checked={form.watch('permissions.manage_team')}
                      onCheckedChange={(checked) => form.setValue('permissions.manage_team', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>View Analytics</Label>
                      <p className="text-sm text-muted-foreground">Can access event analytics</p>
                    </div>
                    <Switch
                      checked={form.watch('permissions.view_analytics')}
                      onCheckedChange={(checked) => form.setValue('permissions.view_analytics', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Check-in Tickets</Label>
                      <p className="text-sm text-muted-foreground">Can scan and check-in attendees</p>
                    </div>
                    <Switch
                      checked={form.watch('permissions.check_in_tickets')}
                      onCheckedChange={(checked) => form.setValue('permissions.check_in_tickets', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>View Attendees</Label>
                      <p className="text-sm text-muted-foreground">Can see attendee list</p>
                    </div>
                    <Switch
                      checked={form.watch('permissions.view_attendees')}
                      onCheckedChange={(checked) => form.setValue('permissions.view_attendees', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Manage Seating</Label>
                      <p className="text-sm text-muted-foreground">Can assign and modify seating</p>
                    </div>
                    <Switch
                      checked={form.watch('permissions.manage_seating')}
                      onCheckedChange={(checked) => form.setValue('permissions.manage_seating', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Handle Refunds</Label>
                      <p className="text-sm text-muted-foreground">Can process ticket refunds</p>
                    </div>
                    <Switch
                      checked={form.watch('permissions.handle_refunds')}
                      onCheckedChange={(checked) => form.setValue('permissions.handle_refunds', checked)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Set working hours for this team member during the event
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shiftStart">Shift Start Time</Label>
                    <Input
                      id="shiftStart"
                      type="time"
                      {...form.register('shiftStart')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shiftEnd">Shift End Time</Label>
                    <Input
                      id="shiftEnd"
                      type="time"
                      {...form.register('shiftEnd')}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Configure how this team member receives updates
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                    <Switch
                      checked={form.watch('notifications.email')}
                      onCheckedChange={(checked) => form.setValue('notifications.email', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive updates via SMS</p>
                    </div>
                    <Switch
                      checked={form.watch('notifications.sms')}
                      onCheckedChange={(checked) => form.setValue('notifications.sms', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Check-in Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified of check-in activity</p>
                    </div>
                    <Switch
                      checked={form.watch('notifications.checkInAlerts')}
                      onCheckedChange={(checked) => form.setValue('notifications.checkInAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Team Updates</Label>
                      <p className="text-sm text-muted-foreground">Receive team announcements</p>
                    </div>
                    <Switch
                      checked={form.watch('notifications.teamUpdates')}
                      onCheckedChange={(checked) => form.setValue('notifications.teamUpdates', checked)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}