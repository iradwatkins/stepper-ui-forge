
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Progress } from "@/components/ui/progress";
import { EventTypeSelection } from "@/components/create-event/EventTypeSelection";
import { BasicInformation } from "@/components/create-event/BasicInformation";
import { TicketConfiguration } from "@/components/create-event/TicketConfiguration";
import { ReviewStep } from "@/components/create-event/ReviewStep";

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
  isPublic: z.boolean(),
  tags: z.array(z.string()).optional(),
  timezone: z.string().optional()
});

type EventFormData = z.infer<typeof eventFormSchema>;

const CreateEvent = () => {
  console.log("CreateEvent component rendering...");

  const [currentStep, setCurrentStep] = useState(1);
  const [eventType, setEventType] = useState<EventType['id'] | "">("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
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
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  });

  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    category: "",
    tickets: [{ name: "General Admission", price: 0, quantity: 100 }]
  });

  const eventTypes: EventType[] = [
    { id: "simple", title: "Simple Events" },
    { id: "ticketed", title: "Ticketed Events" },
    { id: "premium", title: "Premium Events" }
  ];

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleCategoryToggle = useCallback((categoryId: string) => {
    console.log("Category toggled:", categoryId);
    setSelectedCategories(prev => {
      const newCategories = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      
      form.setValue('categories', newCategories);
      return newCategories;
    });
  }, [form]);

  const nextStep = () => {
    console.log("Moving to next step from:", currentStep);
    if (currentStep === 2) {
      const formData = form.getValues();
      setEventData(prev => ({
        ...prev,
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        location: formData.address,
        category: selectedCategories.join(', ')
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

  const handlePublish = () => {
    console.log("Publishing event with data:", eventData);
  };

  console.log("Current step:", currentStep, "Event type:", eventType);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Create Your Event</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Follow the steps below to create your event
        </p>
        
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
          onNext={nextStep}
          onPrevious={prevStep}
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
        />
      )}

      {currentStep === 4 && (
        <ReviewStep
          eventData={eventData}
          eventType={eventType}
          eventTypes={eventTypes}
          onPrevious={prevStep}
          onPublish={handlePublish}
        />
      )}
    </div>
  );
};

export default CreateEvent;
