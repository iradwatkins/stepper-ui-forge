import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { EventsService } from '@/lib/events-db'
import { EventWithStats, ImageMetadata } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Archive,
  RotateCcw
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

export default function AdminEvents() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<EventWithStats | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Load all events from the platform (admin view)
  useEffect(() => {
    const loadAllEvents = async () => {
      try {
        setIsLoading(true)
        // For admin view, get all events from all users across the platform
        const allEvents = await EventsService.getAllEvents(100, 0)
        console.log('Loaded all platform events:', allEvents)
        setEvents(allEvents)
      } catch (error) {
        console.error('Error loading events:', error)
        toast({
          title: "Error",
          description: "Failed to load events. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadAllEvents()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'simple':
        return 'bg-gray-100 text-gray-800'
      case 'ticketed':
        return 'bg-blue-100 text-blue-800'
      case 'premium':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.organization_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter
    const matchesType = typeFilter === 'all' || event.event_type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return

    setIsDeleting(true)
    try {
      await EventsService.deleteEvent(eventToDelete.id)
      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id))
      toast({
        title: "Event deleted",
        description: `"${eventToDelete.title}" has been successfully deleted.`,
      })
    } catch (error) {
      console.error('Error deleting event:', error)
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setEventToDelete(null)
    }
  }

  const handleStatusChange = async (event: EventWithStats, newStatus: 'published' | 'draft' | 'completed' | 'cancelled') => {
    setIsUpdating(true)
    try {
      const updatedEvent = await EventsService.updateEvent(event.id, { status: newStatus })
      if (updatedEvent) {
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: newStatus } : e))
        toast({
          title: "Status updated",
          description: `Event status changed to ${newStatus}.`,
        })
      }
    } catch (error) {
      console.error('Error updating event status:', error)
      toast({
        title: "Error",
        description: "Failed to update event status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const openDeleteDialog = (event: EventWithStats) => {
    setEventToDelete(event)
    setDeleteDialogOpen(true)
  }

  const AdminEventActions = ({ event }: { event: EventWithStats }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to={`/events/${event.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View Event
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/dashboard/events/edit/${event.id}`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Event
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Status Changes</DropdownMenuLabel>
        {event.status !== 'published' && (
          <DropdownMenuItem 
            onClick={() => handleStatusChange(event, 'published')}
            disabled={isUpdating}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Publish
          </DropdownMenuItem>
        )}
        {event.status === 'published' && (
          <DropdownMenuItem 
            onClick={() => handleStatusChange(event, 'draft')}
            disabled={isUpdating}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Unpublish
          </DropdownMenuItem>
        )}
        {event.status !== 'completed' && (
          <DropdownMenuItem 
            onClick={() => handleStatusChange(event, 'completed')}
            disabled={isUpdating}
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-red-600" 
          onClick={() => openDeleteDialog(event)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Force Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading platform events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Events</h1>
          <p className="mt-2 text-gray-600">
            Manage all events across the platform (Admin View)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all organizers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Events</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.status === 'published').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently live
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.reduce((sum, event) => sum + (event.attendee_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Platform-wide
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${events.reduce((sum, event) => sum + (event.total_revenue || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Platform revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Platform Events</CardTitle>
              <CardDescription>
                Complete list of events across all organizers with admin controls.
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search events or organizers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="ticketed">Ticketed</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({filteredEvents.length})</TabsTrigger>
              <TabsTrigger value="published">
                Published ({filteredEvents.filter(e => e.status === 'published').length})
              </TabsTrigger>
              <TabsTrigger value="draft">
                Drafts ({filteredEvents.filter(e => e.status === 'draft').length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({filteredEvents.filter(e => e.status === 'completed').length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Tickets Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="w-12 h-12 rounded-lg overflow-hidden border">
                          {event.images && (event.images as Record<string, ImageMetadata>)?.banner?.url ? (
                            <img
                              src={(event.images as Record<string, ImageMetadata>).banner.url}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          ) : event.images && (event.images as Record<string, ImageMetadata>)?.postcard?.url ? (
                            <img
                              src={(event.images as Record<string, ImageMetadata>).postcard.url}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-gray-500">
                          Created {new Date(event.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{event.organization_name || 'Unknown'}</div>
                      </TableCell>
                      <TableCell>
                        {new Date(event.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(event.status)}>
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTypeColor(event.event_type)}>
                          {event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {event.tickets_sold || 0}/{event.ticket_types?.reduce((sum, tt) => sum + (tt.quantity || 0), 0) || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(event.total_revenue || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <AdminEventActions event={event} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Force Delete Event (Admin)
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>"{eventToDelete?.title}"</strong>? 
              This is an admin override that will permanently remove the event and all associated data.
              <br /><br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Force Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}