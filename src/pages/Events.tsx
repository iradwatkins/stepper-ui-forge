import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { EventsService } from "@/lib/events-db";
import { EventWithStats } from "@/types/database";
import { EventFilters } from "@/components/EventFilters";
import { AdvancedFiltersModal } from "@/components/AdvancedFiltersModal";
import { getCategoryId } from "@/lib/constants/event-categories";
import { UnifiedSearchComponent } from "@/components/search/UnifiedSearchComponent";
import { SearchResult } from "@/lib/services/CategorySearchService";
import { isEventPast, isEventPast7Days } from "@/lib/utils/eventDateUtils";
import { PastEventImage } from "@/components/event/PastEventImage";
import { getEventImageUrl } from "@/lib/utils/imageUtils";

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
  const [featuredEvent, setFeaturedEvent] = useState<EventWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Events");
  const [activeView, setActiveView] = useState("Masonry");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState({ start: "", end: "" });
  const [sortBy, setSortBy] = useState("date_asc");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });
  const [capacityRange, setCapacityRange] = useState({ min: 0, max: 0 });
  const [timeOfDay, setTimeOfDay] = useState("any");
  const [advancedEventType, setAdvancedEventType] = useState("any");
  const [showPastEvents, setShowPastEvents] = useState(false);
  
  // Lazy loading state
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const INITIAL_EVENTS_LOAD = 50; // Load more initially to show 2026/2027 events
  const EVENTS_PER_PAGE = 20; // Subsequent loads

  // Helper function to get state name from abbreviation
  const getStateName = (abbreviation: string): string => {
    const states: Record<string, string> = {
      'CA': 'California',
      'NY': 'New York',
      'TX': 'Texas',
      'FL': 'Florida',
      'IL': 'Illinois',
      'WA': 'Washington',
      'OR': 'Oregon',
      'NV': 'Nevada',
      'AZ': 'Arizona',
      'CO': 'Colorado'
    };
    return states[abbreviation] || abbreviation;
  };

  // Helper function to get numeric price value for sorting
  const getEventPriceValue = (event: EventWithStats): number => {
    if (event.event_type === 'simple') {
      return event.display_price?.amount || 0;
    }
    
    if ((event.event_type === 'ticketed' || event.event_type === 'premium') && 
        event.ticket_types && event.ticket_types.length > 0) {
      
      const validPrices = event.ticket_types
        .map(t => t.price)
        .filter(price => typeof price === 'number' && price >= 0);
      
      if (validPrices.length === 0) {
        return 0;
      }
      
      return Math.min(...validPrices);
    }
    
    return 0;
  };

  // Load initial events on component mount
  useEffect(() => {
    const loadInitialEvents = async () => {
      setLoading(true);
      try {
        console.log('🔍 Loading initial events from Events page...');
        const publicEvents = await EventsService.getPublicEvents(INITIAL_EVENTS_LOAD, 0, showPastEvents);
        console.log('📊 Loaded initial events:', publicEvents.length, 'events');
        
        // Debug: Log date range of loaded events
        if (publicEvents.length > 0) {
          const firstDate = publicEvents[0].date;
          const lastDate = publicEvents[publicEvents.length - 1].date;
          console.log(`📅 Date range: ${firstDate} to ${lastDate}`);
        }
        
        setEvents(publicEvents);
        setCurrentOffset(INITIAL_EVENTS_LOAD);
        setHasMore(publicEvents.length === INITIAL_EVENTS_LOAD);
        
        // Set featured event (first event, static - won't change with filters)
        if (publicEvents.length > 0) {
          setFeaturedEvent(publicEvents[0]);
        }
      } catch (error) {
        console.error('❌ Error loading events:', error);
        setEvents([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    // Reset pagination when showPastEvents changes
    setCurrentOffset(0);
    setHasMore(true);
    loadInitialEvents();
  }, [showPastEvents]);

  // Load more events function
  const loadMoreEvents = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      console.log(`🔍 Loading more events from offset ${currentOffset}...`);
      const moreEvents = await EventsService.getPublicEvents(EVENTS_PER_PAGE, currentOffset, showPastEvents);
      console.log(`📊 Loaded ${moreEvents.length} more events`);
      
      if (moreEvents.length > 0) {
        setEvents(prevEvents => [...prevEvents, ...moreEvents]);
        setCurrentOffset(prev => prev + EVENTS_PER_PAGE);
        setHasMore(moreEvents.length === EVENTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('❌ Error loading more events:', error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredEvents = events.filter(event => {
    // Enhanced search logic with fuzzy matching and priority scoring
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
    const matchesSearch = searchQuery === "" || searchTerms.every(term => {
      const searchFields = [
        event.title?.toLowerCase() || '',
        event.description?.toLowerCase() || '',
        event.organization_name?.toLowerCase() || '',
        event.location?.toLowerCase() || '',
        ...(event.categories?.map(cat => cat.toLowerCase()) || [])
      ].join(' ');
      
      // Check for exact matches first, then partial matches
      return searchFields.includes(term) || 
             searchFields.split(' ').some(word => word.startsWith(term));
    });
    
    // Debug category filtering
    if (activeCategory !== "All Events") {
      console.log('🔍 Category Filter Debug:', {
        activeCategory,
        eventTitle: event.title,
        eventCategories: event.categories,
        categoryId: getCategoryId(activeCategory),
        eventId: event.id
      });
    }
    
    const matchesCategory = activeCategory === "All Events" || 
                           (() => {
                             const categoryId = getCategoryId(activeCategory);
                             // Check both ID format and label format for robustness
                             return categoryId && (
                               event.categories?.includes(categoryId) ||
                               event.categories?.includes(activeCategory) ||
                               event.categories?.some(cat => cat.toLowerCase() === categoryId.toLowerCase()) ||
                               event.categories?.some(cat => cat.toLowerCase() === activeCategory.toLowerCase())
                             );
                           })();
    
    // Location filtering - check if event location contains the selected state
    const matchesLocation = !selectedLocation || 
                           event.location?.toLowerCase().includes(selectedLocation.toLowerCase()) ||
                           event.location?.toLowerCase().includes(getStateName(selectedLocation).toLowerCase());
    
    // Date range filtering
    const matchesDateRange = (!selectedDateRange.start || event.date >= selectedDateRange.start) &&
                            (!selectedDateRange.end || event.date <= selectedDateRange.end);

    // Advanced filters
    const eventPrice = getEventPriceValue(event);
    const matchesPriceRange = (priceRange.min === 0 || eventPrice >= priceRange.min) &&
                             (priceRange.max === 0 || eventPrice <= priceRange.max);

    const eventCapacity = event.max_attendees || Infinity;
    const matchesCapacityRange = (capacityRange.min === 0 || eventCapacity >= capacityRange.min) &&
                                (capacityRange.max === 0 || eventCapacity <= capacityRange.max);

    const matchesTimeOfDay = timeOfDay === "any" || (() => {
      if (!event.time) return true;
      const hour = parseInt(event.time.split(':')[0]);
      switch (timeOfDay) {
        case "morning": return hour >= 6 && hour < 12;
        case "afternoon": return hour >= 12 && hour < 17;
        case "evening": return hour >= 17 && hour < 21;
        case "night": return hour >= 21 || hour < 6;
        default: return true;
      }
    })();

    const matchesAdvancedEventType = advancedEventType === "any" || event.event_type === advancedEventType;
    
    const finalResult = matchesSearch && matchesCategory && matchesLocation && matchesDateRange && 
           matchesPriceRange && matchesCapacityRange && matchesTimeOfDay && matchesAdvancedEventType;
           
    // Debug: Log final filtering result for non-All Events categories
    if (activeCategory !== "All Events") {
      console.log('🎯 Filter Result:', {
        eventTitle: event.title,
        finalResult,
        matchesCategory,
        matchesSearch,
        matchesLocation,
        matchesDateRange
      });
    }
    
    return finalResult;
  });

  // Debug: Summary of filtering results
  console.log('📈 Filtering Summary:', {
    totalEvents: events.length,
    filteredEvents: filteredEvents.length,
    activeCategory,
    selectedLocation,
    searchQuery
  });

  // Sort filtered events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case "date_asc":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "date_desc":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "title_asc":
        return a.title.localeCompare(b.title);
      case "price_asc":
        return getEventPriceValue(a) - getEventPriceValue(b);
      case "price_desc":
        return getEventPriceValue(b) - getEventPriceValue(a);
      case "popularity":
        // Sort by total tickets sold if available, otherwise by created date
        const aPopularity = a.total_tickets_sold || 0;
        const bPopularity = b.total_tickets_sold || 0;
        return bPopularity - aPopularity;
      default:
        return 0;
    }
  });

  const getEventPrice = (event: EventWithStats) => {
    if (event.event_type === 'simple') {
      // Use modern display_price field for simple events
      if (event.display_price) {
        const { amount, label } = event.display_price;
        
        if (amount && amount > 0) {
          return `$${amount.toFixed(2)}`;
        } else if (amount === 0 && label && label.trim()) {
          return label.trim();
        }
      }
      // Only show "Free" when amount is 0 and no label provided
      return "Free";
    }
    
    if ((event.event_type === 'ticketed' || event.event_type === 'premium') && 
        event.ticket_types && event.ticket_types.length > 0) {
      
      // Filter out invalid prices and get valid price list
      const validPrices = event.ticket_types
        .map(t => t.price)
        .filter(price => typeof price === 'number' && price >= 0);
      
      console.log(`🎫 Ticketed event valid prices:`, validPrices);
      
      if (validPrices.length === 0) {
        console.log(`⚠️ Ticketed event showing: Free (no valid prices)`);
        return "Free";
      }
      
      const minPrice = Math.min(...validPrices);
      const maxPrice = Math.max(...validPrices);
      
      // Format price display based on price range
      if (minPrice === 0) {
        const result = maxPrice > 0 ? `Free - $${maxPrice.toFixed(2)}` : "Free";
        console.log(`✅ Ticketed event showing: ${result}`);
        return result;
      } else if (minPrice === maxPrice) {
        const result = `$${minPrice.toFixed(2)}`;
        console.log(`✅ Ticketed event showing: ${result}`);
        return result;
      } else {
        const result = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
        console.log(`✅ Ticketed event showing: ${result}`);
        return result;
      }
    }
    
    console.log(`ℹ️ Event showing: Free (fallback)`);
    return "Free";
  };

  const shouldShowTicketsButton = (event: EventWithStats) => {
    // Always hide tickets button for Simple Events (information only)
    if (event.event_type === 'simple') {
      return false;
    }
    
    // Show tickets button for all other event types
    return true;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    // Convert 24-hour time (e.g., "14:30") to 12-hour format (e.g., "2:30 PM")
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Advanced filters handlers
  const handleApplyAdvancedFilters = () => {
    // Filters are applied automatically through state updates
    console.log('Applied advanced filters:', {
      priceRange,
      capacityRange,
      timeOfDay,
      advancedEventType
    });
  };

  const handleClearAdvancedFilters = () => {
    setPriceRange({ min: 0, max: 0 });
    setCapacityRange({ min: 0, max: 0 });
    setTimeOfDay("any");
    setAdvancedEventType("any");
  };

  // Render event card component
  const renderEventCard = (event: EventWithStats) => {
    // Get thumbnail for card view (faster loading)
    const imageUrl = getEventImageUrl(event, 'small');

    return (
      <Link key={event.id} to={`/events/${event.id}`}>
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden hover:shadow-lg transition-shadow duration-200">
          {/* Image Container */}
          <div className="relative">
            <div className="w-full h-56">
              <PastEventImage
                eventDate={event.date}
                imageUrl={imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
                showPlaceholder={true}
              />
            </div>
            
            {/* Price Badge - only show if not past 7 days */}
            {!isEventPast7Days(event.date) && (
              <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-foreground border border-border">
                {getEventPrice(event)}
              </div>
            )}
          </div>

        {/* Content Container */}
        <div className="p-6 flex flex-col gap-4">
          {/* Title */}
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {event.title}
          </h2>
          
          {/* Date */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path>
            </svg>
            <span className="font-medium">{formatDate(event.date)} {formatTime(event.time)}</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span className="font-medium">{event.location}</span>
          </div>

          {/* Organizer */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="font-medium">{event.organization_name || 'Event Organizer'}</span>
          </div>

          {/* Followers */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span className="font-medium">{event.follower_count || 0} followers</span>
          </div>

          {/* Tickets Button or Past Event Indicator */}
          {isEventPast(event.date) ? (
            <div className="w-full mt-4 py-3 px-6 bg-gray-100 text-gray-500 font-semibold rounded-full text-center">
              Event Ended
            </div>
          ) : shouldShowTicketsButton(event) && (
            <button className="w-full mt-4 py-3 px-6 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition-colors">
              Tickets
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};

  // Masonry layout helper functions
  const distributeMasonryEvents = (events: EventWithStats[]) => {
    const columns: EventWithStats[][] = [[], [], [], []];
    events.forEach((event, index) => {
      columns[index % 4].push(event);
    });
    return columns;
  };

  const renderMasonryCard = (event: EventWithStats, index: number) => {
    // Get medium size for masonry view (good balance of quality and performance)
    const imageUrl = getEventImageUrl(event, 'medium');

    return (
      <Link key={event.id} to={`/events/${event.id}`}>
        <div className="group relative overflow-hidden rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer">
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt={event.title}
                className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              {/* Minimal overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Date - Bottom Left */}
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium">
                {formatDate(event.date)}
              </div>
              
              {/* Price - Bottom Right */}
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium">
                {getEventPrice(event)}
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground">
              <span className="text-sm">No image</span>
            </div>
          )}
        </div>
      </Link>
    );
  };

  const MasonryColumn = ({ events, columnIndex }: { events: EventWithStats[]; columnIndex: number }) => (
    <div className="flex flex-col gap-4">
      {events.map((event, index) => (
        renderMasonryCard(event, columnIndex * events.length + index)
      ))}
    </div>
  );

  // Render different view layouts
  const renderEventsView = () => {
    // Show all filtered events (no longer skipping featured event)
    const eventsToShow = sortedEvents;

    switch (activeView) {
      case "Grid":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {eventsToShow.map(renderEventCard)}
          </div>
        );
      
      case "List":
        return (
          <div className="space-y-4">
            {eventsToShow.map((event) => {
              const imageUrl = getEventImageUrl(event, 'thumbnail');
              
              return (
                <Link key={event.id} to={`/events/${event.id}`}>
                  <div className="bg-card rounded-xl border-2 border-border p-4 md:p-6 flex flex-col sm:flex-row gap-4 md:gap-6 hover:shadow-lg transition-shadow duration-200">
                    {/* Image */}
                    <div className="w-full sm:w-32 h-48 sm:h-32 flex-shrink-0">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">No image</span>
                        </div>
                      )}
                    </div>
                  
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-foreground">{event.title}</h3>
                        <span className="bg-muted text-foreground px-3 py-1 rounded-full text-sm font-semibold border border-border">
                          {getEventPrice(event)}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path>
                          </svg>
                          <span className="text-sm">{formatDate(event.date)} {formatTime(event.time)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          <span className="text-sm">{event.location}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                          </svg>
                          <span className="text-sm">{event.organization_name || 'Event Organizer'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                          <span className="text-sm">{event.follower_count || 0} followers</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        );
      
      case "Masonry":
        const eventColumns = distributeMasonryEvents(eventsToShow);
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {eventColumns.map((columnEvents, columnIndex) => (
              <MasonryColumn 
                key={columnIndex} 
                events={columnEvents} 
                columnIndex={columnIndex}
              />
            ))}
          </div>
        );
      
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {eventsToShow.map(renderEventCard)}
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 events-container">

        {/* Featured Event Hero Section */}
        {featuredEvent && (
          <div className="mb-12">
            <div className="bg-card rounded-3xl border-2 border-border overflow-hidden shadow-lg">
              <div className="relative">
                {/* Hero Image */}
                <div className="relative h-96 md:h-[500px]">
                  <PastEventImage
                    eventDate={featuredEvent.date}
                    imageUrl={getEventImageUrl(featuredEvent, 'original')}
                    alt={featuredEvent.title}
                    className="w-full h-full object-cover"
                    showPlaceholder={true}
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Featured Badge */}
                  <div className="absolute top-6 left-6 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-bold">
                    ⭐ Featured Event
                  </div>
                  
                  {/* Price Badge */}
                  <div className="absolute top-6 right-6 bg-card/95 backdrop-blur-sm px-4 py-2 rounded-full text-lg font-bold text-foreground">
                    {getEventPrice(featuredEvent)}
                  </div>
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <div className="max-w-4xl">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                      {featuredEvent.title}
                    </h2>
                    
                    <div className="flex flex-wrap gap-6 mb-6">
                      {/* Date */}
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path>
                        </svg>
                        <span className="text-lg font-medium">{formatDate(featuredEvent.date)} {formatTime(featuredEvent.time)}</span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span className="text-lg font-medium">{featuredEvent.location}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-lg text-gray-200 mb-6 max-w-2xl line-clamp-2">
                      {featuredEvent.description}
                    </p>

                    {/* CTA Button */}
                    <Link to={`/events/${featuredEvent.id}`}>
                      <button className="bg-card text-foreground px-8 py-4 rounded-full text-lg font-semibold hover:bg-accent hover:text-accent-foreground transition-colors border border-border">
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
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          selectedDateRange={selectedDateRange}
          setSelectedDateRange={setSelectedDateRange}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showAdvancedFilters={showAdvancedFilters}
          setShowAdvancedFilters={setShowAdvancedFilters}
          showPastEvents={showPastEvents}
          setShowPastEvents={setShowPastEvents}
        />

        {/* Events Display */}
        {renderEventsView()}

        {/* Load More Button */}
        {sortedEvents.length > 0 && hasMore && (
          <div className="text-center py-8">
            <div className="mb-4 text-sm text-muted-foreground">
              Showing events from {sortedEvents.length > 0 ? sortedEvents[0].date : 'today'} onwards • More events available
            </div>
            <Button 
              onClick={loadMoreEvents}
              disabled={loadingMore}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold transition-all duration-200"
            >
              {loadingMore ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  Loading more events...
                </>
              ) : (
                `Load More Events (${events.length} loaded so far)`
              )}
            </Button>
          </div>
        )}

        {sortedEvents.length === 0 && (
          <div className="text-center py-8 sm:py-12 px-4">
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-3 sm:mb-4">No events found matching your criteria.</p>
            <Link to="/create-event">
              <Button className="button-primary text-sm sm:text-base h-10 sm:h-11 px-4 sm:px-6">Create Your Own Event</Button>
            </Link>
          </div>
        )}

        {/* Advanced Filters Modal */}
        <AdvancedFiltersModal
          isOpen={showAdvancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          capacityRange={capacityRange}
          setCapacityRange={setCapacityRange}
          timeOfDay={timeOfDay}
          setTimeOfDay={setTimeOfDay}
          eventType={advancedEventType}
          setEventType={setAdvancedEventType}
          onApplyFilters={handleApplyAdvancedFilters}
          onClearFilters={handleClearAdvancedFilters}
        />
      </div>
    </div>
  );
};

export default Events;
