import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Calendar, FileTextIcon, Edit, Eye, MoreHorizontal, Trash2, Send } from 'lucide-react'
import { toast } from 'sonner'

interface DraftEvent {
  id: string
  title: string
  description: string | null
  date: string
  time: string
  location: string
  event_type: 'simple' | 'ticketed' | 'premium'
  organization_name: string | null
  max_attendees: number | null
  created_at: string
  updated_at: string
}

export default function DraftEvents() {
  const { user } = useAuth()
  const [events, setEvents] = useState<DraftEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!user) return
    loadDraftEvents()
  }, [user])

  const loadDraftEvents = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading draft events:', error)
        toast.error('Failed to load draft events')
        return
      }

      setEvents(data || [])
    } catch (error) {
      console.error('Error loading draft events:', error)
      toast.error('Failed to load draft events')
    } finally {
      setIsLoading(false)
    }
  }

  const publishEvent = async (eventId: string, eventTitle: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'published' })
        .eq('id', eventId)
        .eq('owner_id', user?.id)

      if (error) {
        console.error('Error publishing event:', error)
        toast.error('Failed to publish event')
        return
      }

      toast.success(`Event "${eventTitle}" has been published successfully!`)
      loadDraftEvents() // Refresh the list
    } catch (error) {
      console.error('Error publishing event:', error)
      toast.error('Failed to publish event')
    }
  }

  const deleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
      return
    }

    console.log('Attempting to delete event:', { eventId, eventTitle, userId: user?.id })

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('owner_id', user?.id)

      if (error) {
        console.error('Error deleting event:', error)
        toast.error(`Failed to delete event: ${error.message}`)
        return
      }

      console.log('Event deleted successfully:', eventId)
      toast.success(`Event "${eventTitle}" has been deleted successfully`)
      loadDraftEvents() // Refresh the list
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Failed to delete event')
    }
  }

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Draft Events</h1>
          <p className="mt-2 text-gray-600">
            Events that are saved but not yet published
          </p>
        </div>
        <Link to="/create-event">
          <Button>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Create New Event
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drafts</CardTitle>
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">
              Unpublished events
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Drafts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                return new Date(e.updated_at) > weekAgo
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Updated this week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Publish</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.title && e.date && e.location).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Complete drafts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Draft Events</CardTitle>
              <CardDescription>
                Events that are saved but not yet published
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search draft events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[300px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No draft events found matching your search.' : 'No draft events yet. Create your first event!'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{event.title}</div>
                          {event.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {event.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {new Date(event.date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {event.time}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px] truncate" title={event.location}>
                          {event.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(event.event_type)}>
                          {event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(event.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {event.max_attendees ? `${event.max_attendees} people` : 'Unlimited'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/dashboard/events/edit/${event.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Draft
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => publishEvent(event.id, event.title)}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Publish Event
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteEvent(event.id, event.title)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Draft
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}