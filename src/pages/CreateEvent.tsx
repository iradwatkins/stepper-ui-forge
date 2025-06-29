import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EventTypeSelection } from "@/components/create-event/EventTypeSelection";
import { BasicInformation } from "@/components/create-event/BasicInformation";
import { TicketConfiguration } from "@/components/create-event/TicketConfiguration";
import { ReviewStep } from "@/components/create-event/ReviewStep";
import { WizardNavigator, WizardControls } from "@/components/create-event/wizard";
import { EventsService } from "@/lib/events-db";
import { Event, EventInsert, ImageMetadata } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { EventFormData, EventType, eventFormSchema } from "@/types/event-form";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useEventData } from "@/hooks/useEventData";
import { useWizardNavigation } from "@/hooks/useWizardNavigation";

console.log("CreateEvent component loading...");

const CreateEvent = () => {
  console.log("CreateEvent component rendering...");

  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventType, setEventType] = useState<EventType['id'] | "">("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  
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
    mode: "onChange" // Enable validation on change for better UX
  });

  const { eventData, setEventData, addTicketTier, removeTicketTier, updateTicketTier } = useEventData();
  const { uploadedImages, setUploadedImages, isProcessingImage, processingProgress, handleImageUpload, removeImage } = useImageUpload();
  
  // Enhanced wizard navigation
  const wizard = useWizardNavigation({ 
    form, 
    eventType, 
    selectedCategories 
  });
  const { lastSaved, clearDraft, loadDraft } = useAutoSave({
    form,
    eventType,
    selectedCategories,
    uploadedImages,
    currentStep: wizard.currentStep,
    enabled: autoSaveEnabled
  });

  const eventTypes: EventType[] = [
    { id: "simple", title: "Simple Events" },
    { id: "ticketed", title: "Ticketed Events" },
    { id: "premium", title: "Premium Events" }
  ];

  // Load draft on component mount
  useEffect(() => {
    loadDraft(setEventType, setSelectedCategories, setUploadedImages, wizard.goToStep);
  }, [wizard.goToStep]);

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

  const handleNextStep = () => {
    console.log("Moving to next step from:", wizard.currentStep);
    console.log("Can go forward:", wizard.canGoForward);
    console.log("Form data:", form.getValues());
    console.log("Selected categories:", selectedCategories);
    console.log("Event type:", eventType);
    
    if (wizard.currentStep === 2) {
      const formData = form.getValues();
      console.log("Updating eventData with form data:", formData);
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
        images: []  // Legacy field - actual images are in uploadedImages state
      }));
    }
    
    wizard.nextStep();
  };

  const handlePrevStep = () => {
    console.log("Moving to previous step from:", wizard.currentStep);
    wizard.prevStep();
  };

  // Create eventData with actual images for ReviewStep
  const eventDataWithImages = {
    ...eventData,
    images: [
      ...(uploadedImages.banner ? [uploadedImages.banner.medium] : []),
      ...(uploadedImages.postcard ? [uploadedImages.postcard.medium] : [])
    ]
  };

  const handlePublish = async () => {
    if (!user?.id) {
      console.error("User not authenticated");
      return;
    }

    console.log("Publishing event with data:", eventData);
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

      // Format data for database (snake_case fields)
      const eventToSave: EventInsert = {
        owner_id: user.id,
        title: eventData.title,
        description: eventData.description,
        organization_name: eventData.organizationName || 'Unknown Organization',
        date: eventData.date,
        time: eventData.time,
        location: eventData.location,
        categories: selectedCategories,
        event_type: eventType as 'simple' | 'ticketed' | 'premium',
        status: 'published',
        images: imageMetadata,
        is_public: eventData.isPublic ?? true,
        max_attendees: eventData.capacity,
        registration_deadline: null
      };

      console.log("Formatted event for database:", eventToSave);
      
      const savedEvent = await EventsService.createEvent(eventToSave);
      
      if (savedEvent) {
        localStorage.removeItem('draft-event');
        console.log("Event published successfully:", savedEvent);
        navigate('/dashboard');
      } else {
        throw new Error('Failed to create event');
      }
      
    } catch (error) {
      console.error("Error publishing event:", error);
      alert("Failed to publish event. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClearDraft = () => {
    clearDraft();
    form.reset();
    setEventType("");
    setSelectedCategories([]);
    setUploadedImages({});
    wizard.goToStep(1);
  };

  console.log("Current step:", wizard.currentStep, "Event type:", eventType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-4 text-foreground">Create Your Event</h1>
              <p className="text-xl text-muted-foreground mb-6">
                Follow the steps below to create your event
              </p>
            </div>
            
            {lastSaved && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </p>
                <button 
                  onClick={handleClearDraft}
                  className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                >
                  Clear draft
                </button>
              </div>
            )}
          </div>
          
          {/* Enhanced Wizard Navigation */}
          <WizardNavigator
            steps={wizard.visibleSteps}
            currentStep={wizard.currentStep}
            getStepStatus={wizard.getStepStatus}
            onStepClick={wizard.goToStep}
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
              onBack={handlePrevStep}
              onNext={handleNextStep}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              errors={wizard.getCurrentStepErrors()}
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
              onBack={handlePrevStep}
              onNext={handleNextStep}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              errors={wizard.getCurrentStepErrors()}
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
              onNext={handleNextStep}
              onPrevious={handlePrevStep}
            />
            <WizardControls
              canGoBack={wizard.canGoBackward}
              canGoForward={wizard.canGoForward}
              onBack={handlePrevStep}
              onNext={handleNextStep}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              nextButtonText="Continue to Review"
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
              canGoForward={false}
              onBack={handlePrevStep}
              onNext={handlePublish}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              isLoading={isPublishing}
              nextButtonText="Publish Event"
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
              canGoForward={false}
              onBack={handlePrevStep}
              onNext={handlePublish}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              isLoading={isPublishing}
              nextButtonText="Publish Event"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateEvent;
