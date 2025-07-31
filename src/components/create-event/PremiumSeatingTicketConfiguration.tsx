import { useState, useEffect } from 'react';
import { UseFormReturn } from "react-hook-form";
import { EventFormData } from "@/types/event-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign,
  Info,
  CheckCircle,
  MapPin
} from 'lucide-react';
import { seatingService } from '@/lib/services/SeatingService';
import PremiumSeatingManager from '@/components/seating/PremiumSeatingManager';
import { SeatData, SeatCategory as EnhancedSeatCategory } from '@/types/seating';
import { toast } from 'sonner';
import { TicketType } from './TicketConfigurationWizard';
import { TicketConfigurationWizard } from './TicketConfigurationWizard';
import { useEventCreation } from '@/contexts/EventCreationContext';
import { cn } from '@/lib/utils';
import { TicketInventoryTracker } from './TicketInventoryTracker';

interface PremiumSeatingTicketConfigurationProps {
  form: UseFormReturn<EventFormData>;
  onSeatingConfigured?: (seatingData: any) => void;
  onStepAdvance?: () => boolean;
}

export const PremiumSeatingTicketConfiguration = ({ 
  form, 
  onSeatingConfigured,
  onStepAdvance
}: PremiumSeatingTicketConfigurationProps) => {
  const { 
    claimFieldOwnership, 
    releaseFieldOwnership,
    addDebugUpdate 
  } = useEventCreation();
  
  const [activeTab, setActiveTab] = useState<'tickets' | 'seating' | 'review'>('tickets');
  const [isCompleted, setIsCompleted] = useState(false);
  const [venueImage, setVenueImage] = useState<string | null>(null);
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [categories, setCategories] = useState<EnhancedSeatCategory[]>([]);
  const [generatedTickets, setGeneratedTickets] = useState<TicketType[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isTicketFormVisible, setIsTicketFormVisible] = useState(true);
  
  const COMPONENT_NAME = 'PremiumSeatingTicketConfiguration';
  
  // Claim field ownership on mount
  useEffect(() => {
    const fields = ['venueLayoutId', 'seats', 'seatCategories', 'venueImageUrl', 'hasVenueImage'] as const;
    fields.forEach(field => {
      claimFieldOwnership(field, COMPONENT_NAME);
      addDebugUpdate(COMPONENT_NAME, field, `Claimed ownership`);
    });
    
    // Cleanup: Release ownership on unmount
    return () => {
      fields.forEach(field => {
        releaseFieldOwnership(field, COMPONENT_NAME);
      });
    };
  }, [claimFieldOwnership, releaseFieldOwnership, addDebugUpdate]);
  
  // Initialize venue image from form data
  useEffect(() => {
    const existingImage = form.watch('venueImageUrl');
    if (existingImage) {
      setVenueImage(existingImage);
    }
  }, [form]);

  // Generate tickets from seat categories
  const generateTicketsFromCategories = (categories: EnhancedSeatCategory[], seats: SeatData[]) => {
    const tickets: TicketType[] = [];
    
    // For table-based venues, group by table
    const seatsByTable = seats.reduce((acc, seat) => {
      if (seat.tableId) {
        if (!acc[seat.tableId]) {
          acc[seat.tableId] = [];
        }
        acc[seat.tableId].push(seat);
      }
      return acc;
    }, {} as Record<string, SeatData[]>);
    
    // Count seats per category
    const seatCountByCategory = seats.reduce((acc, seat) => {
      acc[seat.categoryId] = (acc[seat.categoryId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Create ticket types for each category that has seats
    categories.forEach(category => {
      const seatCount = seatCountByCategory[category.id] || 0;
      if (seatCount > 0) {
        // Check if this category has tables
        const categoryHasTables = seats.some(seat => 
          seat.categoryId === category.id && seat.tableId
        );
        
        tickets.push({
          id: category.id,
          name: category.name,
          description: categoryHasTables 
            ? `${category.name} table seating with ${category.amenities.join(', ')}`
            : `${category.name} seating with ${category.amenities.join(', ')}`,
          price: category.basePrice,
          quantity: seatCount,
          color: category.color
        });
      }
    });
    
    return tickets;
  };


  const handleSeatingConfigurationChange = (newSeats: SeatData[], newCategories: EnhancedSeatCategory[]) => {
    setSeats(newSeats);
    setCategories(newCategories);
    
    // Generate tickets from the seating configuration
    const tickets = generateTicketsFromCategories(newCategories, newSeats);
    setGeneratedTickets(tickets);
    
    // Update form with seating data
    form.setValue('seats', newSeats);
    form.setValue('seatCategories', newCategories);
    
    // Update debug info
    addDebugUpdate(COMPONENT_NAME, 'seats', `${newSeats.length} seats`);
    addDebugUpdate(COMPONENT_NAME, 'seatCategories', `${newCategories.length} categories`);
    
    if (onSeatingConfigured) {
      onSeatingConfigured({
        seats: newSeats,
        categories: newCategories,
        tickets
      });
    }
  };

  const handleAdvanceToNext = () => {
    // Sequential tab progression
    if (activeTab === 'tickets' && ticketTypes.length > 0) {
      setActiveTab('seating');
    } else if (activeTab === 'seating' && seats.length > 0) {
      setIsCompleted(true);
      setActiveTab('review');
    } else if (activeTab === 'review' && onStepAdvance) {
      onStepAdvance();
    }
  };

  const canAdvance = () => {
    switch (activeTab) {
      case 'tickets':
        return ticketTypes.length > 0;
      case 'seating':
        return seats.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Ticket & Seating Configuration</h2>
        <p className="text-muted-foreground">
          Configure tickets and seating for your premium event
        </p>
      </div>

      {/* Show alert if no venue image */}
      {!venueImage && (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Venue Required:</strong> Please select or create a venue in the previous step before configuring tickets and seating.
          </AlertDescription>
        </Alert>
      )}


      {/* Show completion message when all steps are done */}
      {isCompleted && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Ready to Go!</strong> Your premium event setup is complete. Review the configuration below and proceed to publish your event.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger 
            value="tickets" 
            disabled={!venueImage}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Tickets
          </TabsTrigger>
          <TabsTrigger 
            value="seating" 
            disabled={ticketTypes.length === 0}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Seating
          </TabsTrigger>
          <TabsTrigger 
            value="review" 
            disabled={!isCompleted}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Review
          </TabsTrigger>
        </TabsList>


        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Ticket Types</CardTitle>
              <CardDescription>
                Define your ticket types and quantities. You'll place these tickets on the venue layout in the next step.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ticket creation form */}
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Instructions:</strong> Create your ticket types below. Each ticket type represents a different 
                  pricing tier or seating category (e.g., VIP, Regular, Accessible). In the next step, you'll visually 
                  place these tickets on your venue layout.
                </AlertDescription>
              </Alert>
              
              {/* Main ticket configuration section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold">Configure Ticket Types</h4>
                  <Badge variant="outline" className="text-sm">
                    {ticketTypes.length} type{ticketTypes.length !== 1 ? 's' : ''} created
                  </Badge>
                </div>
                
                {/* Use TicketConfigurationWizard for manual ticket creation */}
                <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 bg-primary/5">
                  <TicketConfigurationWizard 
                    form={form}
                    eventType="premium"
                    initialTickets={ticketTypes}
                    onTicketsChange={(tickets) => {
                      setTicketTypes(tickets);
                    }}
                  />
                </div>
              </div>
              
              {ticketTypes.length > 0 && (
                <>
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-lg">Created Ticket Types Summary:</h4>
                    {ticketTypes.map((ticket) => (
                      <div key={ticket.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: ticket.color }}
                            />
                            <h4 className="font-medium">{ticket.name}</h4>
                          </div>
                          <Badge variant="secondary">
                            {ticket.quantity} seats
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {ticket.description}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Price per ticket:</span>
                          <span className="text-lg font-bold">${ticket.price}</span>
                        </div>
                        {ticket.hasEarlyBird && (
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-green-600">
                              Early Bird Available
                            </Badge>
                            <span className="text-muted-foreground">
                              ${ticket.earlyBirdPrice || ticket.price * 0.8} until early bird deadline
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {ticketTypes.length > 0 && (
                <>
                  <Separator />
                  
                  <div className="flex items-center justify-between text-lg font-medium">
                    <span>Total Capacity:</span>
                    <span>{ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0)} tickets</span>
                  </div>
                </>
              )}
              
              <Alert className={ticketTypes.length > 0 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
                <Info className={`h-4 w-4 ${ticketTypes.length > 0 ? "text-green-600" : "text-amber-600"}`} />
                <AlertDescription className={ticketTypes.length > 0 ? "text-green-800" : "text-amber-800"}>
                  {ticketTypes.length > 0 ? (
                    <>
                      <strong>Ready for Next Step:</strong> You've created {ticketTypes.length} ticket type{ticketTypes.length !== 1 ? 's' : ''} 
                      with a total capacity of {ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0)} seats. 
                      Click "Next Step" to place these tickets on your venue layout.
                    </>
                  ) : (
                    <>
                      <strong>Action Required:</strong> You need to create at least one ticket type before proceeding. 
                      Use the form above to add ticket types like VIP, Regular, or Accessible seating.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seating" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configure Seating Layout</CardTitle>
              <CardDescription>
                Place your tickets on the venue layout. Click to add individual seats or group tickets into tables. 
                You can place up to {ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0)} seats based on your ticket quantities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {form.watch('venueLayoutId') && (
                <Alert className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Using the selected venue layout. Place seats for each ticket type on the image below.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Show inventory tracker if tickets are created */}
              {ticketTypes.length > 0 && (
                <div className="mb-6">
                  <TicketInventoryTracker 
                    tickets={ticketTypes}
                    placedSeats={seats}
                  />
                </div>
              )}
              
              {venueImage && (
                <PremiumSeatingManager
                  venueImageUrl={venueImage}
                  onImageUpload={(file) => {}}
                  onSeatingConfigurationChange={handleSeatingConfigurationChange}
                  initialSeats={seats}
                  initialCategories={categories}
                  ticketTypes={ticketTypes}
                  startingTab="configure"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Summary</CardTitle>
              <CardDescription>
                Review your premium event setup before proceeding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  Venue Layout
                </h4>
                <p className="text-sm text-muted-foreground">
                  Venue image uploaded and configured
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Seating Configuration
                </h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Seats</p>
                    <p className="text-lg font-medium">{seats.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Seat Categories</p>
                    <p className="text-lg font-medium">{categories.length}</p>
                  </div>
                  {seats.some(seat => seat.tableId) && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Tables</p>
                        <p className="text-lg font-medium">
                          {new Set(seats.filter(s => s.tableId).map(s => s.tableId)).size}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Venue Type</p>
                        <p className="text-lg font-medium">Table Service</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Ticket Types
                </h4>
                <div className="space-y-2">
                  {generatedTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: ticket.color }}
                        />
                        {ticket.name}
                      </span>
                      <span>{ticket.quantity} × ${ticket.price}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <Alert className="mt-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Configuration Complete!</strong> Your premium event is set up with:
                  <ul className="list-disc list-inside mt-2">
                    <li>{seats.length} total seats available</li>
                    <li>{categories.length} different seating categories</li>
                    <li>{generatedTickets.length} ticket types created</li>
                    <li>{seats.filter(s => s.isAccessible).length} accessible seats included</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
                <p className="text-sm text-blue-800">
                  Click "Proceed to Final Review" to review all event details and publish your event. 
                  You can always come back to edit the venue configuration later.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => {
            if (activeTab === 'seating') {
              setActiveTab('tickets');
            } else if (activeTab === 'review') {
              setActiveTab('seating');
              setIsCompleted(false);
            }
          }}
          disabled={activeTab === 'tickets'}
        >
          Previous
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {activeTab === 'tickets' && "Create ticket types for your event"}
            {activeTab === 'seating' && "Place seats on the venue layout"}
            {activeTab === 'review' && "Review your configuration"}
          </p>
        </div>
        
        <Button
          onClick={handleAdvanceToNext}
          disabled={!canAdvance()}
          className={isCompleted && activeTab === 'review' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {activeTab === 'review' ? 'Proceed to Final Review' : 
           activeTab === 'seating' ? 'Complete Setup' : 'Next Step'}
        </Button>
      </div>
    </div>
  );
};