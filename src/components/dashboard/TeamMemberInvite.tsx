import React, { useState } from 'react'
import { Check, Mail, User, Shield, UserCheck, Headphones, Building, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TeamService, TeamRole } from '@/lib/services/TeamService'

interface TeamMemberInviteProps {
  eventId: string
  onInviteSent?: () => void
  onCancel?: () => void
}

export function TeamMemberInvite({ eventId, onInviteSent, onCancel }: TeamMemberInviteProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'check_in_staff' as TeamRole,
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const roleOptions = [
    {
      value: 'check_in_staff' as TeamRole,
      label: 'Check-in Staff',
      description: 'Can scan tickets and manage attendee check-ins',
      icon: UserCheck,
      permissions: ['check_in_tickets', 'view_attendees']
    },
    {
      value: 'customer_service' as TeamRole,
      label: 'Customer Service',
      description: 'Can assist attendees and handle refunds',
      icon: Headphones,
      permissions: ['check_in_tickets', 'view_attendees', 'handle_refunds']
    },
    {
      value: 'security' as TeamRole,
      label: 'Security',
      description: 'Can monitor check-ins and view security analytics',
      icon: Shield,
      permissions: ['check_in_tickets', 'view_attendees', 'view_analytics']
    },
    {
      value: 'vendor_coordinator' as TeamRole,
      label: 'Vendor Coordinator',
      description: 'Can manage seating and vendor arrangements',
      icon: Building,
      permissions: ['manage_seating', 'view_event']
    },
    {
      value: 'event_manager' as TeamRole,
      label: 'Event Manager',
      description: 'Full access to event management and team coordination',
      icon: Shield,
      permissions: ['ALL_PERMISSIONS']
    }
  ]

  const selectedRoleOption = roleOptions.find(option => option.value === formData.role)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (!formData.email.trim()) {
      setError('Email address is required')
      setLoading(false)
      return
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (!formData.role) {
      setError('Please select a role for the team member')
      setLoading(false)
      return
    }

    try {
      const result = await TeamService.inviteTeamMember(
        eventId,
        formData.email.trim(),
        formData.role,
        formData.message.trim() || undefined
      )

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onInviteSent?.()
        }, 2000)
      } else {
        setError(result.error || 'Failed to send invitation')
      }
    } catch (err) {
      setError('Failed to send invitation. Please try again.')
      console.error('TeamMemberInvite.handleSubmit failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-green-900 mb-2">Invitation Sent!</h3>
        <p className="text-green-700 mb-4">
          Team invitation has been sent to {formData.email}
        </p>
        <p className="text-sm text-muted-foreground">
          They will receive an email with instructions to join your team.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            id="email"
            type="email"
            placeholder="team.member@example.com"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="pl-10"
            disabled={loading}
            required
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the email address of the person you want to invite to your team
        </p>
      </div>

      {/* Role Selection */}
      <div className="space-y-2">
        <Label htmlFor="role">Team Role</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => handleInputChange('role', value)}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((option) => {
              const Icon = option.icon
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Role Description */}
      {selectedRoleOption && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <selectedRoleOption.icon className="w-4 h-4" />
              <span>{selectedRoleOption.label}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="mb-3">
              {selectedRoleOption.description}
            </CardDescription>
            <div>
              <p className="text-sm font-medium mb-2">Permissions included:</p>
              <div className="flex flex-wrap gap-1">
                {selectedRoleOption.permissions.map((permission) => (
                  <span 
                    key={permission}
                    className="text-xs bg-muted px-2 py-1 rounded"
                  >
                    {permission === 'ALL_PERMISSIONS' 
                      ? 'All permissions' 
                      : permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                    }
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Message */}
      <div className="space-y-2">
        <Label htmlFor="message">Custom Message (Optional)</Label>
        <Textarea
          id="message"
          placeholder="Add a personal message to your invitation..."
          value={formData.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          className="min-h-[80px]"
          disabled={loading}
        />
        <p className="text-sm text-muted-foreground">
          This message will be included in the invitation email
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={loading || !formData.email || !formData.role}
          className="flex-1"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending Invitation...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </>
          )}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Invitation Details */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-sm">What happens next?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• The invited person will receive an email with an invitation link</li>
          <li>• They need to create an account or sign in to accept the invitation</li>
          <li>• Once accepted, they'll have access to their assigned role permissions</li>
          <li>• Invitations expire after 7 days if not accepted</li>
        </ul>
      </div>
    </form>
  )
}