
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, MapPinIcon, UsersIcon, ShareIcon, HeartIcon } from "lucide-react";
import { useParams } from "react-router-dom";
import { eventsService, Event } from "@/lib/events";
import { TicketSelector } from "@/components/ticketing";
import { TicketType } from "@/types/database";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";
import CheckoutModal from "@/components/CheckoutModal";

const EventDetail = () => {
  const { id } = useParams();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const loadEvent = async () => {
      setLoading(true);
      try {
        const foundEvent = eventsService.getEventById(id);
        setEvent(foundEvent);
        
        // Load ticket types for ticketed and premium events
        if (foundEvent && (foundEvent.eventType === 'ticketed' || foundEvent.eventType === 'premium')) {
          loadTicketTypes(foundEvent.id);
        } else {
          setTicketsLoading(false);
        }
      } catch (error) {
        console.error('Error loading event:', error);
        setEvent(null);
        setTicketsLoading(false);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id]);

  // Mock function to load ticket types - replace with actual API call
  const loadTicketTypes = async (eventId: string) => {
    setTicketsLoading(true);
    try {
      // Mock ticket types data - replace with actual API call
      const mockTicketTypes: TicketType[] = [
        {
          id: `${eventId}-general`,
          event_id: eventId,
          name: 'General Admission',
          description: 'Standard access to the event',
          price: 25.00,
          early_bird_price: 20.00,
          early_bird_until: '2024-12-01T23:59:59Z',
          quantity: 100,
          sold_quantity: 15,
          max_per_person: 4,
          sale_start: null,
          sale_end: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: `${eventId}-vip`,
          event_id: eventId,
          name: 'VIP Access',
          description: 'Premium access with special perks and reserved seating',
          price: 75.00,
          early_bird_price: null,
          early_bird_until: null,
          quantity: 50,
          sold_quantity: 8,
          max_per_person: 2,
          sale_start: null,
          sale_end: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setTicketTypes(mockTicketTypes);
    } catch (error) {
      console.error('Error loading ticket types:', error);
      setTicketTypes([]);
    } finally {
      setTicketsLoading(false);
    }
  };

  // Handle adding tickets to cart
  const handleAddToCart = (selections: any[]) => {
    if (!event) {
      toast({
        title: "Error",
        description: "Event not found",
        variant: "destructive"
      });
      return;
    }

    try {
      let totalTicketsAdded = 0;
      
      selections.forEach(selection => {
        addItem(selection.ticketType, event, selection.quantity);
        totalTicketsAdded += selection.quantity;
      });

      // Show success toast
      toast({
        title: "Added to Cart",
        description: `${totalTicketsAdded} ticket${totalTicketsAdded !== 1 ? 's' : ''} added to your cart`,
      });

    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add tickets to cart. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle simple event registration (free events)
  const handleSimpleEventRegistration = () => {
    if (!event) return;

    // For simple events, create a mock ticket type and add to cart
    const simpleTicketType: TicketType = {
      id: `${event.id}-simple`,
      event_id: event.id,
      name: 'Registration',
      description: 'Free event registration',
      price: 0,
      early_bird_price: null,
      early_bird_until: null,
      quantity: 1000, // Large number for simple events
      sold_quantity: 0,
      max_per_person: 1,
      sale_start: null,
      sale_end: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      addItem(simpleTicketType, event, 1);
      toast({
        title: "Added to Cart",
        description: "Registration added to your cart",
      });
    } catch (error) {
      console.error('Error registering for event:', error);
      toast({
        title: "Error",
        description: "Failed to register for event. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "simple": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "ticketed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "premium": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading event...</h1>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event not found</h1>
          <p className="text-muted-foreground">The event you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const eventImage = event.images?.banner?.medium || event.images?.postcard?.medium || '/placeholder-event.jpg';
  const eventPrice = event.eventType === 'simple' && event.displayPrice ? event.displayPrice.amount : 
                     event.tickets && event.tickets.length > 0 ? Math.min(...event.tickets.map(t => t.price)) : 0;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-80 md:h-96 overflow-hidden">
        <img
          src={eventImage}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="container mx-auto">
            <Badge className={`${getEventTypeColor(event.eventType)} mb-2`}>
              {event.eventType}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.title}</h1>
            <p className="text-lg opacity-90">{event.description}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Info */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{event.date}</p>
                    <p className="text-sm text-muted-foreground">{event.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPinIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UsersIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{event.attendees || 0} attending</p>
                    {event.capacity && (
                      <p className="text-sm text-muted-foreground">{event.capacity - (event.attendees || 0)} spots remaining</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-line">{event.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {event.categories.map((category, index) => (
                    <Badge key={index} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Selection */}
            {event.eventType === 'simple' ? (
              /* Simple Event Ticket Card */
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {eventPrice > 0 ? `$${eventPrice}` : 'Free'}
                    {eventPrice > 0 && <span className="text-base font-normal text-muted-foreground ml-2">per ticket</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => eventPrice > 0 ? setIsCheckoutOpen(true) : handleSimpleEventRegistration()}
                  >
                    {eventPrice > 0 ? 'Buy Tickets' : 'Register'}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <HeartIcon className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <ShareIcon className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Ticketed/Premium Event Ticket Selector */
              <div className="space-y-4">
                <TicketSelector
                  eventId={event.id}
                  ticketTypes={ticketTypes}
                  onAddToCart={handleAddToCart}
                  isLoading={ticketsLoading}
                />
                
                {/* Action Buttons for Ticketed Events */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <HeartIcon className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <ShareIcon className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            )}

            {/* Organizer Card */}
            <Card>
              <CardHeader>
                <CardTitle>Organizer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {event.organizationName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{event.organizationName}</p>
                    <p className="text-sm text-muted-foreground">Event Organizer</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Contact Organizer
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        event={{
          id: parseInt(event.id),
          title: event.title,
          date: event.date,
          time: event.time,
          price: eventPrice
        }}
      />
    </div>
  );
};

export default EventDetail;
