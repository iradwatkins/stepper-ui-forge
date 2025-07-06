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
import { EnhancedSeatingChartSelector, SeatData, SeatCategory as EnhancedSeatCategory } from '@/components/seating';
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
  onSeatingConfigured?: (seatingData: any) => void;
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

export const SeatingChartWizard = ({ form, eventType, ticketTypes = [], onSeatingConfigured }: SeatingChartWizardProps) => {
  const [loading, setLoading] = useState(false);
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
  const [currentStep, setCurrentStep] = useState<'upload' | 'configure' | 'place-seats' | 'finalize'>('upload');

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

    // Create preview URL for immediate display
    const reader = new FileReader();
    reader.onload = (e) => {
      setChartPreview(e.target?.result as string);
      setCurrentStep('configure'); // Move to configuration step
    };
    reader.readAsDataURL(file);

    toast.success('Seating chart uploaded successfully');
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
    
    // Update seating config with actual seat counts
    setSeatingConfig(prev => ({
      ...prev,
      ticketMappings: prev.ticketMappings.map(mapping => ({
        ...mapping,
        seats: seats.filter(seat => seat.category === mapping.ticketTypeId).length
      }))
    }));
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

    if (!uploadedChart) {
      toast.error('Please upload a seating chart first');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create a basic venue first using form data
      const venue = await seatingService.createVenue({
        name: formData.venueName || formData.address,
        address: formData.address,
        capacity: getTotalSeats(),
        description: `Venue for ${formData.title}`,
        venue_type: 'general'
      });

      // Upload the seating chart image to Supabase Storage
      let imageUrl = null;
      if (uploadedChart) {
        const uploadResult = await imageUploadService.uploadVenueImage(uploadedChart, venue.id);
        if (uploadResult.success) {
          imageUrl = uploadResult.url;
          toast.success('Venue image uploaded successfully');
        } else {
          console.warn('Failed to upload venue image:', uploadResult.error);
          toast.warning('Seating chart created but image upload failed. You can update it later.');
        }
      }
      
      // Create seating chart with actual seat positions
      const chartData = {
        type: 'premium',
        uploadedChart: uploadedChart?.name,
        imageDimensions: { width: 800, height: 600 }, // Will be updated with actual dimensions
        seats: placedSeats.map(seat => ({
          id: seat.id,
          x: seat.x,
          y: seat.y,
          seatNumber: seat.seatNumber,
          ticketTypeId: seat.ticketTypeId,
          price: ticketTypes.find(t => t.id === seat.ticketTypeId)?.price || 0,
          available: true
        })),
        sections: seatingConfig.ticketMappings.map(mapping => {
          const ticketType = ticketTypes.find(t => t.id === mapping.ticketTypeId);
          const sectionSeats = placedSeats.filter(seat => seat.ticketTypeId === mapping.ticketTypeId);
          
          return {
            id: mapping.ticketTypeId,
            name: mapping.sectionName,
            color: mapping.color,
            ticketTypeId: mapping.ticketTypeId,
            ticketTypeName: ticketType?.name,
            price: ticketType?.price || 0,
            seatCount: sectionSeats.length,
            seats: sectionSeats.map(seat => ({
              id: seat.id,
              x: seat.x,
              y: seat.y,
              seatNumber: seat.seatNumber,
              price: ticketType?.price || 0,
              available: true
            }))
          };
        })
      };

      const seatingChart = await seatingService.createSeatingChart({
        venue_id: venue.id,
        name: `${formData.title} - Seating Chart`,
        description: `Interactive seating chart for ${formData.title}`,
        chart_data: chartData,
        image_url: imageUrl,
        is_active: true,
        total_seats: getTotalSeats(),
        version: 1
      });

      // Create seat categories from ticket mappings
      for (const mapping of seatingConfig.ticketMappings) {
        const ticketType = ticketTypes.find(t => t.id === mapping.ticketTypeId);
        await seatingService.createSeatCategory({
          seating_chart_id: seatingChart.id,
          name: mapping.sectionName,
          description: mapping.description || `${mapping.sectionName} seating area`,
          color_code: mapping.color,
          base_price: ticketType?.price || 0,
          price_modifier: 1.0,
          is_accessible: false,
          is_premium: ticketType?.name.toLowerCase().includes('vip') || false,
          sort_order: seatingConfig.ticketMappings.indexOf(mapping)
        });
      }

      setSeatingConfig(prev => ({
        ...prev,
        venueId: venue.id,
        seatingChartId: seatingChart.id
      }));

      toast.success('Seating chart created successfully');
    } catch (error) {
      console.error('Error creating seating chart:', error);
      toast.error('Failed to create seating chart');
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
          <EnhancedSeatingChartSelector
            venueImageUrl={chartPreview!}
            onImageUpload={() => {}} // Already handled in upload step
            onSeatingConfigurationChange={handleEnhancedSeatingConfigured}
            initialSeats={enhancedSeats}
            initialCategories={convertToEnhancedCategories()}
            venueInfo={{
              name: form.watch('venueName') || 'Event Venue',
              address: form.watch('address') || '',
              capacity: getTotalSeats(),
              amenities: ['Standard seating', 'Accessible seating'],
              accessibility: ['ADA compliant', 'Wheelchair accessible'],
              parking: { available: true },
              transit: { nearby: true }
            }}
            eventType="other"
          />
        );

      case 'finalize':
        return (
          <>
            {/* Final Review */}
            <Card>
              <CardHeader>
                <CardTitle>Finalize Seating Setup</CardTitle>
                <CardDescription>
                  Review your seating configuration and create the interactive seating chart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Floor Plan</h4>
                    <img 
                      src={chartPreview!} 
                      alt="Floor Plan" 
                      className="w-full h-32 object-cover rounded border"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Seat Summary</h4>
                    <div className="space-y-2">
                      {seatingConfig.ticketMappings.map(mapping => {
                        const seatCount = placedSeats.filter(seat => seat.ticketTypeId === mapping.ticketTypeId).length;
                        return (
                          <div key={mapping.ticketTypeId} className="flex justify-between items-center">
                            <span className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: mapping.color }}
                              />
                              {mapping.sectionName}
                            </span>
                            <span className="text-sm text-muted-foreground">{seatCount} seats</span>
                          </div>
                        );
                      })}
                      <Separator />
                      <div className="flex justify-between items-center font-medium">
                        <span>Total Seats</span>
                        <span>{placedSeats.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleCreateSeatingChart} 
                  disabled={loading || !uploadedChart || placedSeats.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Creating Seating Chart...' : 'Create Interactive Seating Chart'}
                </Button>
                
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