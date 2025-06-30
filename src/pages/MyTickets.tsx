import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Search, Ticket, Mail, AlertCircle, Calendar, MapPin, Clock } from "lucide-react";
import { TicketService } from "@/lib/services/TicketService";
import TicketView from "@/components/tickets/TicketView";

const MyTickets: React.FC = () => {
  const [email, setEmail] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-load if user is authenticated (would integrate with auth system)
  useEffect(() => {
    // In a real app, you'd get the user's email from authentication context
    // For now, we'll just wait for manual search
  }, []);

  const handleSearch = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const userTickets = await TicketService.getTicketsByCustomer(email.trim());
      setTickets(userTickets);

      if (userTickets.length === 0) {
        setError('No tickets found for this email address. Please check your email or contact support.');
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setError('Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTicket = (ticket: any) => {
    // In a real implementation, this would generate a PDF or open a new window
    console.log('Download ticket:', ticket.id);
    
    // For now, we'll create a simple text representation
    const ticketData = `
Event: ${ticket.events?.title || 'Unknown Event'}
Date: ${ticket.events?.date || 'TBD'}
Time: ${ticket.events?.time || 'TBD'}
Location: ${ticket.events?.location || 'TBD'}
Ticket Type: ${ticket.ticket_types?.name || 'General Admission'}
Holder: ${ticket.holder_name || 'Guest'}
Ticket ID: ${ticket.id}
QR Code: ${ticket.qr_code}
    `.trim();

    // Create and download as text file
    const blob = new Blob([ticketData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticket.id.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareTicket = (ticket: any) => {
    // In a real implementation, this might open a share modal or copy link
    console.log('Share ticket:', ticket.id);
    
    if (navigator.share) {
      navigator.share({
        title: `Ticket for ${ticket.events?.title || 'Event'}`,
        text: `I have a ticket for ${ticket.events?.title || 'this event'} on ${ticket.events?.date || 'TBD'}`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      const shareText = `Check out my ticket for ${ticket.events?.title || 'this event'}!`;
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Share text copied to clipboard!');
      });
    }
  };

  const groupTicketsByEvent = (tickets: any[]) => {
    const grouped = tickets.reduce((acc, ticket) => {
      const eventId = ticket.event_id;
      if (!acc[eventId]) {
        acc[eventId] = {
          event: ticket.events,
          tickets: [],
        };
      }
      acc[eventId].tickets.push(ticket);
      return acc;
    }, {} as Record<string, { event: any; tickets: any[] }>);

    return Object.values(grouped);
  };

  const groupedTickets = groupTicketsByEvent(tickets);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Tickets</h1>
        <p className="text-muted-foreground">
          Enter your email address to view and manage your event tickets.
        </p>
      </div>

      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Find Your Tickets
          </CardTitle>
          <CardDescription>
            Enter the email address you used when purchasing tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {hasSearched && (
        <>
          {tickets.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Your Tickets ({tickets.length})
                </h2>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {email}
                </Badge>
              </div>

              {groupedTickets.map((group, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {group.event?.title || 'Unknown Event'}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{group.event?.date || 'TBD'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{group.event?.time || 'TBD'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{group.event?.location || 'TBD'}</span>
                          </div>
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {group.tickets.length} ticket{group.tickets.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {group.tickets.map((ticket) => (
                        <TicketView
                          key={ticket.id}
                          ticket={{
                            id: ticket.id,
                            ticketType: ticket.ticket_types?.name || 'General Admission',
                            holderName: ticket.holder_name || 'Guest',
                            holderEmail: ticket.holder_email,
                            status: ticket.status,
                            qrCode: ticket.qr_code,
                            event: {
                              title: group.event?.title || 'Unknown Event',
                              date: group.event?.date || 'TBD',
                              time: group.event?.time || 'TBD',
                              location: group.event?.location || 'TBD',
                              organizationName: group.event?.organization_name,
                            },
                            createdAt: ticket.created_at,
                          }}
                          onDownload={() => handleDownloadTicket(ticket)}
                          onShare={() => handleShareTicket(ticket)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            !loading && (
              <Card>
                <CardContent className="text-center py-12">
                  <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
                  <p className="text-muted-foreground mb-4">
                    We couldn't find any tickets for {email}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <p>Please make sure you've entered the correct email address.</p>
                    <p>If you're still having trouble, contact our support team.</p>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </>
      )}

      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Searching for your tickets...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyTickets;