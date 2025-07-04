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

interface SectionConfig {
  id: string;
  name: string;
  color: string;
  price: number;
  seats: number;
  description?: string;
}

const defaultSections: SectionConfig[] = [
  { id: 'general', name: 'General Admission', color: '#3B82F6', price: 25, seats: 100 },
  { id: 'premium', name: 'Premium Seating', color: '#8B5CF6', price: 50, seats: 50 },
  { id: 'vip', name: 'VIP Section', color: '#F59E0B', price: 75, seats: 25 }
];

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
    loadVenues();
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      loadSeatingCharts(selectedVenue);
    }
  }, [selectedVenue]);

  useEffect(() => {
    if (onSeatingConfigured) {
      onSeatingConfigured(seatingConfig);
    }
  }, [seatingConfig, onSeatingConfigured]);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const venueList = await seatingService.getVenues();
      setVenues(venueList);
    } catch (error) {
      console.error('Error loading venues:', error);
      toast.error('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const loadSeatingCharts = async (venueId: string) => {
    try {
      const charts = await seatingService.getSeatingCharts();
      const venueCharts = charts.filter(chart => chart.venue_id === venueId);
      setSeatingCharts(venueCharts);
    } catch (error) {
      console.error('Error loading seating charts:', error);
      toast.error('Failed to load seating charts');
    }
  };

  const handleCreateVenue = async () => {
    if (!newVenue.name.trim()) {
      toast.error('Venue name is required');
      return;
    }

    try {
      setLoading(true);
      const venue = await seatingService.createVenue({
        name: newVenue.name,
        address: newVenue.address,
        capacity: newVenue.capacity,
        venue_type: 'general',
        description: newVenue.description
      });
      
      setVenues(prev => [...prev, venue]);
      setSelectedVenue(venue.id);
      setShowNewVenueForm(false);
      setNewVenue({ name: '', address: '', capacity: 200, description: '' });
      toast.success('Venue created successfully');
    } catch (error) {
      console.error('Error creating venue:', error);
      toast.error('Failed to create venue');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeatingChart = async () => {
    if (!selectedVenue) {
      toast.error('Please select a venue first');
      return;
    }

    const formData = form.getValues();
    
    try {
      setLoading(true);
      
      // Create seating chart with ticket type mappings
      const chartData = {
        type: 'premium',
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
      
      const seatingChart = await seatingService.createSeatingChart({
        venue_id: selectedVenue,
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
        venueId: selectedVenue,
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

  if (eventType !== 'premium') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Interactive Seating Setup</h2>
        <p className="text-muted-foreground">
          Configure your venue and seating chart for premium ticket sales
        </p>
      </div>

      {/* Venue Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Venue Selection
          </CardTitle>
          <CardDescription>
            Choose an existing venue or create a new one for your event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showNewVenueForm ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="venue-select">Select Venue</Label>
                <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a venue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{venue.name}</span>
                          {venue.capacity && (
                            <Badge variant="secondary">{venue.capacity} capacity</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowNewVenueForm(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Venue
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="venue-name">Venue Name *</Label>
                <Input
                  id="venue-name"
                  value={newVenue.name}
                  onChange={(e) => setNewVenue(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter venue name..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-address">Address</Label>
                <Input
                  id="venue-address"
                  value={newVenue.address}
                  onChange={(e) => setNewVenue(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter venue address..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-capacity">Total Capacity</Label>
                <Input
                  id="venue-capacity"
                  type="number"
                  value={newVenue.capacity}
                  onChange={(e) => setNewVenue(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                  placeholder="200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-description">Description</Label>
                <Textarea
                  id="venue-description"
                  value={newVenue.description}
                  onChange={(e) => setNewVenue(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional venue description..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateVenue} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Venue'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewVenueForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seating Configuration */}
      {selectedVenue && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              Seating Configuration
            </CardTitle>
            <CardDescription>
              Configure sections, pricing, and seat allocation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
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

            <Separator />

            {/* Ticket Type to Seating Mapping */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Map Ticket Types to Seating Sections</h3>
                <Badge variant="secondary">
                  {ticketTypes.length} ticket types
                </Badge>
              </div>

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
            </div>

            <Separator />

            {/* Create Seating Chart */}
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This will create a basic interactive seating chart with your configured sections. 
                  You can customize the layout further after event creation.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleCreateSeatingChart} 
                disabled={loading || !selectedVenue}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  'Creating Seating Chart...'
                ) : (
                  <>
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Create Interactive Seating Chart
                  </>
                )}
              </Button>
              
              {seatingConfig.seatingChartId && (
                <Alert>
                  <Eye className="h-4 w-4" />
                  <AlertDescription>
                    ✅ Seating chart created successfully! Your premium event will have interactive seat selection.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};