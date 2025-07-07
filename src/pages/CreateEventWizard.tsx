import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useWizardNavigation } from "@/hooks/useWizardNavigation";
import { useImageUpload } from "@/hooks/useImageUpload";
import { EventFormData, eventFormSchema } from "@/types/event-form";
import { WizardNavigator } from "@/components/create-event/wizard/WizardNavigator";
import { WizardControls } from "@/components/create-event/wizard/WizardControls";
import { EventTypeSelection } from "@/components/create-event/EventTypeSelection";
import { BasicInformation } from "@/components/create-event/BasicInformation";
import { TicketConfigurationWizard, TicketType } from "@/components/create-event/TicketConfigurationWizard";
import { SeatingChartWizard } from "@/components/create-event/SeatingChartWizard";
import { ReviewStepWizard } from "@/components/create-event/ReviewStepWizard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function CreateEventWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [eventType, setEventType] = useState<'simple' | 'ticketed' | 'premium' | ''>('');
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [seatingConfig, setSeatingConfig] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Debug eventType changes
  useEffect(() => {
    console.log('🔄 EventType changed to:', eventType);
  }, [eventType]);

  // Initialize form with validation
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
      isPublic: true,
      tags: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      images: {}
    }
  });

  // Image upload functionality
  const {
    uploadedImages,
    isProcessingImage,
    processingProgress,
    handleImageUpload,
    removeImage
  } = useImageUpload();

  // Wizard navigation with enhanced validation
  const {
    currentStep,
    currentStepInfo,
    visibleSteps,
    progress,
    canGoForward,
    canGoBackward,
    nextStep,
    prevStep,
    goToStep,
    validateCurrentStep,
    getStepStatus,
    getValidationSummary
  } = useWizardNavigation({
    form,
    eventType,
    selectedCategories,
    onStepChange: (stepId, direction) => {
      console.log(`🧭 Wizard navigating ${direction} to step: ${stepId}`);
    },
    onValidationError: (errors, stepId) => {
      console.log(`❌ Validation error on step ${stepId}:`, errors);
      toast.error(`Please fix the following issues: ${errors.join(', ')}`);
    }
  });

  // Debug wizard state changes
  useEffect(() => {
    console.log('🧭 Wizard state update:');
    console.log('  Current step:', currentStep);
    console.log('  Current step info:', currentStepInfo?.id);
    console.log('  Visible steps:', visibleSteps.map(s => s.id));
    console.log('  Progress:', progress + '%');
  }, [currentStep, currentStepInfo, visibleSteps, progress]);

  // Redirect non-authenticated users
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Sync form categories with selected categories
  useEffect(() => {
    form.setValue('categories', selectedCategories);
  }, [selectedCategories, form]);

  // Sync form images with uploaded images
  useEffect(() => {
    form.setValue('images', uploadedImages);
  }, [uploadedImages, form]);

  // Category management
  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => {
      const isSelected = prev.includes(categoryId);
      if (isSelected) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Image upload handlers
  const handleImageUploadWrapper = async (files: FileList, imageType: 'banner' | 'postcard' = 'banner') => {
    if (files.length > 0) {
      try {
        await handleImageUpload(files, imageType);
        toast.success(`${imageType} image uploaded successfully!`);
      } catch (error) {
        console.error('Image upload error:', error);
        toast.error(`Failed to upload ${imageType} image. Please try again.`);
      }
    }
  };

  const handleRemoveImage = (imageType: 'banner' | 'postcard') => {
    removeImage(imageType);
    toast.success(`${imageType} image removed`);
  };

  // Handle ticket configuration changes
  const handleTicketsChange = (tickets: TicketType[]) => {
    setTicketTypes(tickets);
    console.log('Tickets updated:', tickets);
  };

  // Save event function
  const saveEvent = async (status: 'draft' | 'published' = 'draft') => {
    const validation = validateCurrentStep();
    if (!validation.isValid && status === 'published') {
      toast.error('Please fix all validation errors before publishing');
      return false;
    }

    setIsSaving(true);
    try {
      const formData = form.getValues();
      
      // For Simple Events, append display price to description
      let description = formData.description?.trim() || '';
      if (eventType === 'simple' && (formData.displayPrice?.amount !== undefined || formData.displayPrice?.label)) {
        const amount = formData.displayPrice.amount || 0;
        const label = formData.displayPrice.label?.trim() || '';
        const priceText = `[PRICE:${amount}|${label}]`;
        description = description ? `${description}\n\n${priceText}` : priceText;
      }

      const eventData = {
        title: formData.title.trim(),
        description: description || null,
        organization_name: formData.organizationName?.trim() || null,
        venue_name: formData.venueName?.trim() || null,
        date: formData.date,
        time: formData.time,
        location: formData.address.trim(),
        event_type: eventType,
        max_attendees: formData.capacity || null,
        is_public: formData.isPublic,
        status: status,
        owner_id: user!.id,
        categories: selectedCategories,
        images: uploadedImages || {}
      };

      console.log('Saving event with data:', eventData);

      const { data: event, error } = await supabase
        .from("events")
        .insert(eventData)
        .select()
        .single();

      if (error) {
        console.error("Supabase error creating event:", error);
        toast.error(`Failed to create event: ${error.message}`);
        return false;
      }

      if (!event) {
        toast.error("Event creation failed - no data returned");
        return false;
      }

      console.log("Event created successfully:", event);
      
      // Save ticket types if this is a ticketed or premium event
      if ((eventType === 'ticketed' || eventType === 'premium') && ticketTypes.length > 0) {
        console.log('Creating ticket types for event:', event.id);
        
        const ticketTypePromises = ticketTypes.map(async (ticket) => {
          const ticketData = {
            event_id: event.id,
            name: ticket.name.trim(),
            description: ticket.description?.trim() || null,
            price: ticket.price,
            quantity: ticket.quantity,
            max_per_person: 10, // Default limit
            is_active: true
          };

          const { error: ticketError } = await supabase
            .from("ticket_types")
            .insert(ticketData);

          if (ticketError) {
            console.error("Error creating ticket type:", ticketError);
            throw new Error(`Failed to create ticket type "${ticket.name}": ${ticketError.message}`);
          }
          
          console.log(`Created ticket type: ${ticket.name} for $${ticket.price}`);
        });

        try {
          await Promise.all(ticketTypePromises);
          console.log('All ticket types created successfully');
        } catch (ticketError) {
          console.error('Error creating ticket types:', ticketError);
          toast.error(`Event created but failed to save ticket types: ${ticketError instanceof Error ? ticketError.message : 'Unknown error'}`);
          return false;
        }
      }

      // Associate seating chart with event for Premium events
      if (eventType === 'premium' && seatingConfig?.seatingChartId) {
        try {
          const { error: seatingError } = await supabase
            .from('seating_charts')
            .update({ event_id: event.id })
            .eq('id', seatingConfig.seatingChartId);

          if (seatingError) {
            console.error('Error linking seating chart to event:', seatingError);
            toast.error('Event created but failed to link seating chart');
          } else {
            console.log('Seating chart successfully linked to event');
          }
        } catch (error) {
          console.error('Error updating seating chart:', error);
        }
      }

      toast.success(`Event ${status === 'published' ? 'published' : 'saved as draft'} successfully!`);
      
      // Reset form and navigate
      form.reset();
      // Clear images manually since clearAllImages doesn't exist
      if (uploadedImages.banner) removeImage('banner');
      if (uploadedImages.postcard) removeImage('postcard');
      setSelectedCategories([]);
      setTicketTypes([]);
      setEventType('');
      setSeatingConfig(null);
      
      if (status === "published") {
        navigate(`/events/${event.id}`);
      } else {
        navigate("/dashboard/events/drafts");
      }
      
      return true;
    } catch (error) {
      console.error("Error creating event:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to create event: ${errorMessage}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Get current validation state
  const validationSummary = getValidationSummary();

  if (!user) {
    return null;
  }

  const renderCurrentStep = () => {
    if (!currentStepInfo) return null;

    switch (currentStepInfo.id) {
      case 'event-type':
        return (
          <EventTypeSelection
            eventType={eventType}
            setEventType={setEventType}
          />
        );
        
      case 'basic-info':
        return (
          <BasicInformation
            form={form}
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryToggle}
            uploadedImages={uploadedImages}
            onImageUpload={handleImageUploadWrapper}
            onRemoveImage={handleRemoveImage}
            isProcessingImage={isProcessingImage}
            eventType={eventType}
          />
        );
        
      case 'ticketing':
        return (
          <TicketConfigurationWizard
            form={form}
            eventType={eventType}
            onTicketsChange={handleTicketsChange}
          />
        );
        
      case 'seating-setup':
        return (
          <SeatingChartWizard
            form={form}
            eventType={eventType}
            ticketTypes={ticketTypes}
            onSeatingConfigured={(seatingData) => {
              console.log('Seating configured:', seatingData);
              setSeatingConfig(seatingData);
            }}
            startingTab="setup"
            // No showOnlyTab - allow full workflow in one step
            onStepAdvance={() => {
              console.log('🚀 onStepAdvance called from combined SeatingChartWizard');
              const formData = form.getValues();
              console.log('📊 Combined seating step validation data:', {
                venueImageUrl: formData.venueImageUrl ? 'SET' : 'NOT_SET',
                hasVenueImage: formData.hasVenueImage,
                seats: formData.seats ? `${formData.seats.length} seats` : 'NO_SEATS',
                seatCategories: formData.seatCategories ? `${formData.seatCategories.length} categories` : 'NO_CATEGORIES',
                canGoForward: canGoForward,
                currentStep: currentStep
              });
              const result = nextStep();
              console.log('📈 nextStep result:', result);
              return result;
            }}
          />
        );
        
      case 'seating-finalize':
        return (
          <SeatingChartWizard
            form={form}
            eventType={eventType}
            ticketTypes={ticketTypes}
            onSeatingConfigured={(seatingData) => {
              console.log('Seating configured:', seatingData);
              setSeatingConfig(seatingData);
            }}
            startingTab="info"
            showOnlyTab="info"
          />
        );
        
      case 'review':
        return (
          <ReviewStepWizard
            form={form}
            eventType={eventType}
            selectedCategories={selectedCategories}
            uploadedImages={uploadedImages}
            onSave={(status) => saveEvent(status)}
            isSaving={isSaving}
          />
        );
        
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-4xl font-bold mb-4 text-foreground">Create Event</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Create your event step by step with our guided wizard
          </p>
        </div>

        {/* Wizard Navigator */}
        <WizardNavigator
          steps={visibleSteps}
          currentStep={currentStep}
          getStepStatus={getStepStatus}
          onStepClick={goToStep}
          isNavigating={false}
          validationErrors={validationSummary.currentStepErrors}
          validationWarnings={validationSummary.currentStepWarnings}
          className="mb-8"
        />

        {/* Step Content */}
        <div className="mb-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation Controls - Only show if not on review step */}
        {currentStepInfo?.id !== 'review' && (
          <WizardControls
            canGoBack={canGoBackward}
            canGoForward={canGoForward}
            onBack={prevStep}
            onNext={nextStep}
            isFirstStep={currentStep === 1}
            isLastStep={currentStep === visibleSteps.length}
            isNavigating={false}
            nextButtonText={currentStepInfo?.id === 'event-type' ? 'Continue' : 'Next Step'}
            backButtonText="Previous"
            errors={validationSummary.currentStepErrors}
            warnings={validationSummary.currentStepWarnings}
            className="mt-8"
          />
        )}

        {/* Progress indicator */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Step {currentStep} of {visibleSteps.length} • {progress}% complete
          {isProcessingImage && (
            <div className="mt-2 text-primary">
              Processing image... {processingProgress.stage} ({processingProgress.current}/{processingProgress.total})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}