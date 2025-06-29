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
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  Calendar,
  Users,
  DollarSign
} from 'lucide-react'

export default function EventsManagement() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load real events from database
  useEffect(() => {
    const loadEvents = async () => {
      if (!user?.id) return
      
      try {
        setIsLoading(true)
        const userEvents = await EventsService.getUserEvents(user.id)
        console.log('Loaded real events:', userEvents)
        setEvents(userEvents)
      } catch (error) {
        console.error('Error loading events:', error)
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

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const EventActions = ({ event }: { event: EventWithStats }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>
          <Eye className="mr-2 h-4 w-4" />
          View Event
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          Edit Event
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate Event
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Event
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="mt-2 text-gray-600">
            Manage all your events from one place
          </p>
        </div>
        <Link to="/create-event">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </Link>
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
              +2 from last month
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
              +180 from last month
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
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
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
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Events</CardTitle>
              <CardDescription>
                A list of all your events and their current status.
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
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({events.length})</TabsTrigger>
              <TabsTrigger value="published">
                Published ({events.filter(e => e.status === 'published').length})
              </TabsTrigger>
              <TabsTrigger value="draft">
                Drafts ({events.filter(e => e.status === 'draft').length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({events.filter(e => e.status === 'completed').length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Event</TableHead>
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
                        <EventActions event={event} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}