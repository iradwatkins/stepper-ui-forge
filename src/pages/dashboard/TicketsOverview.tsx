import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import { Navigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Ticket,
  Search,
  Download,
  Eye,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Filter,
  AlertCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AnalyticsService } from '@/lib/services/AnalyticsService'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface TicketData {
  id: string
  eventTitle: string
  eventDate: string
  ticketType: string
  price: number
  sold: number
  available: number
  revenue: number
  status: 'active' | 'paused' | 'sold_out'
}

export default function TicketsOverview() {
  const { user } = useAuth()
  const { isOrganizer, isEventOwner, loading: permissionsLoading } = useUserPermissions()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [analyticsData, setAnalyticsData] = useState<any>(null)

  useEffect(() => {
    if (!permissionsLoading && user?.id) {
      loadTicketsData()
    }
  }, [user?.id, permissionsLoading])

  const loadTicketsData = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      
      // Load analytics data
      const analytics = await AnalyticsService.getTicketAnalytics(user.id, '30d')
      setAnalyticsData(analytics)
      
      // Load detailed ticket data
      const { data: ticketData, error } = await supabase
        .from('tickets')
        .select(`
          id,
          created_at,
          status,
          ticket_types!inner(
            id,
            name,
            price,
            quantity,
            events!inner(
              id,
              title,
              date,
              organizer_id
            )
          )
        `)
        .eq('ticket_types.events.organizer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group tickets by event and ticket type
      const ticketMap = new Map<string, TicketData>()
      
      ticketData?.forEach((ticket: any) => {
        const key = `${ticket.ticket_types.events.id}-${ticket.ticket_types.id}`
        const existing = ticketMap.get(key)
        
        if (existing) {
          existing.sold += ticket.status !== 'cancelled' ? 1 : 0
          existing.revenue += ticket.status !== 'cancelled' ? ticket.ticket_types.price : 0
        } else {
          ticketMap.set(key, {
            id: key,
            eventTitle: ticket.ticket_types.events.title,
            eventDate: ticket.ticket_types.events.date,
            ticketType: ticket.ticket_types.name,
            price: ticket.ticket_types.price,
            sold: ticket.status !== 'cancelled' ? 1 : 0,
            available: ticket.ticket_types.quantity - 1, // This is approximate
            revenue: ticket.status !== 'cancelled' ? ticket.ticket_types.price : 0,
            status: 'active' // We'll update this based on availability
          })
        }
      })
      
      // Convert to array and update status
      const ticketArray = Array.from(ticketMap.values()).map(ticket => ({
        ...ticket,
        status: ticket.available === 0 ? 'sold_out' as const : 'active' as const
      }))
      
      setTickets(ticketArray)
    } catch (error) {
      console.error('Error loading tickets data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'sold_out': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticketType.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalStats = tickets.reduce((acc, ticket) => ({
    totalSold: acc.totalSold + ticket.sold,
    totalRevenue: acc.totalRevenue + ticket.revenue,
    totalAvailable: acc.totalAvailable + ticket.available
  }), { totalSold: 0, totalRevenue: 0, totalAvailable: 0 })

  // Check permissions and redirect if not authorized
  if (!permissionsLoading && !isOrganizer && !isEventOwner) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            This page is for event organizers only. Looking for your tickets?
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link to="/my-tickets">
            <Button>
              <Ticket className="w-4 h-4 mr-2" />
              Go to My Tickets
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading || permissionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Tickets Overview</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
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
          <h1 className="text-2xl font-bold tracking-tight">Tickets Overview</h1>
          <p className="text-muted-foreground">
            Manage all your event tickets and track sales performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link to="/dashboard/tickets/analytics">
            <Button variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sold</p>
                <p className="text-2xl font-bold">{totalStats.totalSold.toLocaleString()}</p>
              </div>
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">${totalStats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-blue-600">{totalStats.totalAvailable.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Events</p>
                <p className="text-2xl font-bold">{new Set(tickets.map(t => t.eventTitle)).size}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="sold_out">Sold Out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event & Ticket Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{ticket.eventTitle}</div>
                    <div className="text-sm text-muted-foreground">{ticket.ticketType}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    {new Date(ticket.eventDate).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  ${ticket.price}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{ticket.sold} sold</div>
                    <div className="text-muted-foreground">{ticket.available} available</div>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-green-600">
                  ${ticket.revenue.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/dashboard/tickets/${ticket.id}`}>
                      <Eye className="w-4 h-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}