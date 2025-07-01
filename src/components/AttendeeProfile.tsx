/**
 * Attendee Profile Component for Epic 4.0 check-in system
 * 
 * Displays detailed attendee information during check-in process
 * with role-based access control and action capabilities
 */

import React, { useState } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Ticket, 
  Check, 
  X, 
  AlertTriangle,
  MoreVertical,
  Edit,
  MessageSquare,
  RefreshCw,
  History
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PermissionGuard } from './PermissionGuard'

export interface AttendeeData {
  // Ticket information
  ticket_id: string
  qr_code: string
  status: 'active' | 'used' | 'refunded' | 'cancelled'
  
  // Attendee details
  holder_email: string
  holder_name: string | null
  holder_phone: string | null
  
  // Event information
  event_id: string
  event_title: string
  event_date: string
  event_time: string
  event_location: string
  
  // Ticket type
  ticket_type_name: string
  ticket_type_price: number
  
  // Check-in information
  checked_in_at: string | null
  checked_in_by: string | null
  checked_in_by_name: string | null
  
  // Additional metadata
  created_at: string
  order_id?: string
  notes?: string
  special_requirements?: string[]
}

interface AttendeeProfileProps {
  attendee: AttendeeData
  eventId: string
  onCheckIn?: (ticketId: string) => void
  onUpdate?: (ticketId: string, updates: Partial<AttendeeData>) => void
  onClose?: () => void
  mode?: 'full' | 'compact' | 'check-in'
  showActions?: boolean
}

export function AttendeeProfile({
  attendee,
  eventId,
  onCheckIn,
  onUpdate,
  onClose,
  mode = 'full',
  showActions = true
}: AttendeeProfileProps) {
  const [showNotes, setShowNotes] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'used': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'refunded': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Check className="w-4 h-4" />
      case 'used': return <Check className="w-4 h-4" />
      case 'refunded': return <RefreshCw className="w-4 h-4" />
      case 'cancelled': return <X className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleCheckIn = () => {
    if (onCheckIn && attendee.status === 'active' && !attendee.checked_in_at) {
      onCheckIn(attendee.ticket_id)
    }
  }

  if (mode === 'compact') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>
                {attendee.holder_name?.[0] || attendee.holder_email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium">
                {attendee.holder_name || 'Guest'}
              </div>
              <div className="text-sm text-muted-foreground">
                {attendee.holder_email}
              </div>
              <Badge className={`text-xs ${getStatusColor(attendee.status)}`}>
                {attendee.status.toUpperCase()}
              </Badge>
            </div>
            {showActions && (
              <PermissionGuard eventId={eventId} permission="check_in_tickets">
                <Button
                  size="sm"
                  onClick={handleCheckIn}
                  disabled={attendee.status !== 'active' || !!attendee.checked_in_at}
                >
                  Check In
                </Button>
              </PermissionGuard>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-lg">
                  {attendee.holder_name?.[0] || attendee.holder_email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">
                  {attendee.holder_name || 'Guest Attendee'}
                </CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{attendee.holder_email}</span>
                </CardDescription>
                {attendee.holder_phone && (
                  <CardDescription className="flex items-center space-x-2 mt-1">
                    <Phone className="w-4 h-4" />
                    <span>{attendee.holder_phone}</span>
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getStatusColor(attendee.status)} flex items-center space-x-1`}>
                {getStatusIcon(attendee.status)}
                <span>{attendee.status.toUpperCase()}</span>
              </Badge>
              {showActions && (
                <PermissionGuard eventId={eventId} permission="view_attendees">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowNotes(true)}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Add Note
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowHistory(true)}>
                        <History className="w-4 h-4 mr-2" />
                        View History
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <PermissionGuard eventId={eventId} permission="handle_refunds" showFallback={false}>
                        <DropdownMenuItem className="text-orange-600">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Process Refund
                        </DropdownMenuItem>
                      </PermissionGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </PermissionGuard>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Check-in Status */}
      {attendee.checked_in_at ? (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Checked in</strong> on {formatDate(attendee.checked_in_at)} at {formatTime(attendee.checked_in_at)}
            {attendee.checked_in_by_name && (
              <span> by {attendee.checked_in_by_name}</span>
            )}
          </AlertDescription>
        </Alert>
      ) : attendee.status === 'active' ? (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 flex items-center justify-between">
            <span><strong>Ready for check-in</strong> - Ticket is valid and active</span>
            {showActions && (
              <PermissionGuard eventId={eventId} permission="check_in_tickets" showFallback={false}>
                <Button onClick={handleCheckIn} size="sm">
                  Check In Now
                </Button>
              </PermissionGuard>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Cannot check in</strong> - Ticket status is {attendee.status}
          </AlertDescription>
        </Alert>
      )}

      {/* Details Tabs */}
      <Tabs defaultValue="ticket" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ticket">Ticket Details</TabsTrigger>
          <TabsTrigger value="event">Event Info</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="ticket" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Ticket className="w-5 h-5" />
                <span>Ticket Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ticket ID</label>
                  <div className="font-mono text-sm">{attendee.ticket_id}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Order ID</label>
                  <div className="font-mono text-sm">{attendee.order_id || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ticket Type</label>
                  <div>{attendee.ticket_type_name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Price</label>
                  <div className="font-medium">{formatPrice(attendee.ticket_type_price)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Purchase Date</label>
                  <div>{formatDate(attendee.created_at)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge className={getStatusColor(attendee.status)}>
                    {attendee.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {attendee.special_requirements && attendee.special_requirements.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Special Requirements</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attendee.special_requirements.map((requirement, index) => (
                      <Badge key={index} variant="outline">
                        {requirement}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="event" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Event Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Event</label>
                <div className="text-lg font-medium">{attendee.event_title}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(attendee.event_date)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Time</label>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{attendee.event_time}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Location</label>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{attendee.event_location}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>Activity History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-muted-foreground">{formatDate(attendee.created_at)}</span>
                  <span>Ticket purchased</span>
                </div>
                {attendee.checked_in_at && (
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">{formatDate(attendee.checked_in_at)}</span>
                    <span>Checked in{attendee.checked_in_by_name && ` by ${attendee.checked_in_by_name}`}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      {showActions && mode === 'full' && (
        <div className="flex justify-end space-x-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
          <PermissionGuard eventId={eventId} permission="check_in_tickets" showFallback={false}>
            {!attendee.checked_in_at && attendee.status === 'active' && (
              <Button onClick={handleCheckIn}>
                Check In Attendee
              </Button>
            )}
          </PermissionGuard>
        </div>
      )}
    </div>
  )
}