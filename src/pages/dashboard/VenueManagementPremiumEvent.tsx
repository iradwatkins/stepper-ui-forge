import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GooglePlacesInput } from '@/components/ui/GooglePlacesInput';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Crown,
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Building2,
  Upload,
  Save,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Info,
  Plus,
  Loader2,
  CheckCircle,
  Ticket,
  ImageIcon,
  Grid3x3,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { EventFormData, eventFormSchema } from '@/types/event-form';
import { supabase } from '@/integrations/supabase/client';
import { VenueService, type VenueLayout } from '@/lib/services/VenueService';
import { imageUploadService } from '@/lib/services/ImageUploadService';
import { TicketType, TicketConfigurationWizard } from '@/components/create-event/TicketConfigurationWizard';
import PremiumSeatingManager from '@/components/seating/PremiumSeatingManager';
import { SeatData, SeatCategory as EnhancedSeatCategory } from '@/types/seating';
import { TicketInventoryTracker } from '@/components/create-event/TicketInventoryTracker';
import { cn } from '@/lib/utils';

type Step = 'event-info' | 'tickets' | 'venue-layout' | 'seat-placement' | 'review';

export default function VenueManagementPremiumEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: eventId } = useParams();
  const mode = eventId ? 'edit' : 'create';
  const [currentStep, setCurrentStep] = useState<Step>('event-info');
  const [isSaving, setIsSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  
  // Venue state
  const [venues, setVenues] = useState<VenueLayout[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueLayout | null>(null);
  const [venueImageFile, setVenueImageFile] = useState<File | null>(null);
  const [venueImagePreview, setVenueImagePreview] = useState<string>('');
  
  // Ticket and seating state
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [categories, setCategories] = useState<EnhancedSeatCategory[]>([]);
  
  // Form setup
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      organizationName: '',
      venueName: '',
      date: '',
      time: '',
      endDate: '',
      endTime: '',
      address: '',
      categories: [],
      capacity: undefined,
      displayPrice: {
        amount: 0,
        label: ''
      },
      isPublic: false, // Start as draft
      tags: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      images: {}
    }
  });

  // Image upload
  const {
    uploadedImages,
    isProcessingImage,
    handleImageUpload,
    removeImage
  } = useImageUpload();

  // Load user's venues
  useEffect(() => {
    const loadVenues = async () => {
      if (!user?.id) return;
      
      try {
        const userVenues = await VenueService.getUserVenues(user.id);
        setVenues(userVenues);
      } catch (error) {
        console.error('Error loading venues:', error);
      }
    };

    loadVenues();
  }, [user?.id]);

  // Load event data if editing
  useEffect(() => {
    if (mode === 'edit' && eventId) {
      // TODO: Load event data and populate form
    }
  }, [mode, eventId]);

  // Steps configuration
  const steps: { id: Step; title: string; description: string; icon: any }[] = [
    {
      id: 'event-info',
      title: 'Event Information',
      description: 'Basic details about your event',
      icon: Info
    },
    {
      id: 'tickets',
      title: 'Ticket Creation',
      description: 'Define ticket types and pricing',
      icon: Ticket
    },
    {
      id: 'venue-layout',
      title: 'Venue Layout',
      description: 'Upload venue floor plan',
      icon: ImageIcon
    },
    {
      id: 'seat-placement',
      title: 'Seat Placement',
      description: 'Place seats on the layout',
      icon: Grid3x3
    },
    {
      id: 'review',
      title: 'Review & Publish',
      description: 'Final review and activation',
      icon: Eye
    }
  ];

  const getStepIndex = (step: Step) => steps.findIndex(s => s.id === step);
  const progress = ((getStepIndex(currentStep) + 1) / steps.length) * 100;

  // Validation for each step
  const canProceedFromStep = (step: Step): boolean => {
    switch (step) {
      case 'event-info':
        const eventData = form.getValues();
        return !!(
          eventData.title?.trim() &&
          eventData.description?.trim() &&
          eventData.organizationName?.trim() &&
          eventData.date &&
          eventData.time &&
          eventData.categories?.length > 0 &&
          uploadedImages.banner
        );
      case 'tickets':
        return ticketTypes.length > 0;
      case 'venue-layout':
        return !!(selectedVenue || venueImagePreview);
      case 'seat-placement':
        return seats.length > 0 && seats.length === ticketTypes.reduce((sum, t) => sum + t.quantity, 0);
      case 'review':
        return true;
      default:
        return false;
    }
  };

  // Navigation
  const goToStep = (step: Step) => {
    const currentIndex = getStepIndex(currentStep);
    const targetIndex = getStepIndex(step);
    
    // Can always go back
    if (targetIndex < currentIndex) {
      setCurrentStep(step);
      return;
    }
    
    // Check if can go forward
    if (canProceedFromStep(currentStep)) {
      setCurrentStep(step);
    } else {
      toast.error('Please complete the current step before proceeding');
    }
  };

  const nextStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex < steps.length - 1 && canProceedFromStep(currentStep)) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  // Handle venue image upload
  const handleVenueImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setVenueImageFile(file);
      setVenueImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle seating configuration change
  const handleSeatingConfigurationChange = (newSeats: SeatData[], newCategories: EnhancedSeatCategory[]) => {
    setSeats(newSeats);
    setCategories(newCategories);
  };

  // Save event
  const saveEvent = async (publish = false) => {
    setIsSaving(true);
    try {
      const formData = form.getValues();
      
      // First, handle venue creation if needed
      let venueId = selectedVenue?.id;
      
      if (!venueId && venueImageFile) {
        // Create a new venue from the uploaded image
        const tempVenueId = `temp-${Date.now()}`;
        
        const uploadResult = await imageUploadService.uploadVenueImage(
          venueImageFile,
          tempVenueId,
          formData.venueName || 'Event Venue',
          user?.id
        );

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload venue image');
        }

        const newVenue = await VenueService.createVenue({
          name: formData.venueName || 'Event Venue',
          description: `Venue for ${formData.title}`,
          layout_data: {
            venueType: 'theater',
            imageUrl: uploadResult.url!,
            capacity: seats.length,
            priceCategories: categories,
            seats: seats,
            isTemplate: false,
            tags: []
          }
        });

        if (!newVenue) {
          throw new Error('Failed to create venue');
        }

        venueId = newVenue.id;
      }
      
      const eventData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        organization_name: formData.organizationName?.trim() || null,
        venue_name: formData.venueName || 'To Be Announced',
        date: formData.date,
        time: formData.time,
        end_date: formData.endDate || null,
        end_time: formData.endTime || null,
        timezone: formData.timezone,
        location: formData.address || 'To Be Announced',
        venue_layout_id: venueId || null,
        event_type: 'premium' as const,
        max_attendees: seats.length,
        is_public: publish,
        status: publish ? 'published' : 'draft',
        owner_id: user!.id,
        categories: formData.categories || [],
        tags: formData.tags || [],
        images: uploadedImages || {},
        display_price: null // Premium events don't use display price
      };

      if (mode === 'edit' && eventId) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', eventId);

        if (error) throw error;
      } else {
        // Create new event
        const { data: event, error } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single();

        if (error) throw error;
        if (!event) throw new Error('Event creation failed');

        // Create ticket types
        if (ticketTypes.length > 0) {
          const ticketPromises = ticketTypes.map(async (ticket) => {
            const ticketData = {
              event_id: event.id,
              name: ticket.name.trim(),
              description: ticket.description?.trim() || null,
              price: ticket.price,
              early_bird_price: ticket.hasEarlyBird && ticket.earlyBirdPrice ? ticket.earlyBirdPrice : null,
              early_bird_until: ticket.hasEarlyBird && ticket.earlyBirdUntil ? ticket.earlyBirdUntil : null,
              quantity: ticket.quantity,
              max_per_person: 10,
              is_active: true
            };

            const { error: ticketError } = await supabase
              .from('ticket_types')
              .insert(ticketData);

            if (ticketError) throw ticketError;
          });

          await Promise.all(ticketPromises);
        }

        // TODO: Store seating configuration when seating tables are available
      }

      toast.success(publish ? 'Event published successfully!' : 'Event saved as draft');
      
      if (publish) {
        navigate('/events');
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-purple-600" />
            {mode === 'create' ? 'Create Premium Event' : 'Edit Premium Event'}
          </h2>
          <p className="text-muted-foreground">
            Design an exclusive event with assigned seating
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isDraft ? 'secondary' : 'default'}>
            {isDraft ? 'Draft' : 'Ready to Publish'}
          </Badge>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/venues')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Venues
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div>
        <Progress value={progress} className="h-2 mb-4" />
        <div className="flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = getStepIndex(step.id) < getStepIndex(currentStep);
            const canNavigate = isCompleted || step.id === currentStep || 
              (index > 0 && canProceedFromStep(steps[index - 1].id));
            
            return (
              <button
                key={step.id}
                onClick={() => canNavigate && goToStep(step.id)}
                disabled={!canNavigate}
                className={cn(
                  "flex flex-col items-center gap-2 flex-1 p-2 rounded-lg transition-colors",
                  isActive && "bg-primary/10",
                  canNavigate && !isActive && "hover:bg-muted cursor-pointer",
                  !canNavigate && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-green-600 text-white",
                  !isActive && !isCompleted && "bg-muted"
                )}>
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="text-center">
                  <div className={cn(
                    "text-sm font-medium",
                    isActive && "text-primary"
                  )}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 1: Event Information */}
          {currentStep === 'event-info' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Event Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Annual Charity Gala"
                      {...form.register('title')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Organization Name *</Label>
                    <Input
                      id="organizationName"
                      placeholder="e.g., Your Organization"
                      {...form.register('organizationName')}
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your premium event..."
                    rows={4}
                    {...form.register('description')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Event Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      {...form.register('date')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="time">Start Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      {...form.register('time')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date (Optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...form.register('endDate')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time (Optional)</Label>
                    <Input
                      id="endTime"
                      type="time"
                      {...form.register('endTime')}
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="venueName">Venue Name *</Label>
                  <Input
                    id="venueName"
                    placeholder="e.g., Grand Ballroom"
                    {...form.register('venueName')}
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="address">Event Address</Label>
                  <GooglePlacesInput
                    value={form.watch('address') || ''}
                    onChange={(value, placeData) => {
                      form.setValue('address', value)
                      if (placeData) {
                        // Store coordinates and place data if needed
                        console.log('Place selected:', placeData)
                      }
                    }}
                    placeholder="Search for venue, address, or landmark..."
                    error={!!form.formState.errors.address}
                    className="w-full"
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.address.message}</p>
                  )}
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Event Categories *</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Gala', 'Wedding', 'Corporate', 'Fundraiser', 'Award Show', 'VIP Event'].map(category => {
                      const isSelected = form.watch('categories')?.includes(category);
                      return (
                        <Badge
                          key={category}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const current = form.getValues('categories') || [];
                            if (isSelected) {
                              form.setValue('categories', current.filter(c => c !== category));
                            } else {
                              form.setValue('categories', [...current, category]);
                            }
                          }}
                        >
                          {category}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Event Images</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Banner Image */}
                  <div>
                    <Label>Banner Image *</Label>
                    <div className="mt-2">
                      {uploadedImages.banner ? (
                        <div className="relative">
                          <img
                            src={uploadedImages.banner}
                            alt="Banner"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeImage('banner')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <Label htmlFor="banner-upload" className="cursor-pointer">
                            <span className="text-sm text-primary">Click to upload banner</span>
                          </Label>
                          <Input
                            id="banner-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'banner')}
                            disabled={isProcessingImage}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Postcard Image */}
                  <div>
                    <Label>Postcard Image (Optional)</Label>
                    <div className="mt-2">
                      {uploadedImages.postcard ? (
                        <div className="relative">
                          <img
                            src={uploadedImages.postcard}
                            alt="Postcard"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeImage('postcard')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <Label htmlFor="postcard-upload" className="cursor-pointer">
                            <span className="text-sm text-primary">Click to upload postcard</span>
                          </Label>
                          <Input
                            id="postcard-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'postcard')}
                            disabled={isProcessingImage}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Ticket Creation */}
          {currentStep === 'tickets' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Create Ticket Types</h3>
                <p className="text-muted-foreground mb-4">
                  Define your ticket categories with pricing and quantities
                </p>
              </div>

              <TicketConfigurationWizard
                form={form}
                eventType="premium"
                initialTickets={ticketTypes}
                onTicketsChange={setTicketTypes}
              />
              
              {ticketTypes.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Total Capacity</h4>
                      <p className="text-sm text-muted-foreground">Across all ticket types</p>
                    </div>
                    <p className="text-2xl font-bold">
                      {ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0)} seats
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Venue Layout Upload */}
          {currentStep === 'venue-layout' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Upload Venue Layout</h3>
                <p className="text-muted-foreground mb-4">
                  Select an existing venue or upload a new layout image
                </p>
              </div>

              {/* Existing Venues */}
              {venues.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Select from your venues:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {venues.map(venue => (
                      <Card
                        key={venue.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedVenue?.id === venue.id && "ring-2 ring-primary"
                        )}
                        onClick={() => setSelectedVenue(venue)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{venue.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {venue.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
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
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Upload New Layout */}
              <div>
                <h4 className="font-medium mb-3">Upload a new venue layout:</h4>
                {!venueImagePreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <Label htmlFor="venue-layout-input" className="cursor-pointer">
                      <div className="text-sm font-medium text-primary hover:text-primary/80">
                        Click to upload venue layout
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Supports JPG, PNG, SVG up to 10MB
                      </p>
                    </Label>
                    <Input
                      id="venue-layout-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleVenueImageSelect}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <img 
                      src={venueImagePreview} 
                      alt="Venue preview" 
                      className="w-full max-h-96 object-contain rounded-lg border"
                    />
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setVenueImageFile(null);
                          setVenueImagePreview('');
                        }}
                      >
                        Remove Image
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedVenue(null)}
                      >
                        Use This Layout
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {selectedVenue && (
                <Alert className="mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Selected venue:</strong> {selectedVenue.name} ({selectedVenue.capacity} seats)
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 4: Seat Placement */}
          {currentStep === 'seat-placement' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Place Seats on Layout</h3>
                <p className="text-muted-foreground mb-4">
                  Click on the venue image to place numbered seats
                </p>
              </div>

              {/* Inventory Tracker */}
              <div className="mb-4">
                <TicketInventoryTracker
                  tickets={ticketTypes}
                  placedSeats={seats}
                />
              </div>

              {/* Seating Manager */}
              {(selectedVenue?.imageUrl || venueImagePreview) && (
                <PremiumSeatingManager
                  venueImageUrl={selectedVenue?.imageUrl || venueImagePreview}
                  onSeatingConfigurationChange={handleSeatingConfigurationChange}
                  initialSeats={seats}
                  initialCategories={categories}
                  ticketTypes={ticketTypes}
                  startingTab="place"
                  showOnlyTab="place"
                />
              )}

              {/* Progress Alert */}
              {seats.length > 0 && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {seats.length < ticketTypes.reduce((sum, t) => sum + t.quantity, 0) ? (
                      <>
                        <strong>Progress:</strong> You've placed {seats.length} seats. 
                        Place {ticketTypes.reduce((sum, t) => sum + t.quantity, 0) - seats.length} more to match your ticket quantities.
                      </>
                    ) : (
                      <>
                        <strong>Complete!</strong> All {seats.length} seats have been placed on the venue layout.
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Review Your Premium Event</h3>
                <p className="text-muted-foreground mb-4">
                  Review all details before publishing your event
                </p>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Event Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title:</span>
                      <span className="font-medium">{form.watch('title')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Organization:</span>
                      <span className="font-medium">{form.watch('organizationName')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">
                        {form.watch('date')} at {form.watch('time')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Venue:</span>
                      <span className="font-medium">{form.watch('venueName')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categories:</span>
                      <span className="font-medium">{form.watch('categories')?.join(', ')}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Ticket Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ticket Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ticketTypes.map(ticket => (
                        <div key={ticket.id} className="flex justify-between text-sm">
                          <span>{ticket.name}</span>
                          <span className="font-medium">
                            {ticket.quantity} × ${ticket.price}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium">
                      <span>Total Capacity:</span>
                      <span>{ticketTypes.reduce((sum, t) => sum + t.quantity, 0)} seats</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Seating Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Seating Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Venue Layout:</span>
                      <span className="font-medium">
                        {selectedVenue ? selectedVenue.name : 'Custom Upload'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seats Placed:</span>
                      <span className="font-medium">{seats.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Ready to publish!</strong> Your premium event is configured and ready to go live.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>

        <CardContent className="p-6 border-t">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 'event-info'}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => saveEvent(false)}
                disabled={isSaving}
              >
                Save Draft
              </Button>
              
              {currentStep === 'review' ? (
                <Button
                  onClick={() => saveEvent(true)}
                  disabled={isSaving || !canProceedFromStep('seat-placement')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Publish to /events
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={!canProceedFromStep(currentStep)}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}