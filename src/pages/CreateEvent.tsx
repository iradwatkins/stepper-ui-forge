
import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Progress } from "@/components/ui/progress";
import { EventTypeSelection } from "@/components/create-event/EventTypeSelection";
import { BasicInformation } from "@/components/create-event/BasicInformation";
import { TicketConfiguration } from "@/components/create-event/TicketConfiguration";
import { ReviewStep } from "@/components/create-event/ReviewStep";
import { eventsService, Event } from "@/lib/events";
import { useNavigate } from "react-router-dom";
import { EventFormData, EventType, eventFormSchema } from "@/types/event-form";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useEventData } from "@/hooks/useEventData";

console.log("CreateEvent component loading...");

const CreateEvent = () => {
  console.log("CreateEvent component rendering...");

  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
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
      images: []
    }
  });

  const { eventData, setEventData, addTicketTier, removeTicketTier, updateTicketTier } = useEventData();
  const { uploadedImages, setUploadedImages, isProcessingImage, handleImageUpload, removeImage } = useImageUpload();
  const { lastSaved, clearDraft, loadDraft } = useAutoSave({
    form,
    eventType,
    selectedCategories,
    uploadedImages,
    currentStep,
    enabled: autoSaveEnabled
  });

  const eventTypes: EventType[] = [
    { id: "simple", title: "Simple Events" },
    { id: "ticketed", title: "Ticketed Events" },
    { id: "premium", title: "Premium Events" }
  ];

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  // Load draft on component mount
  useEffect(() => {
    loadDraft(setEventType, setSelectedCategories, setUploadedImages, setCurrentStep);
  }, []);

  const handleImageUploadWithForm = useCallback(async (files: FileList) => {
    await handleImageUpload(files);
    // Update form with new images after upload
    setTimeout(() => {
      form.setValue('images', [...uploadedImages, ...Array.from(files).map(() => '')]);
    }, 100);
  }, [handleImageUpload, uploadedImages, form]);

  const removeImageWithForm = useCallback((index: number) => {
    removeImage(index);
    const newImages = uploadedImages.filter((_, i) => i !== index);
    form.setValue('images', newImages);
  }, [removeImage, uploadedImages, form]);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    console.log("Category toggled:", categoryId);
    setSelectedCategories(prev => {
      const newCategories = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      
      return newCategories;
    });
  }, []);

  const nextStep = () => {
    console.log("Moving to next step from:", currentStep);
    if (currentStep === 2) {
      const formData = form.getValues();
      setEventData(prev => ({
        ...prev,
        title: formData.title,
        description: formData.description,
        organizationName: formData.organizationName,
        date: formData.date,
        time: formData.time,
        endDate: formData.endDate,
        endTime: formData.endTime,
        location: formData.address,
        category: selectedCategories.join(', '),
        capacity: formData.capacity,
        displayPrice: formData.displayPrice ? {
          amount: formData.displayPrice.amount,
          label: formData.displayPrice.label
        } : undefined,
        isPublic: formData.isPublic ?? true,
        images: uploadedImages
      }));
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    console.log("Moving to previous step from:", currentStep);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePublish = async () => {
    console.log("Publishing event with data:", eventData);
    setIsPublishing(true);
    
    try {
      const eventToSave: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
        title: eventData.title,
        description: eventData.description,
        organizationName: eventData.organizationName || 'Unknown Organization',
        date: eventData.date,
        time: eventData.time,
        endDate: eventData.endDate,
        endTime: eventData.endTime,
        location: eventData.location,
        category: eventData.category,
        categories: selectedCategories,
        capacity: eventData.capacity,
        displayPrice: eventData.displayPrice,
        isPublic: eventData.isPublic ?? true,
        images: eventData.images || [],
        tickets: eventData.tickets || [],
        eventType: eventType as 'simple' | 'ticketed' | 'premium'
      };

      const savedEvent = eventsService.createEvent(eventToSave);
      localStorage.removeItem('draft-event');
      console.log("Event published successfully:", savedEvent);
      navigate('/events');
      
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
    setUploadedImages([]);
    setCurrentStep(1);
  };

  console.log("Current step:", currentStep, "Event type:", eventType);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-4">Create Your Event</h1>
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
                className="text-xs text-red-500 hover:text-red-700"
              >
                Clear draft
              </button>
            </div>
          )}
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {currentStep === 1 && (
        <EventTypeSelection 
          eventType={eventType} 
          setEventType={setEventType} 
          onNext={nextStep} 
        />
      )}

      {currentStep === 2 && (
        <BasicInformation 
          form={form}
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
          uploadedImages={uploadedImages}
          onImageUpload={handleImageUploadWithForm}
          onRemoveImage={removeImageWithForm}
          isProcessingImage={isProcessingImage}
          onNext={nextStep}
          onPrevious={prevStep}
          eventType={eventType}
        />
      )}

      {currentStep === 3 && eventType !== "simple" && (
        <TicketConfiguration
          tickets={eventData.tickets}
          onAddTicketTier={addTicketTier}
          onRemoveTicketTier={removeTicketTier}
          onUpdateTicketTier={updateTicketTier}
          onNext={nextStep}
          onPrevious={prevStep}
        />
      )}

      {currentStep === 3 && eventType === "simple" && (
        <ReviewStep
          eventData={eventData}
          eventType={eventType}
          eventTypes={eventTypes}
          onPrevious={prevStep}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      )}

      {currentStep === 4 && (
        <ReviewStep
          eventData={eventData}
          eventType={eventType}
          eventTypes={eventTypes}
          onPrevious={prevStep}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      )}
    </div>
  );
};

export default CreateEvent;
