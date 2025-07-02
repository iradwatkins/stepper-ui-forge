import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { EventsService } from '@/lib/events-db'
import { EventWithStats } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Archive,
  Eye,
  RotateCcw,
  Trash2,
  MoreVertical,
  Search,
  Calendar,
  MapPin,
  Users,
  DollarSign
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ArchivedEvents() {
  const { user } = useAuth()
  const [archivedEvents, setArchivedEvents] = useState<EventWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadArchivedEvents()
  }, [user?.id])

  const loadArchivedEvents = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const archivedEvents = await EventsService.getArchivedEvents(user.id)
      setArchivedEvents(archivedEvents)
    } catch (error) {
      console.error('Error loading archived events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestoreEvent = async (eventId: string) => {
    try {
      await EventsService.updateEvent(eventId, { status: 'draft' })
      // Remove from archived list
      setArchivedEvents(prev => prev.filter(event => event.id !== eventId))
    } catch (error) {
      console.error('Error restoring event:', error)
    }
  }

  const handlePermanentDelete = async (eventId: string) => {
    try {
      await EventsService.deleteEvent(eventId)
      setArchivedEvents(prev => prev.filter(event => event.id !== eventId))
    } catch (error) {
      console.error('Error permanently deleting event:', error)
    }
  }

  const filteredEvents = archivedEvents.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Archived Events</h1>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Archived Events</h1>
          <p className="text-muted-foreground">
            View and manage your completed or archived events
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search archived events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No archived events</h3>
            <p className="text-muted-foreground">
              You don't have any archived events yet. Completed events will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Archived</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium flex items-center">
                        {event.title}
                        <Badge variant="outline" className="ml-2 text-xs">
                          Archived
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {event.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      <div>
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                      {event.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                        {event.stats.attendees}/{event.stats.total_tickets}
                      </div>
                      <div className="text-muted-foreground">
                        {((event.stats.attendees / event.stats.total_tickets) * 100).toFixed(1)}% attendance
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm font-medium">
                      <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                      ${event.stats.revenue.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(event.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/events/${event.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRestoreEvent(event.id)}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore Event
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handlePermanentDelete(event.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}