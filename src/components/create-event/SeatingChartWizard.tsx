import { useState, useEffect } from 'react';
import { UseFormReturn } from "react-hook-form";
import { EventFormData } from "@/types/event-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LayoutGrid, 
  Plus, 
  Building2, 
  MapPin, 
  Palette, 
  DollarSign,
  Users,
  Eye,
  Settings,
  Info
} from 'lucide-react';
import { seatingService, Venue, SeatingChart, SeatCategory } from '@/lib/services/SeatingService';
import { toast } from 'sonner';

interface SeatingChartWizardProps {
  form: UseFormReturn<EventFormData>;
  eventType: 'simple' | 'ticketed' | 'premium' | '';
  onSeatingConfigured?: (seatingData: any) => void;
}

interface SeatingConfig {
  venueId?: string;
  seatingChartId?: string;
  sections: SectionConfig[];
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

export const SeatingChartWizard = ({ form, eventType, onSeatingConfigured }: SeatingChartWizardProps) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [seatingCharts, setSeatingCharts] = useState<SeatingChart[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [seatingConfig, setSeatingConfig] = useState<SeatingConfig>({
    sections: defaultSections
  });
  const [showNewVenueForm, setShowNewVenueForm] = useState(false);
  const [newVenue, setNewVenue] = useState({
    name: '',
    address: '',
    capacity: 200,
    description: ''
  });

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
      
      // Create basic seating chart with sections
      const chartData = {
        type: 'basic',
        sections: seatingConfig.sections.map(section => ({
          id: section.id,
          name: section.name,
          color: section.color,
          seats: Array.from({ length: section.seats }, (_, i) => ({
            id: `${section.id}-${i + 1}`,
            row: Math.floor(i / 10) + 1,
            seat: (i % 10) + 1,
            price: section.price,
            available: true
          }))
        }))
      };

      const totalSeats = seatingConfig.sections.reduce((sum, section) => sum + section.seats, 0);
      
      const seatingChart = await seatingService.createSeatingChart({
        venue_id: selectedVenue,
        name: `${formData.title} - Seating Chart`,
        description: `Interactive seating chart for ${formData.title}`,
        chart_data: chartData,
        is_active: true,
        total_seats: totalSeats,
        version: 1
      });

      // Create seat categories
      for (const section of seatingConfig.sections) {
        await seatingService.createSeatCategory({
          seating_chart_id: seatingChart.id,
          name: section.name,
          description: section.description || `${section.name} seating area`,
          color_code: section.color,
          base_price: section.price,
          price_modifier: 1.0,
          is_accessible: false,
          is_premium: section.id === 'vip',
          sort_order: seatingConfig.sections.indexOf(section)
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

  const updateSection = (index: number, field: keyof SectionConfig, value: string | number) => {
    setSeatingConfig(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) => 
        i === index ? { ...section, [field]: value } : section
      )
    }));
  };

  const addSection = () => {
    const newSection: SectionConfig = {
      id: `section-${Date.now()}`,
      name: 'New Section',
      color: '#6B7280',
      price: 30,
      seats: 50
    };
    setSeatingConfig(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const removeSection = (index: number) => {
    if (seatingConfig.sections.length > 1) {
      setSeatingConfig(prev => ({
        ...prev,
        sections: prev.sections.filter((_, i) => i !== index)
      }));
    }
  };

  const getTotalSeats = () => {
    return seatingConfig.sections.reduce((sum, section) => sum + section.seats, 0);
  };

  const getTotalRevenuePotential = () => {
    return seatingConfig.sections.reduce((sum, section) => sum + (section.price * section.seats), 0);
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
                <div className="text-2xl font-bold">{seatingConfig.sections.length}</div>
                <div className="text-sm text-muted-foreground">Sections</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">${getTotalRevenuePotential()}</div>
                <div className="text-sm text-muted-foreground">Max Revenue</div>
              </div>
            </div>

            <Separator />

            {/* Section Configuration */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Seating Sections</h3>
                <Button onClick={addSection} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </div>

              {seatingConfig.sections.map((section, index) => (
                <Card key={section.id}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Section Name</Label>
                        <Input
                          value={section.name}
                          onChange={(e) => updateSection(index, 'name', e.target.value)}
                          placeholder="Section name..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={section.color}
                            onChange={(e) => updateSection(index, 'color', e.target.value)}
                            className="w-12 h-10 border rounded"
                          />
                          <Badge style={{ backgroundColor: section.color, color: 'white' }}>
                            {section.name}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Price ($)</Label>
                        <Input
                          type="number"
                          value={section.price}
                          onChange={(e) => updateSection(index, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Seats</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={section.seats}
                            onChange={(e) => updateSection(index, 'seats', parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                          {seatingConfig.sections.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeSection(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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