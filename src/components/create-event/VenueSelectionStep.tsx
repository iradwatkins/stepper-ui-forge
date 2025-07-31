import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Building2, 
  Plus, 
  AlertCircle, 
  AlertTriangle,
  Search, 
  Users, 
  Eye, 
  ExternalLink,
  RefreshCw,
  Upload as UploadIcon,
  FileImage,
  Loader2
} from 'lucide-react';
import { EventFormData } from '@/types/event-form';
import { useAuth } from '@/contexts/AuthContext';
import { VenueService, type VenueLayout } from '@/lib/services/VenueService';
import { useEventCreation } from '@/contexts/EventCreationContext';
import { SeatAdapterFacade } from '@/domain/seat';
import { imageUploadService } from '@/lib/services/ImageUploadService';
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
  
  // Inline venue creation state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createVenueForm, setCreateVenueForm] = useState({
    name: '',
    description: '',
    venueType: 'theater' as 'theater' | 'stadium' | 'arena' | 'table-service' | 'general-admission',
    imageFile: null as File | null,
    imagePreview: ''
  });
  const [isCreatingVenue, setIsCreatingVenue] = useState(false);
  
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

  // Handle inline venue creation
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setCreateVenueForm(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: e.target?.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateVenue = async () => {
    if (!createVenueForm.name.trim()) {
      toast.error('Please enter a venue name');
      return;
    }

    if (!createVenueForm.imageFile) {
      toast.error('Please select a venue layout image');
      return;
    }

    setIsCreatingVenue(true);
    try {
      // First, create the venue entry
      const tempVenueId = `temp-${Date.now()}`;
      
      // Upload the image with the venue name
      const uploadResult = await imageUploadService.uploadVenueImage(
        createVenueForm.imageFile,
        tempVenueId,
        createVenueForm.name,
        user?.id
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }

      // Create the venue with the uploaded image URL
      const newVenue = await VenueService.createVenue({
        name: createVenueForm.name,
        description: createVenueForm.description || '',
        layout_data: {
          venueType: createVenueForm.venueType,
          imageUrl: uploadResult.url!,
          capacity: 0, // Will be set when seats are configured
          priceCategories: [],
          seats: [],
          isTemplate: false,
          tags: []
        }
      });

      if (!newVenue) {
        throw new Error('Failed to create venue');
      }

      // Add to venues list
      setVenues(prev => [newVenue, ...prev]);
      
      // Select the newly created venue
      handleVenueSelect(newVenue);
      
      // Close dialog and reset form
      setShowCreateDialog(false);
      setCreateVenueForm({
        name: '',
        description: '',
        venueType: 'theater',
        imageFile: null,
        imagePreview: ''
      });

      toast.success('Venue created and selected successfully!');
    } catch (error) {
      console.error('Error creating venue:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create venue');
    } finally {
      setIsCreatingVenue(false);
    }
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
      
      {/* Option to create new venue inline */}
      {!selectedVenue && (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-medium">
                {venues.length === 0 ? "Don't have a venue layout yet?" : "Need to create a new venue?"}
              </h3>
              <p className="text-muted-foreground">
                Create a new venue layout and save it to your profile for future use.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} variant="secondary" className="w-full max-w-xs">
                <Plus className="h-4 w-4 mr-2" />
                Create New Venue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inline Venue Creation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Venue</DialogTitle>
            <DialogDescription>
              Create a new venue layout that will be saved to your profile for future events.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Venue Name */}
            <div>
              <Label htmlFor="venue-name">Venue Name *</Label>
              <Input
                id="venue-name"
                placeholder="e.g., Madison Square Garden"
                value={createVenueForm.name}
                onChange={(e) => setCreateVenueForm(prev => ({ ...prev, name: e.target.value }))}
                disabled={isCreatingVenue}
              />
            </div>

            {/* Venue Type */}
            <div>
              <Label htmlFor="venue-type">Venue Type *</Label>
              <Select
                value={createVenueForm.venueType}
                onValueChange={(value) => setCreateVenueForm(prev => ({ 
                  ...prev, 
                  venueType: value as typeof createVenueForm.venueType 
                }))}
                disabled={isCreatingVenue}
              >
                <SelectTrigger id="venue-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="theater">Theater</SelectItem>
                  <SelectItem value="stadium">Stadium</SelectItem>
                  <SelectItem value="arena">Arena</SelectItem>
                  <SelectItem value="table-service">Table Service</SelectItem>
                  <SelectItem value="general-admission">General Admission</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="venue-description">Description (Optional)</Label>
              <Textarea
                id="venue-description"
                placeholder="Describe your venue..."
                value={createVenueForm.description}
                onChange={(e) => setCreateVenueForm(prev => ({ ...prev, description: e.target.value }))}
                disabled={isCreatingVenue}
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div>
              <Label htmlFor="venue-image">Venue Layout Image *</Label>
              {!createVenueForm.imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileImage className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <Label htmlFor="venue-image-input" className="cursor-pointer">
                    <div className="text-sm font-medium text-primary hover:text-primary/80">
                      Click to upload venue layout
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports JPG, PNG, SVG up to 10MB
                    </p>
                  </Label>
                  <Input
                    id="venue-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={isCreatingVenue}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <img 
                    src={createVenueForm.imagePreview} 
                    alt="Venue preview" 
                    className="w-full max-h-64 object-contain rounded-lg border"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateVenueForm(prev => ({ 
                      ...prev, 
                      imageFile: null, 
                      imagePreview: '' 
                    }))}
                    disabled={isCreatingVenue}
                  >
                    Remove Image
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreatingVenue}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateVenue}
              disabled={isCreatingVenue || !createVenueForm.name || !createVenueForm.imageFile}
            >
              {isCreatingVenue ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Venue
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};