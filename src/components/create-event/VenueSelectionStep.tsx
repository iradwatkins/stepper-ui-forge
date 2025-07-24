import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Building2, Plus, AlertCircle } from 'lucide-react';
import { VenueSelector } from '@/components/venue/VenueSelector';
import { EventFormData } from '@/types/event-form';

interface VenueSelectionStepProps {
  form: UseFormReturn<EventFormData>;
  onVenueSelected: (venueLayoutId: string | null, venueData?: any) => void;
  onProceedWithCustom: () => void;
}

export const VenueSelectionStep = ({ 
  form, 
  onVenueSelected,
  onProceedWithCustom 
}: VenueSelectionStepProps) => {
  const [selectionMode, setSelectionMode] = useState<'existing' | 'custom' | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedVenueData, setSelectedVenueData] = useState<any>(null);

  // Check if there's already a venue layout ID (for editing)
  useEffect(() => {
    const existingVenueId = form.watch('venueLayoutId');
    if (existingVenueId) {
      setSelectionMode('existing');
      setSelectedVenueId(existingVenueId);
    }
  }, [form]);

  const handleVenueSelect = (venue: any) => {
    setSelectedVenueId(venue.id);
    setSelectedVenueData(venue);
    
    // Update form with venue data
    form.setValue('venueLayoutId', venue.id);
    
    // Pre-populate venue information if not already set
    if (!form.watch('venueName') && venue.name) {
      form.setValue('venueName', venue.name);
    }
    
    // Set venue image and seating data
    if (venue.layout_data) {
      if (venue.layout_data.imageUrl) {
        form.setValue('venueImageUrl', venue.layout_data.imageUrl);
        form.setValue('hasVenueImage', true);
      }
      
      if (venue.layout_data.seats) {
        form.setValue('seats', venue.layout_data.seats);
      }
      
      if (venue.layout_data.priceCategories) {
        form.setValue('seatCategories', venue.layout_data.priceCategories);
      }
    }
    
    onVenueSelected(venue.id, venue);
  };

  const handleProceedWithCustom = () => {
    // Clear any venue layout ID
    form.setValue('venueLayoutId', undefined);
    setSelectedVenueId(null);
    setSelectedVenueData(null);
    onProceedWithCustom();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Venue Selection</h2>
        <p className="text-muted-foreground">
          Choose an existing venue layout or create a custom seating arrangement
        </p>
      </div>

      {/* Selection Mode */}
      <Card>
        <CardHeader>
          <CardTitle>How would you like to configure seating?</CardTitle>
          <CardDescription>
            You can use a saved venue layout or create a custom arrangement for this event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={selectionMode || ''} 
            onValueChange={(value) => setSelectionMode(value as 'existing' | 'custom')}
          >
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="existing" id="existing" />
                <div className="flex-1">
                  <Label htmlFor="existing" className="cursor-pointer">
                    <div className="font-medium mb-1">Use Existing Venue Layout</div>
                    <div className="text-sm text-muted-foreground">
                      Select from your saved venue configurations. Perfect for recurring events at the same location.
                    </div>
                  </Label>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="custom" id="custom" />
                <div className="flex-1">
                  <Label htmlFor="custom" className="cursor-pointer">
                    <div className="font-medium mb-1">Create Custom Layout</div>
                    <div className="text-sm text-muted-foreground">
                      Upload a venue image and place seats manually. Ideal for one-time events or new venues.
                    </div>
                  </Label>
                </div>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Venue Selection */}
      {selectionMode === 'existing' && (
        <Card>
          <CardHeader>
            <CardTitle>Select a Venue</CardTitle>
            <CardDescription>
              Choose from your saved venue layouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VenueSelector
              onSelectVenue={handleVenueSelect}
              onCreateNew={() => setSelectionMode('custom')}
              selectedVenueId={selectedVenueId || undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Custom Layout Option */}
      {selectionMode === 'custom' && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Custom Seating Layout</h3>
                <p className="text-muted-foreground mb-4">
                  You'll upload a venue floor plan and configure seating in the next step.
                </p>
              </div>
              <Button onClick={handleProceedWithCustom}>
                <Plus className="h-4 w-4 mr-2" />
                Continue with Custom Layout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Summary */}
      {selectedVenueData && selectionMode === 'existing' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Selected venue:</strong> {selectedVenueData.name} ({selectedVenueData.layout_data.capacity} seats)
            <br />
            <span className="text-sm text-muted-foreground">
              The venue layout and pricing will be used for this event. You can customize prices in the next step.
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};