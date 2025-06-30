import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Users, Ticket, TrendingDown, TrendingUp } from 'lucide-react'
import { InventoryService, TicketTypeWithAvailability } from "@/lib/services/InventoryService"
import { useRealTimeInventory } from "@/lib/hooks/useRealTimeInventory"
import { supabase } from "@/lib/supabase"

interface InventoryDashboardProps {
  eventId?: string
  className?: string
}

interface ActiveReservation {
  id: string
  ticket_type_id: string
  ticket_type_name: string
  event_title: string
  session_id: string
  quantity: number
  reserved_at: string
  expires_at: string
  time_remaining: string
}

interface InventoryStats {
  totalTickets: number
  soldTickets: number
  reservedTickets: number
  availableTickets: number
  totalRevenue: number
  conversionRate: number
}

export function InventoryDashboard({ eventId, className }: InventoryDashboardProps) {
  const [ticketTypes, setTicketTypes] = useState<TicketTypeWithAvailability[]>([])
  const [activeReservations, setActiveReservations] = useState<ActiveReservation[]>([])
  const [stats, setStats] = useState<InventoryStats>({
    totalTickets: 0,
    soldTickets: 0,
    reservedTickets: 0,
    availableTickets: 0,
    totalRevenue: 0,
    conversionRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cleanupCount, setCleanupCount] = useState<number | null>(null)

  // Use real-time inventory hook
  const { inventory, refreshInventory } = useRealTimeInventory({
    eventId,
    pollInterval: 10000, // 10 second updates
    enableRealTimeUpdates: true
  })

  /**
   * Fetch ticket types for the event
   */
  const fetchTicketTypes = async () => {
    try {
      if (!eventId) return

      const { data, error } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', eventId)

      if (error) throw error

      // Get availability for each ticket type
      const ticketTypesWithAvailability = await Promise.all(
        (data || []).map(async (ticketType) => {
          const availability = await InventoryService.getTicketTypeWithAvailability(ticketType.id)
          return availability || {
            ...ticketType,
            available_quantity: Math.max(0, ticketType.quantity - ticketType.sold_quantity)
          }
        })
      )

      setTicketTypes(ticketTypesWithAvailability)
    } catch (err) {
      console.error('Error fetching ticket types:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket types')
    }
  }

  /**
   * Fetch active reservations
   */
  const fetchActiveReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('active_reservations')
        .select('*')
        .order('expires_at', { ascending: true })

      if (error) throw error

      setActiveReservations(data || [])
    } catch (err) {
      console.error('Error fetching active reservations:', err)
    }
  }

  /**
   * Calculate dashboard statistics
   */
  const calculateStats = () => {
    const totalTickets = ticketTypes.reduce((sum, tt) => sum + tt.quantity, 0)
    const soldTickets = ticketTypes.reduce((sum, tt) => sum + tt.sold_quantity, 0)
    const reservedTickets = activeReservations.reduce((sum, res) => sum + res.quantity, 0)
    const availableTickets = ticketTypes.reduce((sum, tt) => sum + tt.available_quantity, 0)
    const totalRevenue = ticketTypes.reduce((sum, tt) => sum + (tt.sold_quantity * tt.price), 0)
    const conversionRate = totalTickets > 0 ? (soldTickets / totalTickets) * 100 : 0

    setStats({
      totalTickets,
      soldTickets,
      reservedTickets,
      availableTickets,
      totalRevenue,
      conversionRate
    })
  }

  /**
   * Clean up expired reservations
   */
  const cleanupExpiredReservations = async () => {
    try {
      const count = await InventoryService.cleanupExpiredReservations()
      setCleanupCount(count)
      
      // Refresh data after cleanup
      await Promise.all([
        fetchActiveReservations(),
        refreshInventory()
      ])

      setTimeout(() => setCleanupCount(null), 3000)
    } catch (err) {
      console.error('Error cleaning up reservations:', err)
      setError('Failed to cleanup expired reservations')
    }
  }

  /**
   * Refresh all data
   */
  const refreshAllData = async () => {
    setLoading(true)
    setError(null)

    try {
      await Promise.all([
        fetchTicketTypes(),
        fetchActiveReservations(),
        refreshInventory()
      ])
    } catch (err) {
      console.error('Error refreshing data:', err)
      setError('Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    refreshAllData()
  }, [eventId])

  // Calculate stats when data changes
  useEffect(() => {
    calculateStats()
  }, [ticketTypes, activeReservations])

  // Auto-refresh active reservations every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchActiveReservations, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (ticketType: TicketTypeWithAvailability) => {
    const utilization = ticketType.quantity > 0 ? (ticketType.sold_quantity / ticketType.quantity) * 100 : 0
    
    if (ticketType.available_quantity === 0) {
      return <Badge variant="destructive">Sold Out</Badge>
    } else if (utilization >= 90) {
      return <Badge variant="secondary">Nearly Full</Badge>
    } else if (utilization >= 75) {
      return <Badge variant="outline">High Demand</Badge>
    } else {
      return <Badge variant="default">Available</Badge>
    }
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-red-500'
    if (utilization >= 75) return 'bg-yellow-500'
    if (utilization >= 50) return 'bg-blue-500'
    return 'bg-green-500'
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">
            Real-time ticket availability and reservation monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cleanupExpiredReservations}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Cleanup Expired
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {cleanupCount !== null && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Cleaned up {cleanupCount} expired reservation{cleanupCount !== 1 ? 's' : ''}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all ticket types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.soldTickets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.conversionRate.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reservedTickets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Temporarily held
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From sold tickets
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ticket-types" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ticket-types">Ticket Types</TabsTrigger>
          <TabsTrigger value="reservations" className="relative">
            Active Reservations
            {activeReservations.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {activeReservations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ticket-types" className="space-y-4">
          <div className="grid gap-4">
            {ticketTypes.map((ticketType) => {
              const utilization = ticketType.quantity > 0 
                ? (ticketType.sold_quantity / ticketType.quantity) * 100 
                : 0

              return (
                <Card key={ticketType.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{ticketType.name}</CardTitle>
                        <CardDescription>${ticketType.price.toFixed(2)} per ticket</CardDescription>
                      </div>
                      {getStatusBadge(ticketType)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Sold: {ticketType.sold_quantity}/{ticketType.quantity}</span>
                          <span>{utilization.toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={utilization} 
                          className="h-2"
                        />
                      </div>

                      {/* Statistics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Available</p>
                          <p className="font-semibold text-green-600">
                            {ticketType.available_quantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sold</p>
                          <p className="font-semibold">
                            {ticketType.sold_quantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-semibold">
                            {ticketType.quantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-semibold">
                            ${(ticketType.sold_quantity * ticketType.price).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {ticketTypes.length === 0 && !loading && (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No ticket types found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Active Reservations
              </CardTitle>
              <CardDescription>
                Tickets currently held during checkout process
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeReservations.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {activeReservations.map((reservation) => (
                      <div key={reservation.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{reservation.ticket_type_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {reservation.event_title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Session: {reservation.session_id.substring(0, 8)}...
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{reservation.quantity} tickets</div>
                          <div className="text-sm text-muted-foreground">
                            Expires: {new Date(reservation.expires_at).toLocaleTimeString()}
                          </div>
                          <div className="text-xs">
                            {reservation.time_remaining}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No active reservations</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}