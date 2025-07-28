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
  Upload, 
  FileImage,
  Palette, 
  DollarSign,
  Users,
  Info,
  CheckCircle,
  MapPin,
  Plus,
  Trash2
} from 'lucide-react';
import { seatingService } from '@/lib/services/SeatingService';
import PremiumSeatingManager from '@/components/seating/PremiumSeatingManager';
import { SeatData, SeatCategory as EnhancedSeatCategory } from '@/types/seating';
import { imageUploadService } from '@/lib/services/ImageUploadService';
import { toast } from 'sonner';
import { TicketType } from './TicketConfigurationWizard';
import { useEventCreation } from '@/contexts/EventCreationContext';

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
  
  const [activeTab, setActiveTab] = useState<'venue' | 'seating' | 'tickets' | 'review'>('venue');
  const [venueImage, setVenueImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [categories, setCategories] = useState<EnhancedSeatCategory[]>([]);
  const [generatedTickets, setGeneratedTickets] = useState<TicketType[]>([]);
  
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
  
  // Load existing venue image if available
  useEffect(() => {
    const existingImage = form.watch('venueImageUrl');
    if (existingImage) {
      setVenueImage(existingImage);
      setActiveTab('seating');
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
      const imageUrl = await imageUploadService.uploadVenueImage(file);
      setVenueImage(imageUrl);
      form.setValue('venueImageUrl', imageUrl);
      form.setValue('hasVenueImage', true);
      addDebugUpdate(COMPONENT_NAME, 'venueImageUrl', imageUrl);
      addDebugUpdate(COMPONENT_NAME, 'hasVenueImage', true);
      toast.success('Venue image uploaded successfully');
      setActiveTab('seating');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload venue image');
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
    if (activeTab === 'venue' && venueImage) {
      setActiveTab('seating');
    } else if (activeTab === 'seating' && seats.length > 0) {
      setActiveTab('tickets');
    } else if (activeTab === 'tickets') {
      setActiveTab('review');
    } else if (activeTab === 'review' && onStepAdvance) {
      onStepAdvance();
    }
  };

  const canAdvance = () => {
    switch (activeTab) {
      case 'venue':
        return !!venueImage;
      case 'seating':
        return seats.length > 0;
      case 'tickets':
        return generatedTickets.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Premium Event Setup</h2>
        <p className="text-muted-foreground">
          Upload venue, configure seating, and tickets will be created automatically
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="venue" disabled={activeTab !== 'venue' && !venueImage}>
            <FileImage className="h-4 w-4 mr-2" />
            Venue
          </TabsTrigger>
          <TabsTrigger value="seating" disabled={!venueImage}>
            <MapPin className="h-4 w-4 mr-2" />
            Seating
          </TabsTrigger>
          <TabsTrigger value="tickets" disabled={seats.length === 0}>
            <DollarSign className="h-4 w-4 mr-2" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="review" disabled={generatedTickets.length === 0}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="venue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Venue Layout</CardTitle>
              <CardDescription>
                Upload an image of your venue floor plan or seating chart
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!venueImage ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <Label htmlFor="venue-upload" className="cursor-pointer">
                    <span className="text-lg font-medium">Click to upload venue image</span>
                    <Input
                      id="venue-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </Label>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports JPG, PNG, SVG up to 10MB
                  </p>
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

        <TabsContent value="seating" className="space-y-4">
          {venueImage && (
            <PremiumSeatingManager
              venueImageUrl={venueImage}
              onImageUpload={(file) => {}}
              onSeatingConfigurationChange={handleSeatingConfigurationChange}
              initialSeats={seats}
              initialCategories={categories}
              startingTab="configure"
            />
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Ticket Types</CardTitle>
              <CardDescription>
                Tickets have been automatically created based on your seating configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedTickets.map((ticket) => (
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
                </div>
              ))}
              
              <Separator />
              
              <div className="flex items-center justify-between text-lg font-medium">
                <span>Total Capacity:</span>
                <span>{seats.length} seats</span>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {seats.some(seat => seat.tableId) ? (
                    <>
                      <strong>Table Service Venue:</strong> Customers must book entire tables. 
                      Each seat generates a ticket, but they're sold as complete table units. 
                      For example, a 10-seat table priced at $200 will generate 10 individual tickets 
                      when purchased.
                    </>
                  ) : (
                    <>
                      Each seat placed on the venue layout will generate an individual ticket. 
                      Tickets are grouped by the seat category for easier management.
                    </>
                  )}
                </AlertDescription>
              </Alert>
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
              
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your premium event is configured with {seats.length} seats across {categories.length} categories, 
                  generating {generatedTickets.length} ticket types.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            const tabOrder = ['venue', 'seating', 'tickets', 'review'] as const;
            const currentIndex = tabOrder.indexOf(activeTab);
            if (currentIndex > 0) {
              setActiveTab(tabOrder[currentIndex - 1]);
            }
          }}
          disabled={activeTab === 'venue'}
        >
          Previous
        </Button>
        
        <Button
          onClick={handleAdvanceToNext}
          disabled={!canAdvance()}
        >
          {activeTab === 'review' ? 'Continue to Review' : 'Next'}
        </Button>
      </div>
    </div>
  );
};