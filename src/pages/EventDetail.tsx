
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, MapPinIcon, UsersIcon, ShareIcon, HeartIcon } from "lucide-react";
import { useParams } from "react-router-dom";
import { eventsService, Event } from "@/lib/events";
import CheckoutModal from "@/components/CheckoutModal";

const EventDetail = () => {
  const { id } = useParams();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const loadEvent = () => {
      setLoading(true);
      try {
        const foundEvent = eventsService.getEventById(id);
        setEvent(foundEvent);
      } catch (error) {
        console.error('Error loading event:', error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id]);

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
            {/* Ticket Card */}
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
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  Buy Tickets
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
