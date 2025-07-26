
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, MapPinIcon, AlertCircle } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { EventsService } from "@/lib/events-db";
import { EventWithStats, ImageMetadata } from "@/types/database";
import { TicketSelector } from "@/components/ticketing";
import CustomerSeatingChart from "@/components/seating/CustomerSeatingChart";
import { SeatData, PriceCategory } from "@/types/seating";
import { TicketType } from "@/types/database";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";
import { ImageGalleryModal } from "@/components/ui/ImageGalleryModal";
import { seatingService, AvailableSeat } from "@/lib/services/SeatingService";
import { convertWizardToInteractive } from "@/lib/utils/seatingDataConverter";
import { EventVenueService } from "@/lib/services/EventVenueService";
import { EventHeader } from "@/components/event/EventHeader";
import { EventOrganizer } from "@/components/event/EventOrganizer";
import { EventActions } from "@/components/event/EventActions";
import { EventAbout } from "@/components/event/EventAbout";
import { EventMeta } from "@/components/meta/EventMeta";
import { PastEventImage } from "@/components/event/PastEventImage";
import { isEventPast, isEventPast7Days } from "@/lib/utils/eventDateUtils";
import { useAuth } from "@/contexts/AuthContext";
import { getEventImageUrl, getAllEventImages } from "@/lib/utils/imageUtils";

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
  const navigate = useNavigate();
  const { addItem, openCheckoutWithProps } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
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
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);

  // Update total price when event loads
  useEffect(() => {
    if (event && event.event_type === 'simple') {
      const getSimpleEventPrice = (): number => {
        if (event.event_type !== 'simple') return 0;
        // Use display_price field instead of parsing description
        if (event.display_price?.amount) {
          return event.display_price.amount;
        }
        return 0;
      };
      
      const price = getSimpleEventPrice();
      setTotalPrice(price * quantity);
    }
  }, [event, quantity]);

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
              // First check if the event has a venue_layout_id (from venue management)
              const venueData = await EventVenueService.loadEventVenueData(foundEvent.id);
              
              if (venueData && venueData.venueLayout) {
                // Use venue management data
                console.log('Loading venue management layout for event:', foundEvent.id);
                
                // Set venue image URL from venue layout
                if (venueData.venueLayout.image_url) {
                  setVenueImageUrl(venueData.venueLayout.image_url);
                }
                
                // Get seats with real-time availability
                const availableSeats = await EventVenueService.getAvailableSeats(foundEvent.id);
                setSeats(availableSeats);
                setPriceCategories(venueData.mergedCategories);
                
                // Create a mock seating chart object for compatibility
                const mockChart = {
                  id: venueData.venueLayoutId,
                  event_id: foundEvent.id,
                  image_url: venueData.venueLayout.image_url,
                  chart_data: venueData.venueLayout.layout_data
                };
                setSeatingCharts([mockChart]);
                
              } else {
                // Fallback to legacy seating chart system
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
              }
            } catch (error) {
              console.error('Error loading seating data:', error);
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

    // Check if event has already passed
    if (isEventPast(event.date, event.time)) {
      toast({
        title: "Event Has Ended",
        description: "Tickets are no longer available for past events.",
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
        seat_id: seatId,
        seat_identifier: seat?.seatNumber || '',
        section_name: seat?.section || '',
        current_price: seat?.price || 0,
        row_name: seat?.row || '',
        is_accessible: seat?.isADA || false,
        is_premium: seat?.isPremium || false,
        id: seatId,
        seat_number: seat?.seatNumber || ''
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
    
    // Open checkout modal with event details
    openCheckoutWithProps({
      eventId: event?.id,
      eventTitle: event?.title,
      eventDate: event?.date,
      eventTime: event?.time,
      eventLocation: event?.location
    });
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
      
      openCheckoutWithProps({
        eventId: event?.id,
        selectedSeats: selectedSeatIds,
        seatDetails: getSelectedSeatDetails(),
        eventTitle: event?.title,
        eventDate: event?.date,
        eventTime: event?.time,
        eventLocation: event?.location
      });
    } catch (error) {
      console.error('Error holding seats:', error);
      toast({
        title: "Error reserving seats",
        description: "Failed to reserve seats. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Convert selected seat IDs to detailed seat objects for checkout
  const getSelectedSeatDetails = () => {
    return selectedSeatIds.map(seatId => {
      const seat = seats.find(s => s.id === seatId);
      if (!seat) return null;
      
      return {
        id: seat.id,
        seatNumber: seat.seatNumber,
        section: seat.section,
        row: seat.row,
        price: seat.price,
        category: seat.category,
        categoryColor: seat.categoryColor,
        isPremium: seat.isPremium,
        tableType: seat.tableType,
        tableCapacity: seat.tableCapacity,
        amenities: seat.amenities,
        isADA: seat.isADA
      };
    }).filter(Boolean);
  };

  // Handle simple event registration (free events)
  const handleSimpleEventRegistration = () => {
    if (!event) return;

    // For simple events, proceed directly to checkout
    // The checkout process will handle free event registrations
    openCheckoutWithProps({
      eventId: event?.id,
      eventTitle: event?.title,
      eventDate: event?.date,
      eventTime: event?.time,
      eventLocation: event?.location
    });
  };

  // Helper function to get event images
  // Use utility functions for consistent image handling
  const getEventImages = (event: EventWithStats) => getAllEventImages(event);
  
  const getPrimaryImage = (event: EventWithStats) => {
    return getEventImageUrl(event, 'original') || '/placeholder-event.jpg';
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


  // Handle quantity changes
  const handleQuantityChange = (change: number) => {
    const newQuantity = Math.max(1, quantity + change);
    setQuantity(newQuantity);
    
    // Update total price based on event type
    if (event && event.event_type === 'simple') {
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
      
      const price = getSimpleEventPrice();
      setTotalPrice(price * newQuantity);
    }
  };




  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Dynamic Meta Tags for Social Sharing */}
      {event && <EventMeta event={event} />}
      
      <main className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <EventHeader />
          
          {/* Header Section - Event Info */}
          {event.event_type === 'premium' && showSeating ? (
            <div className="space-y-6">
              {/* Compact header for seating mode */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
                  <div className="mt-2 flex items-center text-gray-600 text-sm">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>{event.date} {event.time}</span>
                    <span className="mx-2">•</span>
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    <span>{event.location || "To Be Announced"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className="bg-purple-100 text-purple-800">Premium Event</Badge>
                  <Button 
                    onClick={() => setShowSeating(false)}
                    variant="outline"
                  >
                    ← Back to Event Details
                  </Button>
                </div>
              </div>
              
              {/* Full-width seating chart */}
              <div className="w-full">
                {venueImageUrl && seats.length > 0 ? (
                  <CustomerSeatingChart
                    venueImageUrl={venueImageUrl}
                    seats={seats}
                    priceCategories={priceCategories}
                    selectedSeats={selectedSeatIds}
                    onSeatSelection={handleInteractiveSeatSelection}
                    onPurchaseClick={handleInteractivePurchase}
                    maxSelectableSeats={8}
                    showPurchaseButton={true}
                    disabled={false}
                    className="w-full min-h-[600px]"
                    eventType="premium"
                    eventId={event.id}
                    enableHoldTimer={true}
                    holdDurationMinutes={15}
                    onHoldExpire={() => {
                      setSelectedSeats([]);
                      toast({
                        title: "Seat Hold Expired",
                        description: "Your selected seats have been released. Please select again.",
                        variant: "destructive"
                      });
                    }}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Loading seating chart...</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
            
            {/* Left - Event Image (Full display with proper sizing) */}
            <div className="lg:col-span-1">
              <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
                <div 
                  className="w-full h-64 lg:h-80 cursor-pointer"
                  onClick={() => {
                    if (!isEventPast7Days(event.date) || (user && event.owner_id === user.id)) {
                      setGalleryStartIndex(0);
                      setIsGalleryOpen(true);
                    }
                  }}
                >
                  <PastEventImage
                    eventDate={event.date}
                    imageUrl={primaryImage}
                    alt={event.title}
                    className="w-full h-full object-contain rounded-lg shadow-lg hover:opacity-90 transition-opacity"
                    isOrganizer={user?.id === event.owner_id}
                  />
                </div>
                
                {/* Image Gallery Button - only show if images not hidden */}
                {eventImages.length > 1 && (!isEventPast7Days(event.date) || (user && event.owner_id === user.id)) && (
                  <button
                    onClick={() => {
                      setGalleryStartIndex(0);
                      setIsGalleryOpen(true);
                    }}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-900 px-2 py-1 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md"
                  >
                    +{eventImages.length - 1}
                  </button>
                )}
              </div>
            </div>

            {/* Right - Event Information & Details */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Event Title and Details */}
              <div>
                <h1 className="text-4xl font-bold text-gray-900">{event.title}</h1>
                <div className="mt-4 flex items-center text-gray-600">
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  <span>{event.date} {event.time}</span>
                </div>
                <div className="mt-2 flex items-center text-gray-600">
                  <MapPinIcon className="w-5 h-5 mr-2" />
                  <span>{event.location || "To Be Announced"}</span>
                </div>
              </div>

              {/* Price Information Section */}
              {event.event_type === 'simple' ? (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <p className="text-lg text-gray-800 uppercase font-medium">{event.title}</p>
                      <p className="text-sm text-gray-600 mt-1">Event information</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">{getSimpleEventDisplayPrice()}</span>
                      <span className="text-sm text-gray-500">(For information only)</span>
                    </div>
                  </div>
                </div>
              ) : event.event_type === 'premium' && seatingCharts.length > 0 ? (
                <div className="border-t border-gray-200 pt-6">
                  {isEventPast(event.date, event.time) ? (
                    <Alert className="bg-gray-50 border-gray-300">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>This event has ended.</strong> Tickets are no longer available for purchase.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900">Table Seating Selection</h3>
                        <Badge className="bg-purple-100 text-purple-800">Premium Event</Badge>
                      </div>
                      
                      <div className="text-center space-y-4">
                        <p className="text-gray-600">
                          This event features reserved table seating. Choose your preferred seats from our interactive table chart.
                        </p>
                        <Button 
                          onClick={() => setShowSeating(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300"
                        >
                          Choose Your Table Seats
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : event.event_type === 'ticketed' ? (
                <div className="border-t border-gray-200 pt-6">
                  {isEventPast(event.date, event.time) ? (
                    <Alert className="bg-gray-50 border-gray-300">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>This event has ended.</strong> Tickets are no longer available for purchase.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold mb-4 text-gray-900">Select Tickets</h3>
                      {!ticketsLoading ? (
                        <TicketSelector
                          eventId={event.id}
                          ticketTypes={ticketTypes}
                          onAddToCart={handleAddToCart}
                          isLoading={ticketsLoading}
                        />
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-600">Loading tickets...</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Event Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 mb-2">This is an informational event listing.</p>
                    <p className="text-sm text-gray-600">For tickets and registration, please contact the event organizer.</p>
                  </div>
                </div>
              )}

              <EventOrganizer event={event} />
              <EventActions event={event} />
            </div>
          </div>
          )}  {/* End of conditional layout */}
          
          <EventAbout event={event} />

        </div>
      </main>

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
