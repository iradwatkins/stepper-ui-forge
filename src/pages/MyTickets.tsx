import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Ticket, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { TicketService } from '@/lib/services/TicketService'
import TicketView from '@/components/tickets/TicketView'
import { formatEventDate, formatEventTime } from '@/lib/utils/dateUtils'

interface TicketData {
  id: string
  order_id: string
  ticket_type_id: string
  event_id: string
  holder_name: string | null
  holder_email: string
  qr_code: string | null
  status: 'active' | 'used' | 'cancelled'
  created_at: string
  updated_at: string
  ticket_types: {
    id: string
    name: string
    price: number
    events: {
      id: string
      title: string
      date: string
      venue: string | null
      location: string | null
      organizer_id: string
    }
  }
  orders: {
    id: string
    customer_email: string
    customer_name: string | null
    total_amount: number
    created_at: string
  }
}

export default function MyTickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = async () => {
    if (!user?.email) return
    
    try {
      setLoading(true)
      setError(null)
      const userTickets = await TicketService.getTicketsByUser(user.email)
      setTickets(userTickets)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError('Failed to load tickets. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [user?.email])

  const handleDownloadTicket = (ticket: TicketData) => {
    // Create a download link for the ticket QR code
    if (ticket.qr_code) {
      const link = document.createElement('a')
      link.href = ticket.qr_code
      link.download = `ticket-${ticket.id}.png`
      link.click()
    }
  }

  const handleShareTicket = (ticket: TicketData) => {
    if (navigator.share) {
      navigator.share({
        title: `Ticket for ${ticket.ticket_types.events.title}`,
        text: `I'm attending ${ticket.ticket_types.events.title} on ${formatEventDate(ticket.ticket_types.events.date)}`,
        url: window.location.href
      })
    } else {
      // Fallback to clipboard
      const shareText = `I'm attending ${ticket.ticket_types.events.title} on ${formatEventDate(ticket.ticket_types.events.date)}`
      navigator.clipboard.writeText(shareText)
    }
  }

  const transformTicketData = (ticket: TicketData) => {
    return {
      id: ticket.id,
      ticketType: ticket.ticket_types.name,
      holderName: ticket.holder_name || 'N/A',
      holderEmail: ticket.holder_email,
      status: ticket.status,
      qrCode: ticket.qr_code || '',
      event: {
        title: ticket.ticket_types.events.title,
        date: formatEventDate(ticket.ticket_types.events.date),
        time: formatEventTime(ticket.ticket_types.events.date.split('T')[1] || ''),
        location: ticket.ticket_types.events.venue || ticket.ticket_types.events.location || 'TBD',
        organizationName: undefined
      },
      createdAt: ticket.created_at
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your tickets...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchTickets}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            My Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No tickets yet</p>
              <p className="text-sm text-muted-foreground">
                Your purchased tickets will appear here after you complete a purchase.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  You have {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                </p>
                <Button variant="outline" size="sm" onClick={fetchTickets}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tickets.map((ticket) => (
                  <TicketView
                    key={ticket.id}
                    ticket={transformTicketData(ticket)}
                    onDownload={() => handleDownloadTicket(ticket)}
                    onShare={() => handleShareTicket(ticket)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}