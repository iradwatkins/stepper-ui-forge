
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, MapPinIcon, UsersIcon, ShareIcon, HeartIcon } from "lucide-react";
import { useParams } from "react-router-dom";
import { EventsService } from "@/lib/events-db";
import { EventWithStats, ImageMetadata } from "@/types/database";
import { TicketSelector } from "@/components/ticketing";
import { TicketType } from "@/types/database";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";
import { CheckoutModal } from "@/components/CheckoutModal";
import { ImageGalleryModal } from "@/components/ui/ImageGalleryModal";

interface EventImageData {
  original?: string;
  medium?: string;
  small?: string;
  thumbnail?: string;
  url?: string;
}

interface EventImages {
  banner?: EventImageData;
  postcard?: EventImageData;
}

const EventDetail = () => {
  const { id } = useParams();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [event, setEvent] = useState<EventWithStats | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const loadEvent = async () => {
      setLoading(true);
      try {
        const foundEvent = await EventsService.getEvent(id);
        setEvent(foundEvent);
        
        // Load ticket types for ticketed and premium events
        if (foundEvent && (foundEvent.event_type === 'ticketed' || foundEvent.event_type === 'premium')) {
          // Ticket types are already loaded with the event
          setTicketTypes(foundEvent.ticket_types || []);
          setTicketsLoading(false);
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
  const handleAddToCart = (selections: Array<{ ticketType: TicketType; quantity: number }>) => {
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

  // Helper function to get event images
  const getEventImages = (event: EventWithStats) => {
    const images: string[] = [];
    const eventImages = event.images as EventImages;
    
    // Add banner image (original or medium quality)
    if (eventImages?.banner?.original) {
      images.push(eventImages.banner.original);
    } else if (eventImages?.banner?.medium) {
      images.push(eventImages.banner.medium);
    } else if (eventImages?.banner?.url) {
      images.push(eventImages.banner.url);
    }
    
    // Add postcard image (original or medium quality)
    if (eventImages?.postcard?.original) {
      images.push(eventImages.postcard.original);
    } else if (eventImages?.postcard?.medium) {
      images.push(eventImages.postcard.medium);
    } else if (eventImages?.postcard?.url) {
      images.push(eventImages.postcard.url);
    }
    
    return images;
  };

  // Helper function to get primary display image
  const getPrimaryImage = (event: EventWithStats) => {
    const eventImages = event.images as EventImages;
    return eventImages?.banner?.medium || 
           eventImages?.banner?.original || 
           eventImages?.banner?.url ||
           eventImages?.postcard?.medium || 
           eventImages?.postcard?.original || 
           eventImages?.postcard?.url || 
           '/placeholder-event.jpg';
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

  const eventImages = getEventImages(event);
  const primaryImage = getPrimaryImage(event);
  const eventPrice = event.event_type === 'simple' ? 0 : 
                     event.ticket_types && event.ticket_types.length > 0 ? Math.min(...event.ticket_types.map(t => t.price)) : 0;

  return (
    <div className="min-h-screen">
      {/* Image Gallery Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-4">
          {/* Main Image */}
          <div 
            className="relative aspect-video md:aspect-[21/9] overflow-hidden rounded-lg cursor-pointer group"
            onClick={() => {
              setGalleryStartIndex(0);
              setIsGalleryOpen(true);
            }}
          >
            <img
              src={primaryImage}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            {eventImages.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
                +{eventImages.length - 1} more
              </div>
            )}
          </div>

          {/* Secondary Images Grid */}
          {eventImages.length > 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {eventImages.slice(1, 5).map((image, index) => (
                <div
                  key={index}
                  className="aspect-square overflow-hidden rounded-lg cursor-pointer group"
                  onClick={() => {
                    setGalleryStartIndex(index + 1);
                    setIsGalleryOpen(true);
                  }}
                >
                  <img
                    src={image}
                    alt={`${event.title} ${index + 2}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event Header */}
        <div className="mt-6">
          <div className="flex justify-between items-start mb-4">
            <Badge className={`${getEventTypeColor(event.event_type)} mb-2`}>
              {event.event_type}
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{event.title}</h1>
          <p className="text-lg text-muted-foreground mb-6">{event.description}</p>
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
                    <p className="font-medium">{event.attendee_count || 0} attending</p>
                    {event.max_attendees && (
                      <p className="text-sm text-muted-foreground">{event.max_attendees - (event.attendee_count || 0)} spots remaining</p>
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
                  {event.categories?.map((category, index) => (
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
            {event.event_type === 'simple' ? (
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
                      {event.organization_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{event.organization_name}</p>
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

      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={eventImages}
        initialIndex={galleryStartIndex}
        alt={event.title}
      />
    </div>
  );
};

export default EventDetail;
