import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useNavigate } from "react-router-dom";
import { EventTypeSelection } from "@/components/create-event/EventTypeSelection";
import { BasicInformation } from "@/components/create-event/BasicInformation";
import { TicketConfiguration } from "@/components/create-event/TicketConfiguration";
import { ReviewStep } from "@/components/create-event/ReviewStep";
import { WizardNavigator, WizardControls } from "@/components/create-event/wizard";
import { EventsService } from "@/lib/events-db";
import { Event, EventInsert, ImageMetadata } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { EventFormData, EventType, eventFormSchema } from "@/types/event-form";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useEventData } from "@/hooks/useEventData";
import { useWizardNavigation } from "@/hooks/useWizardNavigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const EditEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventType, setEventType] = useState<EventType['id'] | "">("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalEvent, setOriginalEvent] = useState<Event | null>(null);
  
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      organizationName: "",
      date: "",
      time: "",
      address: "",
      categories: [],
      isPublic: true,
      tags: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      images: {}
    },
    mode: "onChange"
  });

  const { eventData, setEventData, addTicketTier, removeTicketTier, updateTicketTier } = useEventData();
  const { uploadedImages, setUploadedImages, isProcessingImage, processingProgress, handleImageUpload, removeImage } = useImageUpload();
  
  const wizard = useWizardNavigation({ 
    form, 
    eventType, 
    selectedCategories,
    enableHistory: true,
    onStepChange: (stepId, direction) => {
      console.log(`Navigated to step: ${stepId}, direction: ${direction}`);
    },
    onValidationError: (errors, stepId) => {
      console.log(`Validation errors in step ${stepId}:`, errors);
    }
  });

  const eventTypes: EventType[] = [
    { id: "simple", title: "Simple Events" },
    { id: "ticketed", title: "Ticketed Events" },
    { id: "premium", title: "Premium Events" }
  ];

  // Load event data on component mount
  useEffect(() => {
    const loadEvent = async () => {
      if (!id || !user?.id) {
        setError("Invalid event ID or user not authenticated");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const event = await EventsService.getEvent(id);
        
        if (!event) {
          setError("Event not found");
          return;
        }

        // Check if user owns this event
        if (event.owner_id !== user.id) {
          setError("You don't have permission to edit this event");
          return;
        }

        setOriginalEvent(event);

      } catch (err) {
        console.error('Error loading event:', err);
        setError('Failed to load event data');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [id, user?.id]);

  // Populate form when originalEvent changes
  useEffect(() => {
    if (originalEvent) {
      // Populate form with existing event data
      form.reset({
        title: originalEvent.title || "",
        description: originalEvent.description || "",
        organizationName: originalEvent.organization_name || "",
        date: originalEvent.date || "",
        time: originalEvent.time || "",
        address: originalEvent.location || "",
        categories: originalEvent.categories || [],
        isPublic: originalEvent.is_public ?? true,
        tags: [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        images: {}
      });

      // Set event type and categories
      setEventType(originalEvent.event_type || "simple");
      setSelectedCategories(originalEvent.categories || []);

      // Load existing images if any
      if (originalEvent.images && typeof originalEvent.images === 'object') {
        const images = originalEvent.images as Record<string, ImageMetadata>;
        const loadedImages: any = {};
        
        if (images.banner) {
          loadedImages.banner = {
            medium: images.banner.url,
            metadata: { compressedSize: images.banner.size || 0 }
          };
        }
        
        if (images.postcard) {
          loadedImages.postcard = {
            medium: images.postcard.url,
            metadata: { compressedSize: images.postcard.size || 0 }
          };
        }
        
        setUploadedImages(loadedImages);
      }

      // Set event data for other components
      setEventData({
        title: originalEvent.title || '',
        description: originalEvent.description || '',
        organizationName: originalEvent.organization_name || '',
        date: originalEvent.date || '',
        time: originalEvent.time || '',
        location: originalEvent.location || '',
        category: (originalEvent.categories || []).join(', '),
        capacity: originalEvent.max_attendees,
        isPublic: originalEvent.is_public ?? true,
        images: [],
        tickets: []
      });
    }
  }, [originalEvent]);

  const handleImageUploadWithForm = useCallback(async (files: FileList, imageType: 'banner' | 'postcard' = 'banner') => {
    await handleImageUpload(files, imageType);
  }, [handleImageUpload]);

  const removeImageWithForm = useCallback((imageType: 'banner' | 'postcard') => {
    removeImage(imageType);
  }, [removeImage]);

  // Sync uploadedImages and categories with form whenever they change
  useEffect(() => {
    form.setValue('images', uploadedImages);
  }, [uploadedImages, form]);

  useEffect(() => {
    form.setValue('categories', selectedCategories);
  }, [selectedCategories, form]);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    console.log("Category toggled:", categoryId);
    setSelectedCategories(prev => {
      const newCategories = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      
      return newCategories;
    });
  }, []);

  // Enhanced step change handler that syncs form data
  const handleStepDataSync = useCallback(() => {
    if (wizard.currentStep === 2) {
      const formData = form.getValues();
      console.log("Syncing form data to eventData:", formData);
      setEventData(prev => ({
        ...prev,
        title: formData.title || '',
        description: formData.description || '',
        organizationName: formData.organizationName || '',
        date: formData.date || '',
        time: formData.time || '',
        endDate: formData.endDate,
        endTime: formData.endTime,
        location: formData.address || '',
        category: selectedCategories.join(', '),
        capacity: formData.capacity,
        displayPrice: formData.displayPrice ? {
          amount: formData.displayPrice.amount,
          label: formData.displayPrice.label
        } : undefined,
        isPublic: formData.isPublic ?? true,
        images: []
      }));
    }
  }, [wizard.currentStep, form, selectedCategories, setEventData]);

  // Sync data when step changes
  useEffect(() => {
    handleStepDataSync();
  }, [wizard.currentStep]);

  // Create eventData with actual images for ReviewStep
  const eventDataWithImages = {
    ...eventData,
    images: [
      ...(uploadedImages.banner ? [uploadedImages.banner.medium] : []),
      ...(uploadedImages.postcard ? [uploadedImages.postcard.medium] : [])
    ]
  };

  const handleUpdate = async () => {
    if (!user?.id || !originalEvent?.id) {
      console.error("User not authenticated or event not loaded");
      return;
    }

    console.log("Updating event with data:", eventData);
    console.log("Uploaded images:", uploadedImages);
    setIsPublishing(true);
    
    try {
      // Convert uploadedImages to database format
      const imageMetadata: Record<string, ImageMetadata> = {};
      
      if (uploadedImages.banner) {
        imageMetadata.banner = {
          url: uploadedImages.banner.medium,
          alt: "Event banner image",
          size: uploadedImages.banner.metadata.compressedSize,
          filename: "banner"
        };
      }
      
      if (uploadedImages.postcard) {
        imageMetadata.postcard = {
          url: uploadedImages.postcard.medium,
          alt: "Event postcard image", 
          size: uploadedImages.postcard.metadata.compressedSize,
          filename: "postcard"
        };
      }

      // Format data for database update
      const eventToUpdate: Partial<Event> = {
        title: eventData.title,
        description: eventData.description,
        organization_name: eventData.organizationName || 'Unknown Organization',
        date: eventData.date,
        time: eventData.time,
        location: eventData.location,
        categories: selectedCategories,
        event_type: eventType as 'simple' | 'ticketed' | 'premium',
        images: imageMetadata,
        is_public: eventData.isPublic ?? true,
        max_attendees: eventData.capacity,
      };

      console.log("Formatted event for database update:", eventToUpdate);
      
      const updatedEvent = await EventsService.updateEvent(originalEvent.id, eventToUpdate);
      
      if (updatedEvent) {
        console.log("Event updated successfully:", updatedEvent);
        navigate('/dashboard/events');
      } else {
        throw new Error('Failed to update event');
      }
      
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    const isDashboardContext = window.location.pathname.startsWith('/dashboard')
    
    return (
      <div className={isDashboardContext ? "flex items-center justify-center min-h-[400px]" : "min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center"}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isDashboardContext = window.location.pathname.startsWith('/dashboard')
    
    return (
      <div className={isDashboardContext ? "" : "min-h-screen bg-gradient-to-br from-background to-muted/20"}>
        <div className={isDashboardContext ? "max-w-4xl" : "container mx-auto px-4 py-8 max-w-4xl"}>
          <div className="mb-8">
            <Link to="/dashboard/events">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to My Events
              </Button>
            </Link>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Check if we're in dashboard context
  const isDashboardContext = window.location.pathname.startsWith('/dashboard')
  
  return (
    <div className={isDashboardContext ? "" : "min-h-screen bg-gradient-to-br from-background to-muted/20"}>
      <div className={isDashboardContext ? "max-w-4xl" : "container mx-auto px-4 py-8 max-w-4xl"}>
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Link to="/dashboard/events">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to My Events
                </Button>
              </Link>
              <h1 className="text-4xl font-bold mb-4 text-foreground">Edit Event</h1>
              <p className="text-xl text-muted-foreground mb-6">
                Update your event details below
              </p>
            </div>
          </div>
          
          {/* Enhanced Wizard Navigation */}
          <WizardNavigator
            steps={wizard.visibleSteps}
            currentStep={wizard.currentStep}
            getStepStatus={wizard.getStepStatus}
            onStepClick={wizard.goToStep}
            isNavigating={wizard.isNavigating}
            validationErrors={wizard.lastValidationResult?.errors || []}
            validationWarnings={wizard.lastValidationResult?.warnings || []}
          />
        </div>

        {/* Step 1: Event Type Selection */}
        {wizard.currentStep === 1 && (
          <div className="space-y-6">
            <EventTypeSelection 
              eventType={eventType} 
              setEventType={setEventType} 
            />
            <WizardControls
              canGoBack={wizard.canGoBackward}
              canGoForward={wizard.canGoForward}
              onBack={wizard.prevStep}
              onNext={wizard.nextStep}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              isNavigating={wizard.isNavigating}
              errors={wizard.lastValidationResult?.errors || []}
              warnings={wizard.lastValidationResult?.warnings || []}
              nextButtonText={eventType ? `Continue with ${eventType === 'simple' ? 'Simple Events' : eventType === 'ticketed' ? 'Ticketed Events' : 'Premium Events'}` : 'Select an event type to continue'}
            />
          </div>
        )}

        {/* Step 2: Basic Information */}
        {wizard.currentStep === 2 && (
          <div className="space-y-6">
            <BasicInformation 
              form={form}
              selectedCategories={selectedCategories}
              onCategoryToggle={handleCategoryToggle}
              uploadedImages={uploadedImages}
              onImageUpload={handleImageUploadWithForm}
              onRemoveImage={removeImageWithForm}
              isProcessingImage={isProcessingImage}
              eventType={eventType}
            />
            <WizardControls
              canGoBack={wizard.canGoBackward}
              canGoForward={wizard.canGoForward}
              onBack={wizard.prevStep}
              onNext={wizard.nextStep}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              isNavigating={wizard.isNavigating}
              errors={wizard.lastValidationResult?.errors || []}
              warnings={wizard.lastValidationResult?.warnings || []}
              helpText="Complete all required fields to continue to the next step"
            />
          </div>
        )}

        {/* Step 3: Ticketing (for Ticketed/Premium events) */}
        {wizard.currentStep === 3 && eventType !== "simple" && (
          <div className="space-y-6">
            <TicketConfiguration
              tickets={eventData.tickets}
              onAddTicketTier={addTicketTier}
              onRemoveTicketTier={removeTicketTier}
              onUpdateTicketTier={updateTicketTier}
              onNext={wizard.nextStep}
              onPrevious={wizard.prevStep}
            />
            <WizardControls
              canGoBack={wizard.canGoBackward}
              canGoForward={wizard.canGoForward}
              onBack={wizard.prevStep}
              onNext={wizard.nextStep}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              isNavigating={wizard.isNavigating}
              errors={wizard.lastValidationResult?.errors || []}
              warnings={wizard.lastValidationResult?.warnings || []}
              nextButtonText="Continue to Review"
              helpText="Configure your ticket types and pricing"
            />
          </div>
        )}

        {/* Step 3: Review (for Simple events - skip ticketing) */}
        {wizard.currentStep === 3 && eventType === "simple" && (
          <div className="space-y-6">
            <ReviewStep
              eventData={eventDataWithImages}
              eventType={eventType}
              eventTypes={eventTypes}
            />
            <WizardControls
              canGoBack={wizard.canGoBackward}
              canGoForward={true}
              onBack={wizard.prevStep}
              onNext={handleUpdate}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              isLoading={isPublishing}
              isNavigating={wizard.isNavigating}
              errors={wizard.lastValidationResult?.errors || []}
              warnings={wizard.lastValidationResult?.warnings || []}
              nextButtonText="Update Event"
              helpText="Review your changes and update when ready"
            />
          </div>
        )}

        {/* Step 4: Review (for Ticketed/Premium events) */}
        {wizard.currentStep === 4 && (
          <div className="space-y-6">
            <ReviewStep
              eventData={eventDataWithImages}
              eventType={eventType}
              eventTypes={eventTypes}
            />
            <WizardControls
              canGoBack={wizard.canGoBackward}
              canGoForward={true}
              onBack={wizard.prevStep}
              onNext={handleUpdate}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              isLoading={isPublishing}
              isNavigating={wizard.isNavigating}
              errors={wizard.lastValidationResult?.errors || []}
              warnings={wizard.lastValidationResult?.warnings || []}
              nextButtonText="Update Event"
              helpText="Review your changes and update when ready"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EditEvent;