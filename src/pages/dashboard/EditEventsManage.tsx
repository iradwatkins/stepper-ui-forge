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
  Edit,
  Trash2,
  Copy,
  Eye,
  Calendar,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Grid3X3,
  List
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { getEventImageUrl } from '@/lib/utils/imageUtils'

export default function EditEventsManage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<EventWithStats | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Load user's events
  useEffect(() => {
    const loadEvents = async () => {
      if (!user?.id) return
      
      try {
        setIsLoading(true)
        const userEvents = await EventsService.getUserEvents(user.id)
        // Debug: Log the first event to see image structure
        if (userEvents.length > 0) {
          console.log('EditEventsManage - First event data:', userEvents[0]);
          console.log('EditEventsManage - First event images:', userEvents[0].images);
        }
        setEvents(userEvents)
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

    loadEvents()
  }, [user?.id])

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
    if (!eventToDelete || !user?.id) return

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

  const handleDuplicateEvent = async (event: EventWithStats) => {
    if (!user?.id) return

    setIsDuplicating(true)
    try {
      const duplicatedEvent = await EventsService.duplicateEvent(event.id, user.id)
      if (duplicatedEvent) {
        // Refresh events list to include the new duplicate
        const userEvents = await EventsService.getUserEvents(user.id)
        setEvents(userEvents)
        toast({
          title: "Event duplicated",
          description: `"${event.title}" has been duplicated successfully.`,
        })
      }
    } catch (error) {
      console.error('Error duplicating event:', error)
      toast({
        title: "Error",
        description: "Failed to duplicate event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDuplicating(false)
    }
  }

  const handlePublishEvent = async (event: EventWithStats) => {
    setIsUpdatingStatus(true)
    try {
      const updatedEvent = await EventsService.publishEvent(event.id)
      if (updatedEvent) {
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: 'published', is_public: true } : e))
        toast({
          title: "Event published",
          description: `"${event.title}" is now live and visible to the public.`,
        })
      }
    } catch (error) {
      console.error('Error publishing event:', error)
      toast({
        title: "Error",
        description: "Failed to publish event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleUnpublishEvent = async (event: EventWithStats) => {
    setIsUpdatingStatus(true)
    try {
      const updatedEvent = await EventsService.unpublishEvent(event.id)
      if (updatedEvent) {
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: 'draft', is_public: false } : e))
        toast({
          title: "Event unpublished",
          description: `"${event.title}" is now a draft and hidden from public.`,
        })
      }
    } catch (error) {
      console.error('Error unpublishing event:', error)
      toast({
        title: "Error",
        description: "Failed to unpublish event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const openDeleteDialog = (event: EventWithStats) => {
    setEventToDelete(event)
    setDeleteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Events</h1>
          <p className="mt-2 text-gray-600">
            Select and edit your events with quick actions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Link to="/create-event">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Events ({filteredEvents.length})</CardTitle>
              <CardDescription>
                Manage and edit your events with quick actions
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search events..."
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
          {viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video overflow-hidden">
                    {(() => {
                      const imageUrl = getEventImageUrl(event, 'medium');
                      // Debug logging
                      if (!imageUrl && event.images) {
                        console.log('EditEventsManage - No image URL found for event:', event.title, 'Images data:', event.images);
                      }
                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                          No Image
                        </div>
                      );
                    })()}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Badge className={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                      <Badge variant="outline" className={getTypeColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                    </div>
                    <CardTitle className="line-clamp-2 text-base leading-tight">{event.title}</CardTitle>
                    <div className="text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString()} • {event.tickets_sold || 0} tickets sold
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Link to={event.event_type === 'premium' ? `/dashboard/events/premium/edit/${event.id}` : `/dashboard/events/edit/${event.id}`} className="flex-1">
                        <Button size="sm" className="w-full">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateEvent(event)}
                        disabled={isDuplicating}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(event)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {event.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePublishEvent(event)}
                          disabled={isUpdatingStatus}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Publish
                        </Button>
                      )}
                      {event.status === 'published' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUnpublishEvent(event)}
                          disabled={isUpdatingStatus}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Unpublish
                        </Button>
                      )}
                      <Link to={`/events/${event.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden">
                          {(() => {
                            const imageUrl = getEventImageUrl(event, 'thumbnail');
                            // Debug logging
                            if (!imageUrl && event.images) {
                              console.log('EditEventsManage List - No image URL found for event:', event.title, 'Images data:', event.images);
                            }
                            return imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                                No Image
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getStatusColor(event.status)}>
                              {event.status}
                            </Badge>
                            <Badge variant="outline" className={getTypeColor(event.event_type)}>
                              {event.event_type}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-lg">{event.title}</h3>
                          <div className="text-sm text-gray-500">
                            {new Date(event.date).toLocaleDateString()} • {event.tickets_sold || 0} tickets sold • ${(event.total_revenue || 0).toLocaleString()} revenue
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={event.event_type === 'premium' ? `/dashboard/events/premium/edit/${event.id}` : `/dashboard/events/edit/${event.id}`}>
                          <Button size="sm">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateEvent(event)}
                          disabled={isDuplicating}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </Button>
                        {event.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePublishEvent(event)}
                            disabled={isUpdatingStatus}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Publish
                          </Button>
                        )}
                        {event.status === 'published' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnpublishEvent(event)}
                            disabled={isUpdatingStatus}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Unpublish
                          </Button>
                        )}
                        <Link to={`/events/${event.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(event)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-500 mb-4">
                {events.length === 0 
                  ? "You haven't created any events yet." 
                  : "No events match your current filters."
                }
              </p>
              <Link to="/create-event">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Event
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Event
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{eventToDelete?.title}"</strong>? 
              This action cannot be undone and will permanently remove the event and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete Event'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}