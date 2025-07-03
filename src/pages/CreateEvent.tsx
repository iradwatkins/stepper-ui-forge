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
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  
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
  
  // Enhanced wizard navigation with callbacks
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

  // Load draft on component mount - only run once
  useEffect(() => {
    loadDraft(setEventType, setSelectedCategories, setUploadedImages, (step: number) => {
      wizard.goToStep(step, true); // Skip validation on draft load
    });
  }, []); // Empty dependency array - only run once

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
        images: []  // Legacy field - actual images are in uploadedImages state
      }));
    }
  }, [wizard.currentStep, form, selectedCategories, setEventData]);

  // Sync data when step changes - remove recursive dependency
  useEffect(() => {
    handleStepDataSync();
  }, [wizard.currentStep]); // Only depend on currentStep, not the sync function

  // Create eventData with actual images for ReviewStep
  const eventDataWithImages = {
    ...eventData,
    images: [
      ...(uploadedImages.banner ? [uploadedImages.banner.medium] : []),
      ...(uploadedImages.postcard ? [uploadedImages.postcard.medium] : [])
    ]
  };

  const saveEventWithStatus = async (status: 'draft' | 'published') => {
    if (!user?.id) {
      console.error("User not authenticated");
      return null;
    }

    console.log(`Saving event as ${status} with data:`, eventData);
    console.log("Uploaded images:", uploadedImages);
    
    try {
      // For drafts, only require basic info. For published, validate all required fields
      const requiredFieldsForDraft = ['title', 'date'];
      
      if (status === 'published') {
        // Full validation for published events
        if (!eventData.title || !eventData.date || !eventData.location || !eventType) {
          alert("Please fill in all required fields before publishing.");
          return null;
        }
      } else {
        // Minimal validation for drafts
        if (!eventData.title || !eventData.date) {
          alert("Please provide at least a title and date to save as draft.");
          return null;
        }
      }

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
        description: eventData.description || '',
        organization_name: eventData.organizationName || 'Unknown Organization',
        date: eventData.date,
        time: eventData.time || '12:00',
        location: eventData.location || '',
        categories: selectedCategories,
        event_type: eventType as 'simple' | 'ticketed' | 'premium' || 'simple',
        status: status,
        images: imageMetadata,
        is_public: status === 'published' ? (eventData.isPublic ?? true) : false,
        max_attendees: eventData.capacity,
        registration_deadline: null
      };

      console.log("Formatted event for database:", eventToSave);
      
      console.log("Calling EventsService.createEvent...");
      const savedEvent = await EventsService.createEvent(eventToSave);
      console.log("EventsService.createEvent returned:", savedEvent);
      
      if (savedEvent) {
        localStorage.removeItem('draft-event');
        console.log(`Event ${status === 'draft' ? 'saved as draft' : 'published'} successfully:`, savedEvent);
        navigate('/dashboard');
        return savedEvent;
      } else {
        console.error('EventsService.createEvent returned null');
        throw new Error('Failed to create event - service returned null');
      }
      
    } catch (error) {
      console.error(`Error ${status === 'draft' ? 'saving draft' : 'publishing'} event:`, error);
      alert(`Failed to ${status === 'draft' ? 'save draft' : 'publish event'}. Please try again.`);
      return null;
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await saveEventWithStatus('published');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      await saveEventWithStatus('draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleClearDraft = () => {
    clearDraft();
    form.reset();
    setEventType("");
    setSelectedCategories([]);
    setUploadedImages({});
    wizard.goToStep(1, true); // Skip validation when clearing draft
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
              lastSaved={lastSaved}
              onSaveDraft={handleSaveDraft}
              isDraftSaving={isSavingDraft}
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
              lastSaved={lastSaved}
              onSaveDraft={handleSaveDraft}
              isDraftSaving={isSavingDraft}
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
              lastSaved={lastSaved}
              onSaveDraft={handleSaveDraft}
              isDraftSaving={isSavingDraft}
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
              onNext={handlePublish}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              isLoading={isPublishing}
              isNavigating={wizard.isNavigating}
              errors={wizard.lastValidationResult?.errors || []}
              warnings={wizard.lastValidationResult?.warnings || []}
              lastSaved={lastSaved}
              onSaveDraft={handleSaveDraft}
              isDraftSaving={isSavingDraft}
              nextButtonText="Publish Event"
              helpText="Review your event details and publish when ready"
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
              onNext={handlePublish}
              isFirstStep={wizard.isFirstStep}
              isLastStep={wizard.isLastStep}
              isLoading={isPublishing}
              isNavigating={wizard.isNavigating}
              errors={wizard.lastValidationResult?.errors || []}
              warnings={wizard.lastValidationResult?.warnings || []}
              lastSaved={lastSaved}
              onSaveDraft={handleSaveDraft}
              isDraftSaving={isSavingDraft}
              nextButtonText="Publish Event"
              helpText="Review your event details and publish when ready"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateEvent;
