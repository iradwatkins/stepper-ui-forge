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
import { 
  Upload, 
  FileImage,
  Palette, 
  DollarSign,
  Users,
  Info,
  CheckCircle,
  MapPin
} from 'lucide-react';
import { seatingService } from '@/lib/services/SeatingService';
import PremiumSeatingManager from '@/components/seating/PremiumSeatingManager';
import { SeatData, SeatCategory as EnhancedSeatCategory } from '@/types/seating';
import { imageUploadService } from '@/lib/services/ImageUploadService';
import { toast } from 'sonner';

// Import TicketType from the wizard component
interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  color?: string;
}

interface SeatingChartWizardProps {
  form: UseFormReturn<EventFormData>;
  eventType: 'simple' | 'ticketed' | 'premium' | '';
  ticketTypes?: TicketType[];
  onSeatingConfigured?: (seatingData: SeatingConfig) => void;
  startingTab?: 'setup' | 'configure' | 'place' | 'info';
  showOnlyTab?: 'setup' | 'configure' | 'place' | 'info';
  onStepAdvance?: () => boolean;
}

interface SeatingConfig {
  venueId?: string;
  seatingChartId?: string;
  ticketMappings: TicketMapping[];
}

interface TicketMapping {
  ticketTypeId: string;
  sectionName: string;
  color: string;
  seats: number;
  description?: string;
}

interface Seat {
  id: string;
  x: number;
  y: number;
  ticketTypeId: string;
  sectionName: string;
  color: string;
  seatNumber: number;
}

const createDefaultTicketMappings = (ticketTypes: TicketType[]): TicketMapping[] => {
  const colors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#F87171', '#A78BFA'];
  
  return ticketTypes.map((ticket, index) => ({
    ticketTypeId: ticket.id,
    sectionName: `${ticket.name} Section`,
    color: colors[index % colors.length],
    seats: Math.max(50, ticket.quantity || 50),
    description: `Seating section for ${ticket.name} tickets`
  }));
};

export const SeatingChartWizard = ({ 
  form, 
  eventType, 
  ticketTypes = [], 
  onSeatingConfigured,
  startingTab,
  showOnlyTab,
  onStepAdvance
}: SeatingChartWizardProps) => {
  const [loading, setLoading] = useState(false);
  const [hasPreSelectedVenue, setHasPreSelectedVenue] = useState(false);
  const [seatingConfig, setSeatingConfig] = useState<SeatingConfig>(() => {
    // Create mappings from ticket types
    if (ticketTypes.length > 0) {
      return {
        ticketMappings: createDefaultTicketMappings(ticketTypes)
      };
    } else {
      return {
        ticketMappings: []
      };
    }
  });
  const [uploadedChart, setUploadedChart] = useState<File | null>(null);
  const [chartPreview, setChartPreview] = useState<string | null>(null);
  const [placedSeats, setPlacedSeats] = useState<Seat[]>([]);
  const [enhancedSeats, setEnhancedSeats] = useState<SeatData[]>([]);
  const [enhancedCategories, setEnhancedCategories] = useState<EnhancedSeatCategory[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'configure' | 'place-seats' | 'finalize'>(
    showOnlyTab ? 
      (showOnlyTab === 'setup' ? 'upload' : 
       showOnlyTab === 'configure' ? 'configure' : 
       showOnlyTab === 'place' ? 'place-seats' : 'finalize') 
      : (startingTab ? 
          (startingTab === 'setup' ? 'upload' : 
           startingTab === 'configure' ? 'configure' : 
           startingTab === 'place' ? 'place-seats' : 'finalize') 
          : 'upload')
  );

  // Load persisted data from form on component mount
  useEffect(() => {
    const formData = form.getValues();
    
    // Check if venue was pre-selected
    if (formData.venueLayoutId) {
      setHasPreSelectedVenue(true);
      // If venue is pre-selected, skip to configuration step
      if (!showOnlyTab && currentStep === 'upload') {
        setCurrentStep('configure');
      }
    }
    
    // Load venue image
    if (formData.venueImageUrl) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Loading venue image from form data:', formData.venueImageUrl.substring(0, 50) + '...');
      }
      setChartPreview(formData.venueImageUrl);
    }
    
    // Load seats and categories with proper type validation
    if (formData.seats && Array.isArray(formData.seats)) {
      // Filter out invalid seats and ensure all required fields exist
      const validSeats = formData.seats.filter((seat): seat is SeatData => 
        seat && typeof seat === 'object' && 
        'id' in seat && 'x' in seat && 'y' in seat && 'seatNumber' in seat &&
        'category' in seat && 'categoryColor' in seat && 'price' in seat &&
        'status' in seat && 'isADA' in seat
      );
      setEnhancedSeats(validSeats);
    }
    
    // Convert ticket types to seat categories if no seat categories exist
    if ((!formData.seatCategories || formData.seatCategories.length === 0) && ticketTypes.length > 0) {
      const colors = ['#10B981', '#F59E0B', '#8B5CF6', '#3B82F6', '#F87171'];
      const categoriesFromTickets: EnhancedSeatCategory[] = ticketTypes.map((ticket, index) => ({
        id: ticket.id,
        name: ticket.name,
        color: colors[index % colors.length],
        basePrice: ticket.price,
        maxCapacity: ticket.quantity,
        amenities: ticket.name.toLowerCase().includes('vip') ? ['VIP seating', 'Complimentary drinks'] : ['Standard seating'],
        viewQuality: ticket.name.toLowerCase().includes('vip') ? 'excellent' : 
                    ticket.name.toLowerCase().includes('premium') ? 'good' : 'fair'
      }));
      setEnhancedCategories(categoriesFromTickets);
      form.setValue('seatCategories', categoriesFromTickets);
    } else if (formData.seatCategories && Array.isArray(formData.seatCategories)) {
      // Filter out invalid categories and ensure all required fields exist
      const validCategories = formData.seatCategories.filter((category): category is EnhancedSeatCategory => 
        category && typeof category === 'object' &&
        'id' in category && 'name' in category && 'color' in category &&
        'basePrice' in category && 'maxCapacity' in category && 'amenities' in category &&
        'viewQuality' in category
      );
      setEnhancedCategories(validCategories);
    }
  }, [form, ticketTypes]);

  // Additional effect to ensure chart preview is loaded when in showOnlyTab mode
  useEffect(() => {
    if (showOnlyTab) {
      const formData = form.getValues();
      if (formData.venueImageUrl && !chartPreview) {
        console.log(`Syncing chart preview for showOnlyTab ${showOnlyTab} mode`);
        setChartPreview(formData.venueImageUrl);
      }
    }
  }, [showOnlyTab, form, chartPreview]);

  // Debug form data changes
  useEffect(() => {
    if (showOnlyTab) {
      const subscription = form.watch((value, { name }) => {
        if (name === 'venueImageUrl' || name === 'hasVenueImage' || name === 'seats' || name === 'seatCategories') {
          console.log(`Form field changed in ${showOnlyTab} mode:`, name, '=', value[name as keyof typeof value] ? 'SET' : 'NOT_SET');
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [form, showOnlyTab]);

  useEffect(() => {
    if (onSeatingConfigured) {
      onSeatingConfigured(seatingConfig);
    }
  }, [seatingConfig, onSeatingConfigured]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG)');
      return;
    }

    // Check file size (max 10MB to match storage bucket limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadedChart(file);
    setLoading(true);

    try {
      // Generate unique venue ID for this event
      const venueId = `venue_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      // Upload image to Supabase Storage
      if (process.env.NODE_ENV === 'development') {
        console.log('🌅 Uploading venue image to Supabase Storage...');
      }
      const uploadResult = await imageUploadService.uploadVenueImage(file, venueId);
      
      if (uploadResult.success && uploadResult.url) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Venue image uploaded successfully:', uploadResult.url);
        }
        
        // Set both the permanent URL and preview
        setChartPreview(uploadResult.url);
        
        // Persist permanent URL to form data
        form.setValue('venueImageUrl', uploadResult.url);
        form.setValue('hasVenueImage', true);
        // Store venue ID in a custom field or skip if not needed
        
        // Trigger form validation to update navigation state
        form.trigger(['venueImageUrl', 'hasVenueImage']);
        
        // Log form data for debugging
        if (process.env.NODE_ENV === 'development') {
          const currentValues = form.getValues();
          console.log('✅ Supabase upload - Form data updated:', {
            venueImageUrl: currentValues.venueImageUrl ? 'SET (Supabase URL)' : 'NOT_SET',
            hasVenueImage: currentValues.hasVenueImage,
            showOnlyTab,
            onStepAdvance: !!onStepAdvance
          });
        }
        
        // Move to configuration step for internal wizard (no auto-advance in combined mode)
        setCurrentStep('configure');
        toast.success('Venue image uploaded successfully to cloud storage');
      } else {
        console.error('❌ Venue image upload failed:', uploadResult.error);
        toast.error(`Upload failed: ${uploadResult.error || 'Unknown error'}`);
        
        // Fallback to base64 preview for immediate display
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          console.log('⚠️ Using base64 fallback for preview');
          setChartPreview(imageUrl);
          form.setValue('venueImageUrl', imageUrl);
          form.setValue('hasVenueImage', true);
          form.trigger(['venueImageUrl', 'hasVenueImage']);
          setCurrentStep('configure');
        };
        reader.readAsDataURL(file);
        toast.success('Using local preview (upload to cloud failed)');
      }
    } catch (error) {
      console.error('❌ Error during venue image upload:', error);
      toast.error('Failed to upload venue image');
      
      // Fallback to base64 preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        console.log('⚠️ Using base64 fallback due to error');
        setChartPreview(imageUrl);
        form.setValue('venueImageUrl', imageUrl);
        form.setValue('hasVenueImage', true);
        form.trigger(['venueImageUrl', 'hasVenueImage']);
        setCurrentStep('configure');
      };
      reader.readAsDataURL(file);
      toast.success('Using local preview (cloud upload error)');
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (index: number, field: keyof TicketMapping, value: string | number) => {
    setSeatingConfig(prev => ({
      ...prev,
      ticketMappings: prev.ticketMappings.map((mapping, i) => 
        i === index ? { ...mapping, [field]: value } : mapping
      )
    }));
  };

  const updateMappingSeats = (index: number, seats: number) => {
    updateMapping(index, 'seats', seats);
  };

  const updateMappingSectionName = (index: number, sectionName: string) => {
    updateMapping(index, 'sectionName', sectionName);
  };

  const updateMappingColor = (index: number, color: string) => {
    updateMapping(index, 'color', color);
  };

  const getTotalSeats = () => {
    return seatingConfig.ticketMappings.reduce((sum, mapping) => sum + mapping.seats, 0);
  };

  const getTotalRevenuePotential = () => {
    return seatingConfig.ticketMappings.reduce((sum, mapping) => {
      const ticketType = ticketTypes.find(t => t.id === mapping.ticketTypeId);
      return sum + ((ticketType?.price || 0) * mapping.seats);
    }, 0);
  };

  const handleSeatsConfigured = (seats: Seat[]) => {
    setPlacedSeats(seats);
    
    // Update seating config with actual seat counts
    setSeatingConfig(prev => ({
      ...prev,
      ticketMappings: prev.ticketMappings.map(mapping => ({
        ...mapping,
        seats: seats.filter(seat => seat.ticketTypeId === mapping.ticketTypeId).length
      }))
    }));
  };

  const handleEnhancedSeatingConfigured = (seats: SeatData[], categories: EnhancedSeatCategory[]) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🪑 Saving seating configuration:', {
          seatCount: seats.length,
          categoryCount: categories.length,
          showOnlyTab,
          hasOnStepAdvance: !!onStepAdvance
        });
      }

      setEnhancedSeats(seats);
      setEnhancedCategories(categories);
      
      // Convert enhanced seats back to legacy format for compatibility
      const legacySeats: Seat[] = seats.map((seat, index) => ({
        id: seat.id,
        x: seat.x,
        y: seat.y,
        ticketTypeId: seat.category,
        sectionName: seat.section || '',
        color: seat.categoryColor,
        seatNumber: index + 1
      }));
      
      setPlacedSeats(legacySeats);
      
      // Persist to form data for state management
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Persisting seating data to form...');
      }
      form.setValue('seats', seats);
      form.setValue('seatCategories', categories);
      
      // Trigger form validation to update navigation state
      const triggerResult = form.trigger(['seats', 'seatCategories', 'venueImageUrl', 'hasVenueImage']);
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Form validation triggered, result:', triggerResult);
      }
      
      // Force a form value update to trigger wizard navigation recalculation
      setTimeout(() => {
        const currentFormData = form.getValues();
        console.log('✅ Form data verification after delay:', {
          hasSeats: Array.isArray(currentFormData.seats) && currentFormData.seats.length > 0,
          seatCount: currentFormData.seats?.length || 0,
          hasCategories: Array.isArray(currentFormData.seatCategories) && currentFormData.seatCategories.length > 0,
          categoryCount: currentFormData.seatCategories?.length || 0,
          hasVenueImage: currentFormData.hasVenueImage,
          venueImageUrl: currentFormData.venueImageUrl ? 'SET' : 'NOT_SET'
        });
        
        // Trigger another validation to ensure wizard navigation updates
        form.trigger();
      }, 100);
      
      // Update seating config with actual seat counts
      setSeatingConfig(prev => ({
        ...prev,
        ticketMappings: prev.ticketMappings.map(mapping => ({
          ...mapping,
          seats: seats.filter(seat => seat.category === mapping.ticketTypeId).length
        }))
      }));
      
      // Auto-advance only when ALL seats are placed (complete ticket assignment)
      const totalSeatsNeeded = ticketTypes.reduce((total, ticket) => total + ticket.quantity, 0);
      if (onStepAdvance && totalSeatsNeeded > 0 && seats.length >= totalSeatsNeeded) {
        // In combined mode (no showOnlyTab) or specific place mode
        if (!showOnlyTab || showOnlyTab === 'place') {
          console.log(`⏭️ Auto-advancing to next step - ALL seats placed (${seats.length}/${totalSeatsNeeded})`);
          setTimeout(() => {
            onStepAdvance();
          }, 500); // Increased delay to ensure form updates are processed
        }
      } else if (totalSeatsNeeded > 0) {
        console.log(`📍 Seats progress: ${seats.length}/${totalSeatsNeeded} - waiting for completion before auto-advance`);
      }

      console.log('✅ Seating configuration saved successfully');
    } catch (error) {
      console.error('❌ Error saving seating configuration:', error);
      toast.error('Failed to save seating configuration. Please try again.');
    }
  };

  const convertToEnhancedCategories = (): EnhancedSeatCategory[] => {
    return seatingConfig.ticketMappings.map(mapping => {
      const ticketType = ticketTypes.find(t => t.id === mapping.ticketTypeId);
      return {
        id: mapping.ticketTypeId,
        name: mapping.sectionName,
        color: mapping.color,
        basePrice: ticketType?.price || 0,
        maxCapacity: mapping.seats,
        amenities: ['Standard seating'],
        viewQuality: mapping.sectionName.toLowerCase().includes('vip') ? 'excellent' : 
                    mapping.sectionName.toLowerCase().includes('premium') ? 'good' : 'fair'
      };
    });
  };

  const handleProceedToSeatPlacement = () => {
    if (seatingConfig.ticketMappings.length === 0) {
      toast.error('Please configure at least one ticket type mapping');
      return;
    }
    setCurrentStep('place-seats');
  };

  const handleProceedToFinalize = () => {
    if (placedSeats.length === 0) {
      toast.error('Please place at least one seat on the floor plan');
      return;
    }
    setCurrentStep('finalize');
  };

  const handleCreateSeatingChart = async () => {
    const formData = form.getValues();
    if (!formData.title) {
      toast.error('Please enter event title first');
      return;
    }

    if (!chartPreview) {
      toast.error('Please upload a venue floor plan first');
      return;
    }

    if (enhancedSeats.length === 0) {
      toast.error('Please place at least one seat on the floor plan');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('🏟️ Creating interactive seating chart...');
      
      // Create comprehensive seating chart data using enhanced seats
      const chartData = {
        type: 'premium',
        uploadedChart: uploadedChart?.name || 'venue-layout.png',
        imageDimensions: { width: 800, height: 600 },
        venueImageUrl: chartPreview,
        seats: enhancedSeats.map(seat => ({
          id: seat.id,
          x: seat.x,
          y: seat.y,
          seatNumber: seat.seatNumber,
          ticketTypeId: seat.category,
          price: seat.price,
          available: seat.status === 'available',
          section: seat.section,
          category: seat.category,
          categoryColor: seat.categoryColor,
          isADA: seat.isADA,
          viewQuality: seat.viewQuality,
          amenities: seat.amenities || []
        })),
        categories: enhancedCategories.map(category => ({
          id: category.id,
          name: category.name,
          color: category.color,
          basePrice: category.basePrice,
          maxCapacity: category.maxCapacity,
          amenities: category.amenities,
          viewQuality: category.viewQuality
        })),
        sections: enhancedCategories.map(category => {
          const categorySeats = enhancedSeats.filter(seat => seat.category === category.id);
          
          return {
            id: category.id,
            name: category.name,
            color: category.color,
            ticketTypeId: category.id,
            ticketTypeName: category.name,
            price: category.basePrice,
            seatCount: categorySeats.length,
            seats: categorySeats.map(seat => ({
              id: seat.id,
              x: seat.x,
              y: seat.y,
              seatNumber: seat.seatNumber,
              price: seat.price,
              available: seat.status === 'available'
            }))
          };
        })
      };

      // Store comprehensive seating chart configuration in form
      form.setValue('seatingChartData', chartData);
      form.setValue('seatingChartImageUrl', chartPreview);
      form.setValue('hasInteractiveSeatingChart', true);
      
      // Update local config
      setSeatingConfig(prev => ({
        ...prev,
        seatingChartData: chartData
      }));

      // Trigger form validation
      await form.trigger(['seatingChartData', 'seatingChartImageUrl', 'hasInteractiveSeatingChart']);

      console.log('✅ Interactive seating chart created successfully');
      toast.success('Interactive seating chart created successfully!');
      
      // Auto-advance to next wizard step if in combined mode
      if (onStepAdvance) {
        console.log('⏭️ Auto-advancing to next wizard step...');
        setTimeout(() => {
          onStepAdvance();
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error creating interactive seating chart:', error);
      toast.error('Failed to create interactive seating chart');
    } finally {
      setLoading(false);
    }
  };

  if (eventType !== 'premium') {
    return null;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <>
            {/* Venue Info Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Venue Information
                </CardTitle>
                <CardDescription>
                  Using venue information from Step 1
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4">
                  <div className="font-semibold">{form.watch('venueName') || 'Venue Name'}</div>
                  <div className="text-sm text-muted-foreground">{form.watch('address') || 'Venue Address'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Venue Floor Plan Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Venue Floor Plan
                </CardTitle>
                <CardDescription>
                  Upload an image of your venue's floor plan or seating layout. This is different from your event's marketing images and will be used for interactive seat selection.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  {!chartPreview ? (
                    <div className="space-y-4">
                      <FileImage className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div>
                        <Label htmlFor="chart-upload" className="cursor-pointer">
                          <div className="text-lg font-medium mb-2">Upload Venue Floor Plan</div>
                          <div className="text-sm text-muted-foreground mb-4">
                            Upload a floor plan or seating layout image (PNG, JPG, SVG - Max 10MB)
                          </div>
                          <div className="text-xs text-muted-foreground mb-2 p-2 bg-blue-50 rounded">
                            💡 This should be your venue's layout diagram, not marketing images
                          </div>
                          <Button variant="outline" className="pointer-events-none">
                            <Upload className="w-4 h-4 mr-2" />
                            Choose File
                          </Button>
                        </Label>
                        <Input
                          id="chart-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <img 
                        src={chartPreview} 
                        alt="Seating Chart Preview" 
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <div className="flex items-center gap-2 justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium">Chart uploaded: {uploadedChart?.name}</span>
                      </div>
                      <Button variant="outline" onClick={() => {
                        setUploadedChart(null);
                        setChartPreview(null);
                        setCurrentStep('upload');
                      }}>
                        Replace Chart
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        );

      case 'configure':
        return (
          <>
            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Seating Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold">{getTotalSeats()}</div>
                    <div className="text-sm text-muted-foreground">Total Seats</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Palette className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-2xl font-bold">{seatingConfig.ticketMappings.length}</div>
                    <div className="text-sm text-muted-foreground">Ticket Types</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="text-2xl font-bold">${getTotalRevenuePotential()}</div>
                    <div className="text-sm text-muted-foreground">Max Revenue</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Ticket Type to Seating Mapping */}
            <Card>
              <CardHeader>
                <CardTitle>Map Ticket Types to Seating Sections</CardTitle>
                <CardDescription>
                  Configure how your ticket types correspond to seating sections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticketTypes.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No ticket types found. Please go back to the ticket configuration step to create ticket types first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  seatingConfig.ticketMappings.map((mapping, index) => {
                    const ticketType = ticketTypes.find(t => t.id === mapping.ticketTypeId);
                    return (
                      <Card key={mapping.ticketTypeId}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Ticket Type</Label>
                              <div className="p-3 bg-muted rounded-lg">
                                <div className="font-semibold">{ticketType?.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ${ticketType?.price} • {ticketType?.quantity} available
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Section Name</Label>
                              <Input
                                value={mapping.sectionName}
                                onChange={(e) => updateMappingSectionName(index, e.target.value)}
                                placeholder="Section name..."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Section Color</Label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={mapping.color}
                                  onChange={(e) => updateMappingColor(index, e.target.value)}
                                  className="w-12 h-10 border rounded"
                                />
                                <Badge style={{ backgroundColor: mapping.color, color: 'white' }}>
                                  {mapping.sectionName}
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Max Seats</Label>
                              <Input
                                type="number"
                                value={mapping.seats}
                                onChange={(e) => updateMappingSeats(index, parseInt(e.target.value) || 0)}
                                placeholder="0"
                                min="1"
                                max={ticketType?.quantity || 1000}
                              />
                              <div className="text-xs text-muted-foreground">
                                Max: {ticketType?.quantity} (from ticket limit)
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleProceedToSeatPlacement} size="lg">
                Proceed to Seat Placement
              </Button>
            </div>
          </>
        );

      case 'place-seats':
        return (
          <PremiumSeatingManager
            venueImageUrl={chartPreview!}
            onImageUpload={() => {}} // Already handled in upload step
            onSeatingConfigurationChange={handleEnhancedSeatingConfigured}
            initialSeats={enhancedSeats}
            initialCategories={convertToEnhancedCategories()}
            maxTotalSeats={ticketTypes.reduce((total, ticket) => total + ticket.quantity, 0)}
            ticketTypes={ticketTypes}
            startingTab="place"
            showOnlyTab="place"
          />
        );

      case 'finalize':
        return (
          <>
            {/* Final Review */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Finalize Seating Setup
                </CardTitle>
                <CardDescription>
                  Review your seating configuration and create the interactive seating chart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileImage className="w-4 h-4" />
                      Venue Floor Plan
                    </h4>
                    {chartPreview ? (
                      <img 
                        src={chartPreview} 
                        alt="Venue Floor Plan" 
                        className="w-full h-48 object-contain rounded border bg-gray-50"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded border flex items-center justify-center">
                        <span className="text-gray-500">No floor plan uploaded</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Seat Configuration Summary
                    </h4>
                    <div className="space-y-3">
                      {enhancedCategories.map(category => {
                        const categorySeats = enhancedSeats.filter(seat => seat.category === category.id);
                        const totalValue = categorySeats.length * category.basePrice;
                        return (
                          <div key={category.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <span className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm" 
                                  style={{ backgroundColor: category.color }}
                                />
                                <span className="font-medium">{category.name}</span>
                              </span>
                              <Badge variant="outline">{category.viewQuality}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                              <div>Seats: {categorySeats.length}</div>
                              <div>Price: ${category.basePrice}</div>
                              <div>Max Capacity: {category.maxCapacity}</div>
                              <div>Value: ${totalValue}</div>
                            </div>
                            {category.amenities.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                {category.amenities.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <Separator />
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center font-medium">
                          <span>Total Seats Placed</span>
                          <span>{enhancedSeats.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Total Revenue Potential</span>
                          <span>${enhancedSeats.reduce((sum, seat) => sum + seat.price, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Completion Status</span>
                          <span className={enhancedSeats.length > 0 ? 'text-green-600' : 'text-yellow-600'}>
                            {enhancedSeats.length > 0 ? '✅ Ready' : '⚠️ No seats placed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleCreateSeatingChart} 
                    disabled={loading || !chartPreview || enhancedSeats.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? 'Creating Seating Chart...' : 'Create Interactive Seating Chart'}
                  </Button>
                  
                  {enhancedSeats.length === 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        You need to place at least one seat before creating the interactive seating chart.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This will create your venue and interactive seating chart. Customers will be able to select specific seats based on their chosen ticket type.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </>
        );

      default:
        return null;
    }
  };

  // If showOnlyTab is specified, render the appropriate content
  if (showOnlyTab) {
    const tabMap = {
      'setup': 'setup',
      'configure': 'configure', 
      'place': 'place',
      'info': 'info'
    };

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">
            {showOnlyTab === 'setup' && 'Upload Venue Layout'}
            {showOnlyTab === 'configure' && 'Configure Seat Categories'}
            {showOnlyTab === 'place' && 'Place Seats on Layout'}
            {showOnlyTab === 'info' && 'Finalize Venue Information'}
          </h2>
          <p className="text-muted-foreground">
            {showOnlyTab === 'setup' && 'Upload your venue floor plan image to get started'}
            {showOnlyTab === 'configure' && 'Set up seat categories and pricing tiers'}
            {showOnlyTab === 'place' && 'Click on the layout to place seats in different categories'}
            {showOnlyTab === 'info' && 'Review venue information and finalize your setup'}
          </p>
        </div>

        {/* Show finalize step content for 'info' tab */}
        {showOnlyTab === 'info' ? (
          <>
            {/* Final Review */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Finalize Seating Setup
                </CardTitle>
                <CardDescription>
                  Review your seating configuration and create the interactive seating chart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileImage className="w-4 h-4" />
                      Venue Floor Plan
                    </h4>
                    {chartPreview ? (
                      <img 
                        src={chartPreview} 
                        alt="Venue Floor Plan" 
                        className="w-full h-48 object-contain rounded border bg-gray-50"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded border flex items-center justify-center">
                        <span className="text-gray-500">No floor plan uploaded</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Seat Configuration Summary
                    </h4>
                    <div className="space-y-3">
                      {enhancedCategories.map(category => {
                        const categorySeats = enhancedSeats.filter(seat => seat.category === category.id);
                        const totalValue = categorySeats.length * category.basePrice;
                        return (
                          <div key={category.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <span className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm" 
                                  style={{ backgroundColor: category.color }}
                                />
                                <span className="font-medium">{category.name}</span>
                              </span>
                              <Badge variant="outline">{category.viewQuality}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                              <div>Seats: {categorySeats.length}</div>
                              <div>Price: ${category.basePrice}</div>
                              <div>Max Capacity: {category.maxCapacity}</div>
                              <div>Value: ${totalValue}</div>
                            </div>
                            {category.amenities.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                {category.amenities.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <Separator />
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center font-medium">
                          <span>Total Seats Placed</span>
                          <span>{enhancedSeats.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Total Revenue Potential</span>
                          <span>${enhancedSeats.reduce((sum, seat) => sum + seat.price, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Completion Status</span>
                          <span className={enhancedSeats.length > 0 ? 'text-green-600' : 'text-yellow-600'}>
                            {enhancedSeats.length > 0 ? '✅ Ready' : '⚠️ No seats placed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleCreateSeatingChart} 
                    disabled={loading || !chartPreview || enhancedSeats.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? 'Creating Seating Chart...' : 'Create Interactive Seating Chart'}
                  </Button>
                  
                  {enhancedSeats.length === 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        You need to place at least one seat before creating the interactive seating chart.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This will create your venue and interactive seating chart. Customers will be able to select specific seats based on their chosen ticket type.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </>
        ) : (
          // Show PremiumSeatingManager for other tabs
          <PremiumSeatingManager
          venueImageUrl={chartPreview || undefined}
          maxTotalSeats={ticketTypes.reduce((total, ticket) => total + ticket.quantity, 0)}
          ticketTypes={ticketTypes}
          onImageUpload={async (file) => {
            // Handle file upload with proper Supabase upload
            if (!file.type.startsWith('image/')) {
              toast.error('Please upload an image file (PNG, JPG, SVG)');
              return;
            }

            if (file.size > 10 * 1024 * 1024) {
              toast.error('File size must be less than 10MB');
              return;
            }

            setUploadedChart(file);
            setLoading(true);

            try {
              // Generate unique venue ID for this event
              const venueId = `venue_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
              
              // Upload image to Supabase Storage
              console.log('🌅 Uploading venue image to Supabase Storage (showOnlyTab)...');
              const uploadResult = await imageUploadService.uploadVenueImage(file, venueId);
              
              if (uploadResult.success && uploadResult.url) {
                console.log('✅ Venue image uploaded successfully (showOnlyTab):', uploadResult.url);
                setChartPreview(uploadResult.url);
                
                // Persist permanent URL to form data
                form.setValue('venueImageUrl', uploadResult.url);
                form.setValue('hasVenueImage', true);
                // Store venue ID if needed
                
                // Trigger form validation to update navigation state
                form.trigger(['venueImageUrl', 'hasVenueImage']);
                
                // Log current form values for debugging
                const currentValues = form.getValues();
                console.log('✅ Supabase upload (showOnlyTab) - Form data updated:', {
                  venueImageUrl: currentValues.venueImageUrl ? 'SET (Supabase URL)' : 'NOT_SET',
                  hasVenueImage: currentValues.hasVenueImage,
                  // venueId: venueId
                });
                
                // Only auto-advance if in setup-only mode (single-tab)
                if (showOnlyTab === 'setup' && onStepAdvance) {
                  console.log('⏭️ Auto-advancing to next step after Supabase upload...');
                  setTimeout(() => {
                    const finalValues = form.getValues();
                    console.log('Final form values before step advance:', {
                      venueImageUrl: finalValues.venueImageUrl ? 'SET' : 'NOT_SET',
                      hasVenueImage: finalValues.hasVenueImage
                    });
                    onStepAdvance();
                  }, 100);
                }
                
                toast.success('Venue image uploaded successfully to cloud storage');
              } else {
                console.error('❌ Venue image upload failed (showOnlyTab):', uploadResult.error);
                toast.error(`Upload failed: ${uploadResult.error || 'Unknown error'}`);
                
                // Fallback to base64 for immediate display
                const reader = new FileReader();
                reader.onload = (e) => {
                  const imageUrl = e.target?.result as string;
                  console.log('⚠️ Using base64 fallback (showOnlyTab)');
                  setChartPreview(imageUrl);
                  form.setValue('venueImageUrl', imageUrl);
                  form.setValue('hasVenueImage', true);
                  form.trigger(['venueImageUrl', 'hasVenueImage']);
                  
                  if (showOnlyTab === 'setup' && onStepAdvance) {
                    setTimeout(() => onStepAdvance(), 100);
                  }
                };
                reader.readAsDataURL(file);
                toast.success('Using local preview (cloud upload failed)');
              }
            } catch (error) {
              console.error('❌ Error during venue image upload (showOnlyTab):', error);
              toast.error('Failed to upload venue image');
              
              // Fallback to base64
              const reader = new FileReader();
              reader.onload = (e) => {
                const imageUrl = e.target?.result as string;
                console.log('⚠️ Using base64 fallback due to error (showOnlyTab)');
                setChartPreview(imageUrl);
                form.setValue('venueImageUrl', imageUrl);
                form.setValue('hasVenueImage', true);
                form.trigger(['venueImageUrl', 'hasVenueImage']);
                
                if (showOnlyTab === 'setup' && onStepAdvance) {
                  setTimeout(() => onStepAdvance(), 100);
                }
              };
              reader.readAsDataURL(file);
              toast.success('Using local preview (cloud upload error)');
            } finally {
              setLoading(false);
            }
          }}
          onSeatingConfigurationChange={handleEnhancedSeatingConfigured}
          initialSeats={enhancedSeats}
          initialCategories={enhancedCategories}
          startingTab={tabMap[showOnlyTab] as 'setup' | 'configure' | 'place'}
          showOnlyTab={showOnlyTab}
        />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Interactive Seating Chart Setup</h2>
        <p className="text-muted-foreground">
          {currentStep === 'upload' && 'Upload your venue seating chart to get started'}
          {currentStep === 'configure' && 'Configure ticket types and seating sections'}
          {currentStep === 'place-seats' && 'Place seats on your floor plan using colored dots'}
          {currentStep === 'finalize' && 'Review and create your interactive seating chart'}
        </p>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        {[
          { key: 'upload', label: 'Upload' },
          { key: 'configure', label: 'Configure' },
          { key: 'place-seats', label: 'Place Seats' },
          { key: 'finalize', label: 'Finalize' }
        ].map((step, index) => {
          const isActive = currentStep === step.key;
          const isCompleted = ['upload', 'configure', 'place-seats', 'finalize'].indexOf(currentStep) > index;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${isActive ? 'bg-primary text-primary-foreground' : 
                  isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}
              `}>
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`ml-2 text-sm ${isActive ? 'font-medium' : ''}`}>
                {step.label}
              </span>
              {index < 3 && <div className="ml-4 w-8 h-0.5 bg-muted" />}
            </div>
          );
        })}
      </div>

      {renderStepContent()}

      {/* Navigation Controls */}
      {currentStep === 'place-seats' && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep('configure')}>
            Back to Configuration
          </Button>
          <Button onClick={handleProceedToFinalize}>
            Proceed to Finalize
          </Button>
        </div>
      )}
    </div>
  );
};