import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Search, Trash2, AlertTriangle, Database, Filter, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { AdminRoute } from '@/components/auth/AdminRoute'

interface DatabaseEvent {
  id: string
  title: string
  description: string | null
  organization_name: string | null
  date: string
  time: string
  location: string
  event_type: 'simple' | 'ticketed' | 'premium'
  status: 'draft' | 'published' | 'cancelled' | 'completed'
  categories: string[]
  owner_id: string
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string | null
    email: string
  }
}

interface DatabaseUser {
  id: string
  email: string
  full_name: string | null
  organization: string | null
  created_at: string
  last_sign_in_at: string | null
}

function DatabaseAdminContent() {
  const { user } = useAuth()
  const [events, setEvents] = useState<DatabaseEvent[]>([])
  const [users, setUsers] = useState<DatabaseUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedEvent, setSelectedEvent] = useState<DatabaseEvent | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadEvents(), loadUsers()])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load database data')
    } finally {
      setLoading(false)
    }
  }

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        profiles!events_owner_id_fkey (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading events:', error)
      throw error
    }

    setEvents(data || [])
  }

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, organization, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading users:', error)
      throw error
    }

    setUsers(data || [])
  }

  const deleteEvent = async (eventId: string) => {
    try {
      // First delete related records
      const { error: ticketTypesError } = await supabase
        .from('ticket_types')
        .delete()
        .eq('event_id', eventId)

      if (ticketTypesError) {
        console.error('Error deleting ticket types:', ticketTypesError)
        toast.error('Failed to delete related ticket types')
        return
      }

      const { error: teamMembersError } = await supabase
        .from('team_members')
        .delete()
        .eq('event_id', eventId)

      if (teamMembersError) {
        console.error('Error deleting team members:', teamMembersError)
        toast.error('Failed to delete related team members')
        return
      }

      // Then delete the event
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (eventError) {
        console.error('Error deleting event:', eventError)
        toast.error('Failed to delete event')
        return
      }

      toast.success('Event and related data deleted successfully')
      setIsDeleteDialogOpen(false)
      setSelectedEvent(null)
      loadEvents() // Refresh the list
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Failed to delete event')
    }
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || event.status === statusFilter
    const matchesType = typeFilter === 'all' || event.event_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
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

  const isDemoData = (event: DatabaseEvent) => {
    // Check for common demo/test data patterns
    const demoPatterns = [
      'Spring Art Exhibition',
      'Winter Networking Event',
      'Summer Music Festival',
      'Tech Conference 2024',
      'Food & Wine Expo',
      'Charity Gala',
      'Weekend Market'
    ]
    
    return demoPatterns.some(pattern => 
      event.title.includes(pattern) ||
      event.description?.includes(pattern)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading database data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Database Administration</h1>
          <p className="mt-2 text-gray-600">
            Manage database records and remove test/demo data
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <Database className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {/* Warning Alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Warning:</strong> This interface allows permanent deletion of database records. 
          Use with extreme caution. Deleted data cannot be recovered.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="events" className="space-y-6">
        <TabsList>
          <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Event Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="ticketed">Ticketed</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setTypeFilter('all')
                  }}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Events Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Events</CardTitle>
              <CardDescription>
                {filteredEvents.length} of {events.length} events shown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Demo Data</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? 'No events found matching your search.' : 'No events found.'}
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
                              {event.profiles?.full_name || 'Unknown'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {event.profiles?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(event.date).toLocaleDateString()}
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
                          <Badge className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isDemoData(event) ? (
                            <Badge variant="destructive">Demo Data</Badge>
                          ) : (
                            <Badge variant="outline">Real Data</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Event Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div><strong>ID:</strong> {event.id}</div>
                                  <div><strong>Title:</strong> {event.title}</div>
                                  <div><strong>Description:</strong> {event.description || 'None'}</div>
                                  <div><strong>Organization:</strong> {event.organization_name || 'None'}</div>
                                  <div><strong>Date:</strong> {event.date} at {event.time}</div>
                                  <div><strong>Location:</strong> {event.location}</div>
                                  <div><strong>Categories:</strong> {event.categories.join(', ') || 'None'}</div>
                                  <div><strong>Created:</strong> {new Date(event.created_at).toLocaleString()}</div>
                                  <div><strong>Updated:</strong> {new Date(event.updated_at).toLocaleString()}</div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(event)
                                setIsDeleteDialogOpen(true)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>
                All registered user accounts in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || 'Not provided'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.organization || 'None'}</TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this event? This action cannot be undone.
              All related data (ticket types, team members) will also be deleted.
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-2">
              <div><strong>Event:</strong> {selectedEvent.title}</div>
              <div><strong>Date:</strong> {selectedEvent.date}</div>
              <div><strong>Location:</strong> {selectedEvent.location}</div>
              {isDemoData(selectedEvent) && (
                <Badge variant="destructive">This appears to be demo/test data</Badge>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedEvent(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedEvent && deleteEvent(selectedEvent.id)}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DatabaseAdmin() {
  return (
    <AdminRoute>
      <DatabaseAdminContent />
    </AdminRoute>
  )
}