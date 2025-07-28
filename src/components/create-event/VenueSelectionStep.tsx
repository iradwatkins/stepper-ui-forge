import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Plus, 
  AlertCircle, 
  AlertTriangle,
  Search, 
  Users, 
  Eye, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { EventFormData } from '@/types/event-form';
import { useAuth } from '@/contexts/AuthContext';
import { VenueService, type VenueLayout } from '@/lib/services/VenueService';
import { useEventCreation } from '@/contexts/EventCreationContext';
import { SeatAdapterFacade } from '@/domain/seat';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const { user } = useAuth();
  const { 
    claimFieldOwnership, 
    releaseFieldOwnership, 
    canUpdateField,
    setVenueSelection,
    updateSeatingData,
    syncWithForm,
    addDebugUpdate
  } = useEventCreation();
  
  const [venues, setVenues] = useState<VenueLayout[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [venueServiceAvailable, setVenueServiceAvailable] = useState(true);
  
  const COMPONENT_NAME = 'VenueSelectionStep';

  // Check venue service availability
  useEffect(() => {
    const checkAvailability = async () => {
      const available = await VenueService.isVenueAvailable();
      setVenueServiceAvailable(available);
    };
    checkAvailability();
  }, []);

  // Load user's venues
  const loadVenues = async () => {
    if (!user?.id || !venueServiceAvailable) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const userVenues = await VenueService.getUserVenues(user.id);
      setVenues(userVenues);
      
      // Check if there's already a venue selected (for editing)
      const existingVenueId = form.watch('venueLayoutId');
      if (existingVenueId) {
        const existingVenue = userVenues.find(v => v.id === existingVenueId);
        if (existingVenue) {
          handleVenueSelect(existingVenue);
        }
      }
    } catch (error) {
      console.error('Error loading venues:', error);
      toast.error('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, [user?.id, venueServiceAvailable]);

  // Cleanup: Release field ownership when component unmounts
  useEffect(() => {
    return () => {
      const fieldsToRelease = ['venueLayoutId', 'seats', 'seatCategories', 'venueImageUrl', 'hasVenueImage'] as const;
      fieldsToRelease.forEach(field => {
        releaseFieldOwnership(field, COMPONENT_NAME);
      });
      addDebugUpdate(COMPONENT_NAME, 'cleanup', 'Released all field ownership');
    };
  }, [releaseFieldOwnership, addDebugUpdate]);

  const handleVenueSelect = async (venue: VenueLayout) => {
    try {
      // Step 1: Claim ownership of venue-related fields
      const fieldsToOwn = ['venueLayoutId', 'seats', 'seatCategories', 'venueImageUrl', 'hasVenueImage'] as const;
      const claimedFields: string[] = [];
      
      for (const field of fieldsToOwn) {
        if (claimFieldOwnership(field, COMPONENT_NAME)) {
          claimedFields.push(field);
          addDebugUpdate(COMPONENT_NAME, field, `Claimed ownership for venue: ${venue.name}`);
        } else {
          console.warn(`Could not claim ownership of ${field} - may cause race condition`);
        }
      }
      
      // Step 2: Update local state
      setSelectedVenue(venue);
      
      // Step 3: Update centralized state
      setVenueSelection(venue.id, venue);
      
      // Step 4: Process venue data with type safety
      if (venue.layout_data) {
        // Convert venue seats to UI format using our unified adapter
        const uiSeats = venue.layout_data.seats ? 
          SeatAdapterFacade.venueToUI(venue.layout_data.seats) : [];
        
        const uiCategories = venue.layout_data.priceCategories || [];
        
        // Update centralized seating state
        updateSeatingData({
          seats: uiSeats,
          categories: uiCategories
        });
        
        addDebugUpdate(COMPONENT_NAME, 'seating', {
          seatCount: uiSeats.length,
          categoryCount: uiCategories.length
        });
      }
      
      // Step 5: Synchronize with form (prevents race conditions)
      const formUpdates: Partial<EventFormData> = {
        venueLayoutId: venue.id,
      };
      
      // Safe form updates with ownership validation
      if (canUpdateField('venueLayoutId', COMPONENT_NAME)) {
        formUpdates.venueLayoutId = venue.id;
      }
      
      if (venue.name && canUpdateField('venueLayoutId', COMPONENT_NAME)) {
        formUpdates.venueName = venue.name;
      }
      
      if (venue.layout_data?.imageUrl && canUpdateField('venueImageUrl', COMPONENT_NAME)) {
        formUpdates.venueImageUrl = venue.layout_data.imageUrl;
        formUpdates.hasVenueImage = true;
      }
      
      if (venue.layout_data?.seats && canUpdateField('seats', COMPONENT_NAME)) {
        formUpdates.seats = SeatAdapterFacade.venueToUI(venue.layout_data.seats);
      }
      
      if (venue.layout_data?.priceCategories && canUpdateField('seatCategories', COMPONENT_NAME)) {
        formUpdates.seatCategories = venue.layout_data.priceCategories;
      }
      
      // Apply all form updates atomically
      Object.entries(formUpdates).forEach(([key, value]) => {
        form.setValue(key as keyof EventFormData, value as any);
        addDebugUpdate(COMPONENT_NAME, key, value);
      });
      
      // Step 6: Trigger validation and sync
      await syncWithForm(form, ['venue', 'seating']);
      
      // Step 7: Notify parent component
      onVenueSelected(venue.id, venue);
      
      toast.success(`Venue "${venue.name}" selected successfully`);
      
    } catch (error) {
      console.error('Error selecting venue:', error);
      toast.error('Failed to select venue. Please try again.');
      
      // Release claimed fields on error
      const fieldsToRelease = ['venueLayoutId', 'seats', 'seatCategories', 'venueImageUrl', 'hasVenueImage'] as const;
      fieldsToRelease.forEach(field => {
        releaseFieldOwnership(field, COMPONENT_NAME);
      });
    }
  };

  const handleManageVenues = () => {
    // Open venue management in new tab
    window.open('/dashboard/venues', '_blank');
    toast.info('Create or edit venues in the new tab, then refresh here to see them');
  };

  const filteredVenues = venues.filter(venue => 
    venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!venueServiceAvailable) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Venue Selection</h2>
          <p className="text-muted-foreground">
            Select a venue layout for your premium event
          </p>
        </div>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Venue management is currently unavailable. You can continue without selecting a venue.
          </AlertDescription>
        </Alert>
        <Button onClick={onProceedWithCustom} className="w-full">
          Continue Without Venue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Select Venue Layout</h2>
        <p className="text-muted-foreground">
          Choose from your saved venues or create a new one
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Venues</CardTitle>
              <CardDescription>
                Select a venue layout for this event
              </CardDescription>
            </div>
            <Button onClick={handleManageVenues} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Venues
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Refresh */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search venues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={loadVenues}
              variant="outline"
              size="icon"
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          {/* Venues List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading venues...
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'No venues found' : 'No venues yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first venue layout to get started
              </p>
              <Button onClick={handleManageVenues}>
                <Plus className="h-4 w-4 mr-2" />
                Create Venue
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredVenues.map((venue) => (
                <div
                  key={venue.id}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                    selectedVenue?.id === venue.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleVenueSelect(venue)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{venue.name}</h4>
                      {venue.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {venue.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {venue.capacity} seats
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {venue.venueType}
                        </span>
                      </div>
                    </div>
                    {selectedVenue?.id === venue.id && (
                      <Badge variant="default">Selected</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Help Text */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Need to create or edit venues? Click "Manage Venues" to open the venue management page.
              After making changes, click the refresh button to see your updates here.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Selected Venue Summary */}
      {selectedVenue && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Selected venue:</strong> {selectedVenue.name} ({selectedVenue.capacity} seats)
            <br />
            <span className="text-sm text-muted-foreground">
              The venue layout and pricing will be used for this event. You'll configure seating in the next step.
            </span>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Option to proceed without venue */}
      {!selectedVenue && (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-medium">
                {venues.length === 0 ? "Don't have a venue layout yet?" : "Prefer to upload a custom layout?"}
              </h3>
              <p className="text-muted-foreground">
                You can upload a custom venue image and configure seating in the next step.
              </p>
              <Button onClick={onProceedWithCustom} variant="secondary" className="w-full max-w-xs">
                <Upload className="h-4 w-4 mr-2" />
                Upload Custom Venue Layout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};