import { useState } from 'react';
import { UseFormReturn } from "react-hook-form";
import { EventFormData } from "@/types/event-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Plus, 
  UserPlus, 
  Shield, 
  QrCode,
  Info,
  X,
  Mail,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface TeamConfigData {
  skipped: boolean;
  invites: TeamMemberInvite[];
  totalInvites?: number;
}

interface TeamManagementWizardProps {
  form: UseFormReturn<EventFormData>;
  eventType: 'simple' | 'ticketed' | 'premium' | '';
  onTeamConfigured?: (teamData: TeamConfigData) => void;
}

interface TeamMemberInvite {
  id: string;
  email: string;
  role: 'team_member' | 'organizer' | 'admin';
  permissions: {
    canManageTickets: boolean;
    canCheckIn: boolean;
    canViewAnalytics: boolean;
    canManageTeam: boolean;
  };
}

const defaultRoles = {
  team_member: {
    name: 'Team Member',
    description: 'Basic event support with check-in access',
    permissions: {
      canManageTickets: false,
      canCheckIn: true,
      canViewAnalytics: false,
      canManageTeam: false
    }
  },
  organizer: {
    name: 'Co-Organizer',
    description: 'Full event management capabilities',
    permissions: {
      canManageTickets: true,
      canCheckIn: true,
      canViewAnalytics: true,
      canManageTeam: true
    }
  },
  admin: {
    name: 'Event Admin',
    description: 'Complete control over event and team',
    permissions: {
      canManageTickets: true,
      canCheckIn: true,
      canViewAnalytics: true,
      canManageTeam: true
    }
  }
};

export const TeamManagementWizard = ({ form, eventType, onTeamConfigured }: TeamManagementWizardProps) => {
  const [teamInvites, setTeamInvites] = useState<TeamMemberInvite[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<keyof typeof defaultRoles>('team_member');
  const [isSkipped, setIsSkipped] = useState(false);

  const handleAddTeamMember = () => {
    if (!newMemberEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMemberEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (teamInvites.some(invite => invite.email === newMemberEmail)) {
      toast.error('This email is already invited');
      return;
    }

    const newInvite: TeamMemberInvite = {
      id: `invite-${Date.now()}`,
      email: newMemberEmail,
      role: newMemberRole,
      permissions: defaultRoles[newMemberRole].permissions
    };

    setTeamInvites(prev => [...prev, newInvite]);
    setNewMemberEmail('');
    toast.success('Team member added to invite list');
  };

  const handleRemoveInvite = (id: string) => {
    setTeamInvites(prev => prev.filter(invite => invite.id !== id));
  };

  const handleRoleChange = (id: string, newRole: keyof typeof defaultRoles) => {
    setTeamInvites(prev => prev.map(invite => 
      invite.id === id 
        ? { ...invite, role: newRole, permissions: defaultRoles[newRole].permissions }
        : invite
    ));
  };

  const handleSkipStep = () => {
    setIsSkipped(true);
    if (onTeamConfigured) {
      onTeamConfigured({ skipped: true, invites: [] });
    }
    toast.success('Team management skipped - you can add team members later');
  };

  const handleSaveTeamConfig = () => {
    const teamConfig = {
      skipped: false,
      invites: teamInvites,
      totalInvites: teamInvites.length
    };

    if (onTeamConfigured) {
      onTeamConfigured(teamConfig);
    }

    if (teamInvites.length > 0) {
      toast.success(`${teamInvites.length} team member${teamInvites.length !== 1 ? 's' : ''} will be invited after event creation`);
    } else {
      toast.success('Team configuration saved');
    }
  };

  if (eventType === 'simple') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Team Management Setup</h2>
        <p className="text-muted-foreground">
          Invite team members to help manage your {eventType} event
        </p>
      </div>

      {!isSkipped ? (
        <>
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Overview
              </CardTitle>
              <CardDescription>
                Set up your event team with different roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <UserPlus className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{teamInvites.length}</div>
                  <div className="text-sm text-muted-foreground">Team Invites</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <QrCode className="w-6 h-6 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold">
                    {teamInvites.filter(i => i.permissions.canCheckIn).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Check-in Staff</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Shield className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold">
                    {teamInvites.filter(i => i.role === 'organizer' || i.role === 'admin').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Organizers</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Team Member */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Team Member
              </CardTitle>
              <CardDescription>
                Invite team members by email with specific roles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="member-email">Email Address</Label>
                  <Input
                    id="member-email"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTeamMember()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-role">Role</Label>
                  <Select value={newMemberRole} onValueChange={(value: keyof typeof defaultRoles) => setNewMemberRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(defaultRoles).map(([key, role]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{role.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {Object.values(role.permissions).filter(Boolean).length} permissions
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddTeamMember} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </div>

              {/* Role Descriptions */}
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium mb-2">Role: {defaultRoles[newMemberRole].name}</h4>
                <p className="text-sm text-muted-foreground mb-3">{defaultRoles[newMemberRole].description}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(defaultRoles[newMemberRole].permissions).map(([key, enabled]) => (
                    <Badge key={key} variant={enabled ? "default" : "secondary"}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Member List */}
          {teamInvites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Invites ({teamInvites.length})
                </CardTitle>
                <CardDescription>
                  Team members will be invited after the event is created
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{invite.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {defaultRoles[invite.role].name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={invite.role} 
                        onValueChange={(value: keyof typeof defaultRoles) => handleRoleChange(invite.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(defaultRoles).map(([key, role]) => (
                            <SelectItem key={key} value={key}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveInvite(invite.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleSkipStep} variant="outline" className="flex-1">
              <Clock className="w-4 h-4 mr-2" />
              Skip For Now
            </Button>
            <Button onClick={handleSaveTeamConfig} className="flex-1">
              <CheckCircle className="w-4 h-4 mr-2" />
              {teamInvites.length > 0 ? `Save Team Config (${teamInvites.length} invites)` : 'Continue Without Team'}
            </Button>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Team invitations will be sent after your event is published. You can also manage your team later from the dashboard.
            </AlertDescription>
          </Alert>
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-semibold mb-2">Team Management Skipped</h3>
            <p className="text-muted-foreground mb-4">
              You can add team members later from your dashboard
            </p>
            <Button onClick={() => setIsSkipped(false)} variant="outline">
              Set Up Team Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};