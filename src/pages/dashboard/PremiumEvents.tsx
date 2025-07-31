import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { EventsService } from '@/lib/events-db'
import { EventWithStats } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Copy,
  Eye,
  Calendar,
  Users,
  DollarSign,
  Building2,
  Crown,
  Grid3X3,
  List,
  MapPin,
  Trash2,
  QrCode,
  BarChart3,
  CheckCircle,
  Info
} from 'lucide-react'
import { getEventImageUrl } from '@/lib/utils/imageUtils'
import { formatEventDate } from '@/lib/utils/dateUtils'
import { VenueService } from '@/lib/services/VenueService'

export default function PremiumEvents() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [venueLayouts, setVenueLayouts] = useState<Record<string, any>>({})

  // Load premium events
  useEffect(() => {
    const loadPremiumEvents = async () => {
      if (!user?.id) return
      
      try {
        setIsLoading(true)
        // Get all user events and filter for premium only
        const userEvents = await EventsService.getUserEvents(user.id)
        const premiumEvents = userEvents.filter(event => event.event_type === 'premium')
        
        // Load venue layouts for premium events
        const venueIds = [...new Set(premiumEvents.map(e => e.venue_layout_id).filter(Boolean))]
        const layouts: Record<string, any> = {}
        
        for (const venueId of venueIds) {
          if (venueId) {
            const layout = await VenueService.getVenueById(venueId)
            if (layout) {
              layouts[venueId] = layout
            }
          }
        }
        
        setVenueLayouts(layouts)
        setEvents(premiumEvents)
      } catch (error) {
        console.error('Error loading premium events:', error)
        toast.error('Failed to load premium events')
      } finally {
        setIsLoading(false)
      }
    }

    loadPremiumEvents()
  }, [user?.id])

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.venue_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

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

  const handleDuplicateEvent = async (event: EventWithStats) => {
    if (!user?.id) return

    try {
      const duplicatedEvent = await EventsService.duplicateEvent(event.id, user.id)
      if (duplicatedEvent) {
        const userEvents = await EventsService.getUserEvents(user.id)
        const premiumEvents = userEvents.filter(e => e.event_type === 'premium')
        setEvents(premiumEvents)
        toast.success(`"${event.title}" has been duplicated successfully.`)
      }
    } catch (error) {
      console.error('Error duplicating event:', error)
      toast.error('Failed to duplicate event')
    }
  }

  const handlePublishEvent = async (event: EventWithStats) => {
    try {
      const updatedEvent = await EventsService.publishEvent(event.id)
      if (updatedEvent) {
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: 'published', is_public: true } : e))
        toast.success(`"${event.title}" is now live!`)
      }
    } catch (error) {
      console.error('Error publishing event:', error)
      toast.error('Failed to publish event')
    }
  }

  const getSeatingStats = (event: EventWithStats) => {
    const venue = venueLayouts[event.venue_layout_id || '']
    if (!venue) return { totalSeats: 0, tables: 0 }

    const seats = venue.seats || []
    const totalSeats = seats.length
    const tables = new Set(seats.filter((s: any) => s.tableId).map((s: any) => s.tableId)).size

    return { totalSeats, tables }
  }

  const renderEventCard = (event: EventWithStats) => {
    const imageUrl = getEventImageUrl(event)
    const stats = getSeatingStats(event)

    return (
      <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
        {/* Event Image */}
        <div className="relative h-48 bg-gray-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="h-12 w-12 text-gray-400" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge className="bg-purple-600 text-white">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          </div>
          <div className="absolute bottom-2 left-2">
            <Badge className={getStatusColor(event.status)}>
              {event.status}
            </Badge>
          </div>
        </div>

        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-1">{event.title}</CardTitle>
              <CardDescription className="mt-1">
                <div className="flex items-center gap-1 text-sm">
                  <Calendar className="h-3 w-3" />
                  {formatEventDate(event.date, event.time)}
                </div>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <MapPin className="h-3 w-3" />
                  {event.venue_name || 'Venue TBD'}
                </div>
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/dashboard/events/premium/edit/${event.id}`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Event
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/events/${event.id}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Page
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/dashboard/events/${event.id}/check-in`)}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Check-in Management
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/dashboard/events/${event.id}/analytics`)}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDuplicateEvent(event)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                {event.status === 'draft' && (
                  <DropdownMenuItem onClick={() => handlePublishEvent(event)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Publish
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          {/* Seating Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            <div>
              <div className="text-2xl font-bold">{stats.totalSeats}</div>
              <div className="text-xs text-muted-foreground">Total Seats</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.tables}</div>
              <div className="text-xs text-muted-foreground">Tables</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{event.sold_tickets || 0}</div>
              <div className="text-xs text-muted-foreground">Sold</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => navigate(`/dashboard/events/premium/edit/${event.id}`)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit Seating
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/dashboard/events/${event.id}/analytics`)}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-8 w-8 text-purple-600" />
            Premium Events
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your premium events with table seating and VIP experiences
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/events/premium/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Premium Event
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Premium events feature assigned seating, table service, and enhanced attendee experiences. 
          Perfect for galas, weddings, corporate dinners, and VIP events.
        </AlertDescription>
      </Alert>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Crown className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{events.length}</div>
                <div className="text-sm text-muted-foreground">Premium Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {events.reduce((sum, e) => sum + getSeatingStats(e).totalSeats, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Seats</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {events.reduce((sum, e) => sum + getSeatingStats(e).tables, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Tables</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ${events.reduce((sum, e) => sum + (e.total_revenue || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search premium events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-1 border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List/Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading premium events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {events.length === 0 ? 'No premium events yet' : 'No events match your search'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {events.length === 0 
                ? 'Create your first premium event with table seating and VIP experiences'
                : 'Try adjusting your search criteria'
              }
            </p>
            {events.length === 0 && (
              <Button onClick={() => navigate('/dashboard/events/premium/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Premium Event
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(renderEventCard)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4">Event</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Venue</th>
                    <th className="text-center p-4">Seats</th>
                    <th className="text-center p-4">Tables</th>
                    <th className="text-center p-4">Sold</th>
                    <th className="text-center p-4">Status</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map(event => {
                    const stats = getSeatingStats(event)
                    return (
                      <tr key={event.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium">{event.title}</div>
                          <div className="text-sm text-muted-foreground">{event.organization_name}</div>
                        </td>
                        <td className="p-4 text-sm">
                          {formatEventDate(event.date, event.time)}
                        </td>
                        <td className="p-4 text-sm">
                          {event.venue_name || 'TBD'}
                        </td>
                        <td className="p-4 text-center">{stats.totalSeats}</td>
                        <td className="p-4 text-center">{stats.tables}</td>
                        <td className="p-4 text-center">{event.sold_tickets || 0}</td>
                        <td className="p-4 text-center">
                          <Badge className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/dashboard/events/premium/edit/${event.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/events/${event.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateEvent(event)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                {event.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handlePublishEvent(event)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Publish
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}