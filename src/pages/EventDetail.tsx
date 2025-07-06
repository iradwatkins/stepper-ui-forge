
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, MapPinIcon, ShareIcon, HeartIcon } from "lucide-react";
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
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);

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

  // Handle quantity changes
  const handleQuantityChange = (change: number) => {
    const newQuantity = Math.max(1, quantity + change);
    setQuantity(newQuantity);
    
    // Update total price based on event type
    if (event.event_type === 'simple') {
      const price = getSimpleEventPrice();
      setTotalPrice(price * newQuantity);
    }
  };

  // Get numeric price for simple events
  const getSimpleEventPrice = (): number => {
    if (event.event_type !== 'simple') return 0;
    if (event.description) {
      const priceMatch = event.description.match(/\[PRICE:(.*?)\]/);
      if (priceMatch && priceMatch[1]) {
        const priceParts = priceMatch[1].split('|');
        const amount = parseFloat(priceParts[0]) || 0;
        return amount;
      }
    }
    return 0;
  };

  // Update total price when event loads
  useEffect(() => {
    if (event && event.event_type === 'simple') {
      const price = getSimpleEventPrice();
      setTotalPrice(price * quantity);
    }
  }, [event, quantity]);

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
    <div className="min-h-screen bg-white font-sans">
      <main className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Two-column grid layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Left Column - Poster-style Event Image */}
            <div className="w-full">
              <div className="relative">
                <img 
                  src={primaryImage} 
                  alt={event.title}
                  className="w-full h-auto object-cover rounded-lg shadow-lg"
                />
                
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
            </div>

            {/* Right Column - Event Information & Actions */}
            <div className="w-full space-y-8">
              
              {/* Event Title and Details */}
              <div>
                <h1 className="text-4xl font-bold text-gray-900">{event.title}</h1>
                <div className="mt-4 flex items-center text-gray-600">
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  <span>{event.date} {event.time}</span>
                </div>
                <div className="mt-2 flex items-center text-gray-600">
                  <MapPinIcon className="w-5 h-5 mr-2" />
                  <span>{event.location}</span>
                </div>
              </div>

              {/* Ticket Selection Section */}
              {event.event_type === 'simple' ? (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-between items-center">
                    <p className="text-lg text-gray-800 uppercase font-medium">{event.title}</p>
                    <div className="flex items-center border border-gray-300 rounded-md">
                      <button 
                        onClick={() => handleQuantityChange(-1)}
                        className="px-3 py-1 text-lg text-gray-500 hover:text-gray-700"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <span className="px-4 py-1 text-lg font-medium">{quantity}</span>
                      <button 
                        onClick={() => handleQuantityChange(1)}
                        className="px-3 py-1 text-lg text-gray-500 hover:text-gray-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900 mt-1">{getSimpleEventDisplayPrice()}</p>
                </div>
              ) : event.event_type === 'premium' && seatingCharts.length > 0 ? (
                <div className="border-t border-gray-200 pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900">Premium Seating</h3>
                      <Badge className="bg-purple-100 text-purple-800">Premium Event</Badge>
                    </div>
                    
                    {!showSeating ? (
                      <div className="text-center space-y-4">
                        <p className="text-gray-600">
                          This premium event features reserved seating. Select your preferred seats from our interactive seating chart.
                        </p>
                        <Button 
                          onClick={() => setShowSeating(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300"
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
                            <p className="text-gray-600">Loading seating chart...</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Select Tickets</h3>
                  <TicketSelector
                    eventId={event.id}
                    ticketTypes={ticketTypes}
                    onAddToCart={handleAddToCart}
                    isLoading={ticketsLoading}
                  />
                </div>
              )}

              {/* Total and Buy Now Section */}
              <div className="flex items-center justify-between bg-gray-100 p-4 rounded-lg">
                <span className="text-2xl font-bold text-gray-900">
                  {event.event_type === 'simple' ? `$${totalPrice.toFixed(2)}` : '$0'}
                </span>
                <Button 
                  className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition duration-300"
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  Buy now
                </Button>
              </div>

              {/* Organizer Information */}
              <div className="border-t border-gray-200 pt-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-4">
                      <span className="text-lg font-bold text-white">
                        {event.organization_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{event.organization_name}</h3>
                      <p className="text-sm text-gray-500">For exchanges, refunds, tax receipts, and any event-related requests, please send a message to the organizer.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="border border-gray-300 rounded-full px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition whitespace-nowrap">
                    Send message
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
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
          
          {/* About Section - Below main grid */}
          <div className="mt-16 border-t border-gray-200 pt-10">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About the event</h2>
              <div className="text-gray-700 space-y-4">
                <p className="whitespace-pre-line leading-relaxed">{getCleanDescription()}</p>
                
                {/* Categories */}
                {event.categories && event.categories.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {event.categories.map((category, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

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
