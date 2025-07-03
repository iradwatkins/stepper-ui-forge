import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, MapPinIcon, CalendarIcon, UsersIcon, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { EventsService } from "@/lib/events-db";
import { EventWithStats, ImageMetadata } from "@/types/database";

const Events = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideDemoData, setHideDemoData] = useState(true);

  const categories = [
    { id: "all", label: "All Events" },
    { id: "workshops", label: "Workshops" },
    { id: "sets", label: "Sets" },
    { id: "in-the-park", label: "In the park" },
    { id: "trips", label: "Trips" },
    { id: "cruises", label: "Cruises" },
    { id: "holiday", label: "Holiday" },
    { id: "competitions", label: "Competitions" },
  ];

  // Load events on component mount
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const publicEvents = await EventsService.getPublicEvents(50, 0);
        setEvents(publicEvents);
      } catch (error) {
        console.error('Error loading events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Function to detect demo/test data patterns
  const isDemoData = (event: EventWithStats) => {
    const demoPatterns = [
      'Spring Art Exhibition',
      'Winter Networking Event', 
      'Summer Music Festival',
      'Tech Conference 2024',
      'Food & Wine Expo',
      'Charity Gala',
      'Weekend Market',
      'Downtown Gallery',
      'Business Center',
      'Convention Center',
      'Central Park',
      'Demo Event',
      'Test Event',
      'Sample Event'
    ]
    
    return demoPatterns.some(pattern => 
      event.title.toLowerCase().includes(pattern.toLowerCase()) ||
      event.description?.toLowerCase().includes(pattern.toLowerCase()) ||
      event.location?.toLowerCase().includes(pattern.toLowerCase()) ||
      event.organization_name?.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           event.categories?.includes(selectedCategory);
    const isDemo = isDemoData(event);
    
    // If hiding demo data and this is demo data, filter it out
    if (hideDemoData && isDemo) {
      return false;
    }
    
    return matchesSearch && matchesCategory;
  });

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "simple": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "ticketed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "premium": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getEventPrice = (event: EventWithStats) => {
    if (event.event_type === 'simple') {
      return "Free";
    }
    if (event.event_type === 'ticketed' && event.ticket_types && event.ticket_types.length > 0) {
      const minPrice = Math.min(...event.ticket_types.map(t => t.price));
      return `From $${minPrice}`;
    }
    if (event.event_type === 'premium' && event.ticket_types && event.ticket_types.length > 0) {
      const minPrice = Math.min(...event.ticket_types.map(t => t.price));
      return `From $${minPrice}`;
    }
    return "Free";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-foreground">Discover Events</h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 events-container">
        <div className="mb-6 sm:mb-8 events-header">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-foreground leading-tight">Discover Events</h1>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">
              Find amazing events happening near you
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHideDemoData(!hideDemoData)}
              className="flex items-center gap-2"
            >
              {hideDemoData ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {hideDemoData ? 'Show Demo' : 'Hide Demo'}
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4 sm:mb-6 events-search">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              placeholder="Search events by title, location, or organizer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base lg:text-lg border-border focus:border-primary/50 focus:ring-primary/20"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-1 sm:gap-2 mb-6 sm:mb-8 category-filters">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-full transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9 touch-manipulation ${
                  selectedCategory === category.id 
                    ? "bg-primary hover:bg-primary/90 shadow-md" 
                    : "hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 events-grid">
          {filteredEvents.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`}>
              <Card className="overflow-hidden card-hover border-border bg-card event-card">
                <div className="aspect-video overflow-hidden">
                  {(event.images as Record<string, ImageMetadata>)?.banner?.url || (event.images as Record<string, ImageMetadata>)?.postcard?.url ? (
                    <img
                      src={(event.images as Record<string, ImageMetadata>)?.banner?.url || (event.images as Record<string, ImageMetadata>)?.postcard?.url}
                      alt={event.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">No image</span>
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-1 sm:mb-2 gap-2">
                    <Badge className={`${getEventTypeColor(event.event_type)} text-xs px-1.5 py-0.5`}>
                      {event.event_type}
                    </Badge>
                    <span className="text-sm sm:text-base lg:text-lg font-bold text-primary flex-shrink-0">{getEventPrice(event)}</span>
                  </div>
                  <CardTitle className="line-clamp-2 text-foreground text-sm sm:text-base leading-tight">{event.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-muted-foreground text-xs sm:text-sm leading-relaxed">
                    {event.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 p-3 sm:p-4">
                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{formatDate(event.date)} at {event.time}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <MapPinIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <UsersIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>{event.attendee_count || 0} attending</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-8 sm:py-12 px-4">
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-3 sm:mb-4">No events found matching your criteria.</p>
            <Link to="/create-event">
              <Button className="button-primary text-sm sm:text-base h-10 sm:h-11 px-4 sm:px-6">Create Your Own Event</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
