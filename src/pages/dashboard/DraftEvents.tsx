import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { EventsService } from '@/lib/events-db'
import { EventWithStats } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Edit3,
  Eye,
  Trash2,
  MoreVertical,
  Plus,
  Search,
  Calendar,
  MapPin,
  Users
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DraftEvents() {
  const { user } = useAuth()
  const [draftEvents, setDraftEvents] = useState<EventWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadDraftEvents()
  }, [user?.id])

  const loadDraftEvents = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      // Mock data for now - replace with actual service call
      const mockDrafts: EventWithStats[] = [
        {
          id: 'draft-1',
          title: 'Summer Music Festival',
          description: 'A celebration of local artists and musicians',
          date: '2024-08-15',
          time: '18:00',
          location: 'Central Park Amphitheater',
          status: 'draft',
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          event_type: 'ticketed',
          max_attendees: 500,
          stats: {
            total_tickets: 0,
            tickets_sold: 0,
            revenue: 0,
            attendees: 0
          }
        },
        {
          id: 'draft-2',
          title: 'Tech Conference 2024',
          description: 'Annual technology conference',
          date: '2024-09-20',
          time: '09:00',
          location: 'Convention Center',
          status: 'draft',
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          event_type: 'premium',
          max_attendees: 200,
          stats: {
            total_tickets: 0,
            tickets_sold: 0,
            revenue: 0,
            attendees: 0
          }
        }
      ]
      setDraftEvents(mockDrafts)
    } catch (error) {
      console.error('Error loading draft events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDraft = async (eventId: string) => {
    // Mock implementation
    setDraftEvents(prev => prev.filter(event => event.id !== eventId))
  }

  const filteredEvents = draftEvents.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Draft Events</h1>
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
          <h1 className="text-2xl font-bold tracking-tight">Draft Events</h1>
          <p className="text-muted-foreground">
            Manage your event drafts and continue editing
          </p>
        </div>
        <Link to="/create-event">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search draft events..."
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
            <Edit3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No draft events</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any draft events yet. Create your first event to get started.
            </p>
            <Link to="/create-event">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {event.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      <div>
                        <div>{new Date(event.date).toLocaleDateString()}</div>
                        <div className="text-muted-foreground">{event.time}</div>
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
                    <Badge variant="secondary" className="capitalize">
                      {event.event_type}
                    </Badge>
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
                          <Link to={`/create-event?edit=${event.id}`}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Continue Editing
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/events/${event.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteDraft(event.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Draft
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