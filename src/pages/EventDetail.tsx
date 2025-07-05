
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
import { InteractiveSeatingChart, SeatData, PriceCategory } from "@/components/seating";
import { TicketType } from "@/types/database";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";
import { CheckoutModal } from "@/components/CheckoutModal";
import { ImageGalleryModal } from "@/components/ui/ImageGalleryModal";
import { seatingService, AvailableSeat } from "@/lib/services/SeatingService";
import { EventLikeService } from "@/lib/services/EventLikeService";
import { convertWizardToInteractive } from "@/lib/utils/seatingDataConverter";

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
  const [seatingCharts, setSeatingCharts] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<AvailableSeat[]>([]);
  const [showSeating, setShowSeating] = useState(false);
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [venueImageUrl, setVenueImageUrl] = useState<string>('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likesLoading, setLikesLoading] = useState(false);

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
          
          // Load seating charts for premium events
          if (foundEvent.event_type === 'premium') {
            try {
              const charts = await seatingService.getSeatingCharts(foundEvent.id);
              setSeatingCharts(charts);
              
              // Load detailed seating data for the professional component
              if (charts.length > 0) {
                const chart = charts[0];
                
                // Set venue image URL from chart image_url or chart data
                if (chart.image_url) {
                  setVenueImageUrl(chart.image_url);
                } else if (chart.chart_data?.uploadedChart) {
                  setVenueImageUrl(chart.chart_data.uploadedChart);
                }
                
                try {
                  // Load seat categories from database
                  const categories = await seatingService.getSeatCategories(chart.id);
                  
                  // Use data converter for consistent format
                  const { seats: convertedSeats, priceCategories } = convertWizardToInteractive(
                    chart,
                    categories
                  );
                  
                  setSeats(convertedSeats);
                  setPriceCategories(priceCategories);
                } catch (error) {
                  console.error('Error loading seat categories:', error);
                  
                  // Fallback to chart data if database loading fails
                  const convertedSeats: SeatData[] = [];
                  const categories: PriceCategory[] = [];
                  
                  if (chart.chart_data?.sections) {
                    chart.chart_data.sections.forEach((section: any) => {
                      categories.push({
                        id: section.id,
                        name: section.name,
                        color: section.color,
                        basePrice: section.price,
                        description: `${section.name} seating`
                      });
                      
                      if (section.seats) {
                        section.seats.forEach((seat: any) => {
                          convertedSeats.push({
                            id: seat.id,
                            x: seat.x,
                            y: seat.y,
                            seatNumber: seat.seatNumber,
                            section: section.name,
                            price: seat.price,
                            category: section.id,
                            categoryColor: section.color,
                            isADA: false,
                            status: seat.available ? 'available' : 'sold'
                          });
                        });
                      }
                    });
                  }
                  
                  setSeats(convertedSeats);
                  setPriceCategories(categories);
                }
              }
            } catch (error) {
              console.error('Error loading seating charts:', error);
            }
          }
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

  // Load event like status and count
  useEffect(() => {
    if (!event) return;

    const loadLikeInfo = async () => {
      try {
        // Get like status and count
        const [likeStatusResult, likeCountResult] = await Promise.all([
          EventLikeService.isEventLiked(event.id),
          EventLikeService.getEventLikeCount(event.id)
        ]);

        if (!likeStatusResult.error) {
          setIsLiked(likeStatusResult.isLiked);
        }

        if (!likeCountResult.error) {
          setLikeCount(likeCountResult.count);
        }
      } catch (error) {
        console.error('Error loading like info:', error);
      }
    };

    loadLikeInfo();
  }, [event]);


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

  // Handle seat selection for premium events
  const handleSeatsSelected = (seats: AvailableSeat[]) => {
    setSelectedSeats(seats);
  };

  // New handler for professional InteractiveSeatingChart
  const handleInteractiveSeatSelection = (seatIds: string[]) => {
    setSelectedSeatIds(seatIds);
    
    // Convert to legacy format for compatibility
    const legacySeats: AvailableSeat[] = seatIds.map(seatId => {
      const seat = seats.find(s => s.id === seatId);
      return {
        id: seatId,
        seat_number: seat?.seatNumber || '',
        section_name: seat?.section || '',
        current_price: seat?.price || 0,
        row_name: seat?.row || '',
        is_accessible: seat?.isADA || false
      };
    });
    setSelectedSeats(legacySeats);
  };

  const handleSeatPurchase = () => {
    if (selectedSeats.length === 0) {
      toast({
        title: "No seats selected",
        description: "Please select at least one seat before proceeding.",
        variant: "destructive"
      });
      return;
    }
    
    // For now, just open the checkout modal
    // TODO: Integrate seat purchases with checkout flow
    setIsCheckoutOpen(true);
  };

  const handleInteractivePurchase = async () => {
    if (selectedSeatIds.length === 0) {
      toast({
        title: "No seats selected",
        description: "Please select at least one seat before proceeding.",
        variant: "destructive"
      });
      return;
    }
    
    if (!event) return;
    
    try {
      // Generate session ID for seat holds
      const sessionId = seatingService.generateSessionId();
      
      // Hold the selected seats for 15 minutes
      const holdResult = await seatingService.holdSeats(
        selectedSeatIds,
        event.id,
        sessionId,
        {
          holdDurationMinutes: 15,
          customerEmail: undefined // Will be set during checkout
        }
      );
      
      console.log('Seats held successfully:', holdResult);
      
      // Update seat status to 'held' in local state
      setSeats(prevSeats => 
        prevSeats.map(seat => 
          selectedSeatIds.includes(seat.id) 
            ? { ...seat, status: 'held', holdExpiry: new Date(Date.now() + 15 * 60 * 1000) }
            : seat
        )
      );
      
      // Store session ID for checkout process
      localStorage.setItem('seatHoldSessionId', sessionId);
      
      toast({
        title: "Seats reserved",
        description: `${selectedSeatIds.length} seats reserved for 15 minutes. Please complete your purchase.`,
      });
      
      setIsCheckoutOpen(true);
    } catch (error) {
      console.error('Error holding seats:', error);
      toast({
        title: "Error reserving seats",
        description: "Failed to reserve seats. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle simple event registration (free events)
  const handleSimpleEventRegistration = () => {
    if (!event) return;

    // For simple events, proceed directly to checkout
    // The checkout process will handle free event registrations
    setIsCheckoutOpen(true);
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
  
  // Get display price for Simple Events
  const getSimpleEventDisplayPrice = () => {
    if (event.event_type !== 'simple') return null;
    // Extract price from description field (stored as [PRICE:amount|label])
    if (event.description) {
      const priceMatch = event.description.match(/\[PRICE:(.*?)\]/);
      if (priceMatch && priceMatch[1]) {
        const priceParts = priceMatch[1].split('|');
        const amount = parseFloat(priceParts[0]) || 0;
        const label = priceParts[1]?.trim() || '';
        
        if (amount > 0) {
          return `$${amount.toFixed(2)}`;
        } else if (label) {
          return label;
        }
      }
    }
    return "Free";
  };

  // Get clean description without price tag
  const getCleanDescription = () => {
    if (!event.description) return null;
    return event.description.replace(/\[PRICE:.*?\]/, '').trim();
  };

  // Handle like toggle
  const handleLikeToggle = async () => {
    if (!event || likesLoading) return;

    setLikesLoading(true);
    try {
      const result = await EventLikeService.toggleEventLike(event.id);
      
      if (result.success) {
        setIsLiked(result.isLiked);
        setLikeCount(prev => result.isLiked ? prev + 1 : prev - 1);
        
        toast({
          title: result.isLiked ? "Event Liked" : "Event Unliked",
          description: result.isLiked 
            ? "This event has been added to your liked events" 
            : "This event has been removed from your liked events",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update like status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLikesLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Image Section */}
      <div className="relative h-96 md:h-[500px] overflow-hidden">
        <img
          src={primaryImage}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex items-end">
          <div className="w-full p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
              <Badge className={`${getEventTypeColor(event.event_type)} mb-4`}>
                {event.event_type}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{event.title}</h1>
              <p className="text-xl text-gray-200 max-w-2xl">{getCleanDescription()}</p>
            </div>
          </div>
        </div>
        
        {/* Image Gallery Button */}
        {eventImages.length > 1 && (
          <button
            onClick={() => {
              setGalleryStartIndex(0);
              setIsGalleryOpen(true);
            }}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-900 px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:shadow-md"
          >
            View Gallery (+{eventImages.length - 1})
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Details Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Event Details</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
                      <CalendarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Date & Time</h3>
                      <p className="text-gray-600 dark:text-gray-300">{event.date}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{event.time}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl">
                      <MapPinIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Location</h3>
                      <p className="text-gray-600 dark:text-gray-300">{event.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
                      <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Attendance</h3>
                      <p className="text-gray-600 dark:text-gray-300">{event.attendee_count || 0} attending</p>
                      {event.max_attendees && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{event.max_attendees - (event.attendee_count || 0)} spots remaining</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* About Event Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">About This Event</h2>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-line text-gray-600 dark:text-gray-300 leading-relaxed">{getCleanDescription()}</p>
                </div>
              </div>
            </div>

            {/* Categories Card */}
            {event.categories && event.categories.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Categories</h2>
                  <div className="flex flex-wrap gap-2">
                    {event.categories.map((category, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sticky Container */}
            <div className="sticky top-8 space-y-6">
              {/* Ticket Selection Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6">
                  {event.event_type === 'simple' ? (
                    <>
                      <div className="text-center mb-6">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                          {getSimpleEventDisplayPrice()}
                        </div>
                      </div>
                      {eventPrice > 0 && (
                        <Button 
                          className="w-full mb-4" 
                          size="lg"
                          onClick={() => setIsCheckoutOpen(true)}
                        >
                          Buy Tickets
                        </Button>
                      )}
                    </>
                  ) : event.event_type === 'premium' && seatingCharts.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Premium Seating</h3>
                          <Badge className="bg-purple-100 text-purple-800">Premium Event</Badge>
                        </div>
                        
                        {!showSeating ? (
                          <div className="text-center space-y-4">
                            <p className="text-gray-600 dark:text-gray-400">
                              This premium event features reserved seating. Select your preferred seats from our interactive seating chart.
                            </p>
                            <Button 
                              onClick={() => setShowSeating(true)}
                              className="w-full"
                            >
                              Choose Your Seats
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {venueImageUrl && seats.length > 0 ? (
                              <InteractiveSeatingChart
                                venueImageUrl={venueImageUrl}
                                seats={seats}
                                priceCategories={priceCategories}
                                selectedSeats={selectedSeatIds}
                                onSeatSelection={handleInteractiveSeatSelection}
                                onPurchaseClick={handleInteractivePurchase}
                                maxSelectableSeats={8}
                                showPurchaseButton={true}
                                disabled={false}
                              />
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-gray-600 dark:text-gray-400">
                                  Loading seating chart...
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Select Tickets</h3>
                      <TicketSelector
                        eventId={event.id}
                        ticketTypes={ticketTypes}
                        onAddToCart={handleAddToCart}
                        isLoading={ticketsLoading}
                      />
                    </>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1" 
                      onClick={handleLikeToggle}
                      disabled={likesLoading}
                    >
                      <HeartIcon className={`w-4 h-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      {isLiked ? 'Liked' : 'Like'} {likeCount > 0 && `(${likeCount})`}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <ShareIcon className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>

              {/* Organizer Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Organizer</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">
                        {event.organization_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{event.organization_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Event Organizer</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Contact Organizer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        eventId={event?.id}
        selectedSeats={selectedSeatIds}
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
