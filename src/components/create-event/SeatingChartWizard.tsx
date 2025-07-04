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
import { seatingService, SeatingChart, SeatCategory } from '@/lib/services/SeatingService';
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

  useEffect(() => {
    if (onSeatingConfigured) {
      onSeatingConfigured(seatingConfig);
    }
  }, [seatingConfig, onSeatingConfigured]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG)');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadedChart(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setChartPreview(e.target?.result as string);
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
      
      // Create seating chart with ticket type mappings
      const chartData = {
        type: 'premium',
        uploadedChart: uploadedChart.name,
        sections: seatingConfig.ticketMappings.map(mapping => {
          const ticketType = ticketTypes.find(t => t.id === mapping.ticketTypeId);
          return {
            id: mapping.ticketTypeId,
            name: mapping.sectionName,
            color: mapping.color,
            ticketTypeId: mapping.ticketTypeId,
            ticketTypeName: ticketType?.name,
            price: ticketType?.price || 0,
            seats: Array.from({ length: mapping.seats }, (_, i) => ({
              id: `${mapping.ticketTypeId}-${i + 1}`,
              row: Math.floor(i / 10) + 1,
              seat: (i % 10) + 1,
              price: ticketType?.price || 0,
              available: true
            }))
          };
        })
      };

      const totalSeats = getTotalSeats();
      
      // Create a basic venue first using form data
      const venue = await seatingService.createVenue({
        name: formData.venueName,
        address: formData.address,
        capacity: totalSeats,
        description: `Venue for ${formData.title}`,
        venue_type: 'general'
      });

      const seatingChart = await seatingService.createSeatingChart({
        venue_id: venue.id,
        name: `${formData.title} - Seating Chart`,
        description: `Interactive seating chart for ${formData.title}`,
        chart_data: chartData,
        is_active: true,
        total_seats: totalSeats,
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

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Interactive Seating Chart Upload</h2>
        <p className="text-muted-foreground">
          Upload your venue seating chart and map ticket types to seating sections
        </p>
      </div>

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

      {/* Seating Chart Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Seating Chart
          </CardTitle>
          <CardDescription>
            Upload an image of your venue's seating layout (PNG, JPG, SVG)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            {!chartPreview ? (
              <div className="space-y-4">
                <FileImage className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <Label htmlFor="chart-upload" className="cursor-pointer">
                    <div className="text-lg font-medium mb-2">Upload Seating Chart</div>
                    <div className="text-sm text-muted-foreground mb-4">
                      Drag and drop or click to select (PNG, JPG, SVG - Max 5MB)
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
                }}>
                  Replace Chart
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                        <Label>Section Capacity</Label>
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

      <Separator />

      {/* Create Seating Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Finalize Seating Setup</CardTitle>
          <CardDescription>
            Create your interactive seating chart with the uploaded layout and ticket mappings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleCreateSeatingChart} 
            disabled={loading || !uploadedChart || ticketTypes.length === 0}
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
    </div>
  );
};