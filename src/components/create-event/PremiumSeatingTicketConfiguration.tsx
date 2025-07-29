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
  Upload as UploadIcon, 
  FileImage,
  Palette, 
  DollarSign,
  Users,
  Info,
  CheckCircle,
  MapPin,
  Plus,
  Trash2,
  Building2
} from 'lucide-react';
import { seatingService } from '@/lib/services/SeatingService';
import PremiumSeatingManager from '@/components/seating/PremiumSeatingManager';
import { SeatData, SeatCategory as EnhancedSeatCategory } from '@/types/seating';
import { imageUploadService } from '@/lib/services/ImageUploadService';
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
  
  const [activeTab, setActiveTab] = useState<'venue' | 'tickets' | 'seating' | 'review'>('venue');
  const [currentStep, setCurrentStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [venueImage, setVenueImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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
  
  // Initialize state based on what's already completed
  useEffect(() => {
    const existingImage = form.watch('venueImageUrl');
    const hasSelectedVenue = form.watch('venueLayoutId');
    const proceedWithCustom = form.watch('proceedWithCustomVenue');
    const basicInfoCompleted = form.watch('title') && form.watch('date');
    const eventImagesUploaded = form.watch('images')?.banner || form.watch('images')?.postcard;
    
    // Set initial step based on what's completed
    if (basicInfoCompleted && eventImagesUploaded) {
      setCurrentStep(3); // Start at venue management
    }
    
    if (existingImage) {
      setVenueImage(existingImage);
      if (hasSelectedVenue) {
        setCurrentStep(4); // Move to tickets if venue is selected
        setActiveTab('tickets');
      }
    } else if (proceedWithCustom || !hasSelectedVenue) {
      setActiveTab('venue');
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // Generate a temporary venue ID for the upload
      const tempVenueId = `temp-${Date.now()}`;
      const uploadResult = await imageUploadService.uploadVenueImage(file, tempVenueId);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }
      
      const imageUrl = uploadResult.url!; // We know it exists after success check
      setVenueImage(imageUrl);
      form.setValue('venueImageUrl', imageUrl);
      form.setValue('hasVenueImage', true);
      addDebugUpdate(COMPONENT_NAME, 'venueImageUrl', imageUrl);
      addDebugUpdate(COMPONENT_NAME, 'hasVenueImage', true);
      toast.success('Venue image uploaded successfully');
      // Move to the next step (tickets) after successful upload
      setCurrentStep(4);
      setActiveTab('tickets');
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to upload venue image: ${errorMessage}`);
    } finally {
      setUploadingImage(false);
    }
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
    // Sequential step progression
    if (currentStep === 3 && activeTab === 'venue' && venueImage) {
      setCurrentStep(4);
      setActiveTab('tickets');
    } else if (currentStep === 4 && activeTab === 'tickets' && ticketTypes.length > 0) {
      setCurrentStep(5);
      setActiveTab('seating');
    } else if (currentStep === 5 && activeTab === 'seating' && seats.length > 0) {
      setIsCompleted(true);
      setActiveTab('review');
    } else if (activeTab === 'review' && onStepAdvance) {
      // Clear the proceedWithCustomVenue flag when advancing
      form.setValue('proceedWithCustomVenue', false);
      onStepAdvance();
    }
  };

  const canAdvance = () => {
    switch (activeTab) {
      case 'venue':
        return !!venueImage;
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
        <h2 className="text-2xl font-bold mb-2">Premium Event Venue Configuration</h2>
        <p className="text-muted-foreground mb-4">
          Complete the venue setup process step by step
        </p>
        
        {/* Step indicators */}
        <div className="flex justify-center items-center space-x-4 text-sm">
          <div className={cn(
            "flex items-center",
            currentStep >= 3 ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center mr-2",
              currentStep >= 3 ? "bg-primary text-white" : "bg-gray-200"
            )}>
              3
            </div>
            Venue
          </div>
          <div className="text-muted-foreground">→</div>
          <div className={cn(
            "flex items-center",
            currentStep >= 4 ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center mr-2",
              currentStep >= 4 ? "bg-primary text-white" : "bg-gray-200"
            )}>
              4
            </div>
            Tickets
          </div>
          <div className="text-muted-foreground">→</div>
          <div className={cn(
            "flex items-center",
            currentStep >= 5 ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center mr-2",
              currentStep >= 5 ? "bg-primary text-white" : "bg-gray-200"
            )}>
              5
            </div>
            Seating
          </div>
          <div className="text-muted-foreground">→</div>
          <div className={cn(
            "flex items-center",
            isCompleted ? "text-green-600 font-medium" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center mr-2",
              isCompleted ? "bg-green-600 text-white" : "bg-gray-200"
            )}>
              ✓
            </div>
            Ready
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">{Math.round((currentStep / 5) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger 
            value="venue" 
            disabled={currentStep < 3}
            className={currentStep === 3 ? "ring-2 ring-primary" : ""}
          >
            <FileImage className="h-4 w-4 mr-2" />
            3. Venue
          </TabsTrigger>
          <TabsTrigger 
            value="tickets" 
            disabled={currentStep < 4 || !venueImage}
            className={currentStep === 4 ? "ring-2 ring-primary" : ""}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            4. Tickets
          </TabsTrigger>
          <TabsTrigger 
            value="seating" 
            disabled={currentStep < 5 || ticketTypes.length === 0}
            className={currentStep === 5 ? "ring-2 ring-primary" : ""}
          >
            <MapPin className="h-4 w-4 mr-2" />
            5. Seating
          </TabsTrigger>
          <TabsTrigger 
            value="review" 
            disabled={!isCompleted}
            className={isCompleted ? "ring-2 ring-green-500" : ""}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="venue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Venue Management</CardTitle>
              <CardDescription>
                Upload your venue layout image or select from existing venues. This will be used to place seats and tables.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!venueImage ? (
                <div className="venue-upload-container border-2 border-dashed border-gray-300 rounded-lg p-8 text-center relative overflow-hidden group hover:border-primary transition-colors">
                  {/* Animated background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 animate-pulse" />
                  {/* Ripple effect */}
                  <div className="venue-upload-ripple absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20" />
                  
                  <div className="relative z-10">
                    <div className="relative inline-block">
                      <UploadIcon className="venue-upload-icon h-16 w-16 mx-auto text-primary mb-4" />
                      <div className="absolute -inset-2 bg-primary/20 rounded-full animate-ping" />
                    </div>
                    
                    <Label htmlFor="venue-upload" className="cursor-pointer block">
                      <div className="venue-upload-button inline-flex items-center justify-center px-8 py-4 mb-4 text-lg font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transform transition-all hover:scale-105 shadow-lg">
                        <UploadIcon className="mr-2 h-5 w-5" />
                        Upload Venue Image
                      </div>
                      <Input
                        id="venue-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </Label>
                    
                    <p className="text-lg font-medium text-foreground mb-2">
                      Click the button above to upload your venue layout
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports JPG, PNG, SVG up to 10MB
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t relative z-10">
                    <p className="text-sm text-muted-foreground mb-2">
                      Want to use a saved venue instead?
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('/dashboard/venues', '_blank')}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Manage Venues
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <img 
                    src={venueImage} 
                    alt="Venue layout" 
                    className="w-full max-h-96 object-contain rounded-lg border"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setVenueImage(null);
                      form.setValue('venueImageUrl', '');
                      form.setValue('hasVenueImage', false);
                      setSeats([]);
                      setCategories([]);
                      setGeneratedTickets([]);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove and upload different image
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Create Ticket Types</CardTitle>
              <CardDescription>
                Define your ticket types and quantities. You'll place these tickets on the venue layout in the next step.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ticket creation form */}
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Step 4 Instructions:</strong> Create your ticket types below. Each ticket type represents a different 
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
              <CardTitle>Step 5: Configure Seating Layout</CardTitle>
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
            if (currentStep === 4 && activeTab === 'tickets') {
              setCurrentStep(3);
              setActiveTab('venue');
            } else if (currentStep === 5 && activeTab === 'seating') {
              setCurrentStep(4);
              setActiveTab('tickets');
            } else if (activeTab === 'review') {
              setCurrentStep(5);
              setActiveTab('seating');
              setIsCompleted(false);
            }
          }}
          disabled={currentStep === 3 && activeTab === 'venue'}
        >
          Previous
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {currentStep === 3 && "Upload your venue layout to continue"}
            {currentStep === 4 && "Create ticket types for your event"}
            {currentStep === 5 && "Place seats on the venue layout"}
            {isCompleted && "Review your configuration"}
          </p>
        </div>
        
        <Button
          onClick={handleAdvanceToNext}
          disabled={!canAdvance()}
          className={isCompleted && activeTab === 'review' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {activeTab === 'review' ? 'Proceed to Final Review' : 
           currentStep === 5 ? 'Complete Setup' : 'Next Step'}
        </Button>
      </div>
    </div>
  );
};