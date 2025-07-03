import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { EventsService } from "@/lib/events-db";
import { EventWithStats } from "@/types/database";
import { EventFilters } from "@/components/EventFilters";

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

const Events = () => {
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Events");
  const [activeView, setActiveView] = useState("Masonry");

  // Load events on component mount
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        console.log('🔍 Loading events from Events page...');
        const publicEvents = await EventsService.getPublicEvents(50, 0);
        console.log('📊 Loaded events:', publicEvents);
        setEvents(publicEvents);
      } catch (error) {
        console.error('❌ Error loading events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);


  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All Events" || 
                           event.categories?.includes(activeCategory.toLowerCase());
    
    return matchesSearch && matchesCategory;
  });


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

  // Render event card component
  const renderEventCard = (event: EventWithStats) => (
    <Link key={event.id} to={`/events/${event.id}`}>
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200">
        {/* Image Container */}
        <div className="relative">
          {(event.images as EventImages)?.banner?.thumbnail || (event.images as EventImages)?.postcard?.thumbnail ? (
            <img
              src={(event.images as EventImages)?.banner?.thumbnail || (event.images as EventImages)?.postcard?.thumbnail}
              alt={event.title}
              className="w-full h-56 object-cover"
            />
          ) : (
            <div className="w-full h-56 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          
          {/* Price Badge */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-gray-900">
            {getEventPrice(event)}
          </div>
        </div>

        {/* Content Container */}
        <div className="p-6 flex flex-col gap-4">
          {/* Title */}
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            {event.title}
          </h2>
          
          {/* Date */}
          <div className="flex items-center gap-3 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path>
            </svg>
            <span className="font-medium">{formatDate(event.date)} {event.time}</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span className="font-medium">{event.location}</span>
          </div>

          {/* Tickets Button */}
          <button className="w-full mt-4 py-3 px-6 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-700 transition-colors">
            Tickets
          </button>
        </div>
      </div>
    </Link>
  );

  // Render different view layouts
  const renderEventsView = () => {
    const eventsToShow = filteredEvents.slice(1); // Skip first event (featured)

    switch (activeView) {
      case "Grid":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventsToShow.map(renderEventCard)}
          </div>
        );
      
      case "List":
        return (
          <div className="space-y-4">
            {eventsToShow.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`}>
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6 flex gap-6 hover:shadow-lg transition-shadow duration-200">
                  {/* Image */}
                  <div className="w-32 h-32 flex-shrink-0">
                    {(event.images as EventImages)?.banner?.thumbnail || (event.images as EventImages)?.postcard?.thumbnail ? (
                      <img
                        src={(event.images as EventImages)?.banner?.thumbnail || (event.images as EventImages)?.postcard?.thumbnail}
                        alt={event.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-sm">No image</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                      <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {getEventPrice(event)}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path>
                        </svg>
                        <span className="text-sm">{formatDate(event.date)} {event.time}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span className="text-sm">{event.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        );
      
      case "Masonry":
      default:
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 events-masonry">
            {Array.from({ length: 4 }, (_, columnIndex) => (
              <div key={columnIndex} className="grid gap-6">
                {eventsToShow
                  .filter((_, index) => index % 4 === columnIndex)
                  .map(renderEventCard)}
              </div>
            ))}
          </div>
        );
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 events-container">

        {/* Featured Event Hero Section */}
        {filteredEvents.length > 0 && (
          <div className="mb-12">
            <div className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden shadow-lg">
              <div className="relative">
                {/* Hero Image */}
                <div className="relative h-96 md:h-[500px]">
                  {(filteredEvents[0].images as EventImages)?.banner?.original || (filteredEvents[0].images as EventImages)?.postcard?.original ? (
                    <img
                      src={(filteredEvents[0].images as EventImages)?.banner?.original || (filteredEvents[0].images as EventImages)?.postcard?.original}
                      alt={filteredEvents[0].title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <span className="text-gray-500 text-xl">Featured Event</span>
                    </div>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Featured Badge */}
                  <div className="absolute top-6 left-6 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-bold">
                    ⭐ Featured Event
                  </div>
                  
                  {/* Price Badge */}
                  <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-lg font-bold text-gray-900">
                    {getEventPrice(filteredEvents[0])}
                  </div>
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <div className="max-w-4xl">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                      {filteredEvents[0].title}
                    </h2>
                    
                    <div className="flex flex-wrap gap-6 mb-6">
                      {/* Date */}
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path>
                        </svg>
                        <span className="text-lg font-medium">{formatDate(filteredEvents[0].date)} {filteredEvents[0].time}</span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span className="text-lg font-medium">{filteredEvents[0].location}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-lg text-gray-200 mb-6 max-w-2xl line-clamp-2">
                      {filteredEvents[0].description}
                    </p>

                    {/* CTA Button */}
                    <Link to={`/events/${filteredEvents[0].id}`}>
                      <button className="bg-white text-gray-900 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-colors">
                        Get Tickets
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <EventFilters 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        {/* Events Display */}
        {renderEventsView()}

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
