import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Progress } from "@/components/ui/progress";
import { EventTypeSelection } from "@/components/create-event/EventTypeSelection";
import { BasicInformation } from "@/components/create-event/BasicInformation";
import { TicketConfiguration } from "@/components/create-event/TicketConfiguration";
import { ReviewStep } from "@/components/create-event/ReviewStep";
import imageCompression from 'browser-image-compression';
import { eventsService, Event } from "@/lib/events";
import { useNavigate } from "react-router-dom";

console.log("CreateEvent component loading...");

interface EventType {
  id: 'simple' | 'ticketed' | 'premium';
  title: string;
}

const eventFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description too long"),
  organizationName: z.string().min(2, "Organization/Promoter name is required").max(100, "Name too long"),
  date: z.string().refine(date => new Date(date) > new Date(), "Event date must be in the future"),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  address: z.string().min(10, "Please enter a complete address").max(200, "Address too long"),
  categories: z.array(z.string()).min(1, "At least one category must be selected"),
  capacity: z.number().positive().optional(),
  displayPrice: z.object({
    amount: z.number().min(0, "Price cannot be negative"),
    label: z.string().min(1, "Price label is required")
  }).optional(),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  images: z.array(z.string()).optional()
}).refine((data) => {
  // If end date is provided, it must be after start date
  if (data.endDate && data.date) {
    return new Date(data.endDate) >= new Date(data.date);
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"]
}).refine((data) => {
  // If end time is provided, end date must also be provided
  if (data.endTime && !data.endDate) {
    return false;
  }
  return true;
}, {
  message: "End time requires an end date",
  path: ["endTime"]
});

type EventFormData = z.infer<typeof eventFormSchema>;

const CreateEvent = () => {
  console.log("CreateEvent component rendering...");

  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [eventType, setEventType] = useState<EventType['id'] | "">("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
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

  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    category: "",
    images: [] as string[],
    tickets: [{ name: "General Admission", price: 0, quantity: 100 }]
  });

  const eventTypes: EventType[] = [
    { id: "simple", title: "Simple Events" },
    { id: "ticketed", title: "Ticketed Events" },
    { id: "premium", title: "Premium Events" }
  ];

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const saveTimer = setTimeout(() => {
      const formData = form.getValues();
      if (formData.title || formData.description) {
        localStorage.setItem('draft-event', JSON.stringify({
          ...formData,
          eventType,
          selectedCategories,
          uploadedImages,
          currentStep
        }));
        setLastSaved(new Date());
        console.log("Auto-saved draft at:", new Date());
      }
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [form.watch(), eventType, selectedCategories, uploadedImages, currentStep, autoSaveEnabled]);

  // Load draft on component mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('draft-event');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        form.reset(draft);
        setEventType(draft.eventType || "");
        setSelectedCategories(draft.selectedCategories || []);
        setUploadedImages(draft.uploadedImages || []);
        setCurrentStep(draft.currentStep || 1);
        console.log("Loaded draft from localStorage");
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  }, []);

  const handleImageUpload = useCallback(async (files: FileList) => {
    if (!files.length) return;

    setIsProcessingImage(true);
    console.log("Processing image upload:", files.length, "files");

    try {
      const processedImages: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Image compression options
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/jpeg'
        };

        try {
          const compressedFile = await imageCompression(file, options);
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(compressedFile);
          });
          
          processedImages.push(base64);
          console.log(`Processed image ${i + 1}/${files.length}`);
        } catch (error) {
          console.error(`Error processing image ${i + 1}:`, error);
        }
      }

      setUploadedImages(prev => [...prev, ...processedImages]);
      form.setValue('images', [...uploadedImages, ...processedImages]);
      console.log("Successfully uploaded", processedImages.length, "images");
    } catch (error) {
      console.error("Error in image upload process:", error);
    } finally {
      setIsProcessingImage(false);
    }
  }, [uploadedImages, form]);

  const removeImage = useCallback((index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    form.setValue('images', newImages);
    console.log("Removed image at index:", index);
  }, [uploadedImages, form]);

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
        displayPrice: formData.displayPrice,
        isPublic: formData.isPublic,
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

  const addTicketTier = () => {
    setEventData(prev => ({
      ...prev,
      tickets: [...prev.tickets, { name: "", price: 0, quantity: 0 }]
    }));
  };

  const removeTicketTier = (index: number) => {
    setEventData(prev => ({
      ...prev,
      tickets: prev.tickets.filter((_, i) => i !== index)
    }));
  };

  const updateTicketTier = (index: number, field: string, value: string | number) => {
    setEventData(prev => ({
      ...prev,
      tickets: prev.tickets.map((ticket, i) => 
        i === index ? { ...ticket, [field]: value } : ticket
      )
    }));
  };

  const handlePublish = async () => {
    console.log("Publishing event with data:", eventData);
    setIsPublishing(true);
    
    try {
      // Prepare event data for storage
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

      // Save the event
      const savedEvent = eventsService.createEvent(eventToSave);
      
      // Clear draft after successful publishing
      localStorage.removeItem('draft-event');
      
      console.log("Event published successfully:", savedEvent);
      
      // Navigate to the events page
      navigate('/events');
      
    } catch (error) {
      console.error("Error publishing event:", error);
      alert("Failed to publish event. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('draft-event');
    form.reset();
    setEventType("");
    setSelectedCategories([]);
    setUploadedImages([]);
    setCurrentStep(1);
    setLastSaved(null);
    console.log("Cleared draft");
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
                onClick={clearDraft}
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
          onImageUpload={handleImageUpload}
          onRemoveImage={removeImage}
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
