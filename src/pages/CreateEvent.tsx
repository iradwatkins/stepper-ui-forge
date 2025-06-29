
import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, MapPinIcon, UsersIcon, DollarSignIcon, CheckIcon, CrownIcon, TrendingUpIcon, ShieldIcon, ImageIcon, UploadIcon, XIcon, InfoIcon, ChevronLeftIcon, ChevronRightIcon, ZoomInIcon } from "lucide-react";
import imageCompression from "browser-image-compression";

// Enhanced EventType interface
interface EventType {
  id: 'simple' | 'ticketed' | 'premium';
  title: string;
  description: string;
  icon: React.ReactNode;
  price: string;
  features: string[];
  limitations?: string[];
  nextSteps: string[];
  upgrade?: {
    to: string;
    benefits: string[];
  };
}

// Event categories - simplified for mobile
const EVENT_CATEGORIES = [
  { id: 'workshops', label: 'Workshops' },
  { id: 'sets', label: 'Sets' },
  { id: 'in-the-park', label: 'In the Park' },
  { id: 'trips', label: 'Trips' },
  { id: 'cruises', label: 'Cruises' },
  { id: 'holiday', label: 'Holiday' },
  { id: 'competitions', label: 'Competitions' }
] as const;

// Form validation schema
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

// Image optimization settings
const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.15, // 150KB max
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.85
};

interface OptimizedImage {
  original: string;
  medium: string;
  small: string;
  thumbnail: string;
  file: File;
  originalSize: number;
  optimizedSize: number;
}

const CreateEvent = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [eventType, setEventType] = useState<EventType['id'] | "">("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [bannerImage, setBannerImage] = useState<OptimizedImage | null>(null);
  const [postcardImage, setPostcardImage] = useState<OptimizedImage | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [showDisplayPrice, setShowDisplayPrice] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
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

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  // Auto-save functionality
  useEffect(() => {
    const formData = form.getValues();
    const autoSaveData = {
      ...formData,
      eventType,
      selectedCategories,
      bannerImage: bannerImage ? { ...bannerImage, file: null } : null, // Don't save file object
      postcardImage: postcardImage ? { ...postcardImage, file: null } : null
    };
    
    const autoSaveInterval = setInterval(() => {
      localStorage.setItem('eventDraft', JSON.stringify(autoSaveData));
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [form, eventType, selectedCategories, bannerImage, postcardImage]);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('eventDraft');
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        if (draftData.eventType) setEventType(draftData.eventType);
        if (draftData.selectedCategories) setSelectedCategories(draftData.selectedCategories);
        form.reset(draftData);
      } catch (error) {
        console.warn('Failed to load draft:', error);
      }
    }
  }, [form]);

  // Image optimization function
  const optimizeImage = useCallback(async (file: File, maxWidth: number): Promise<OptimizedImage> => {
    const options = {
      ...IMAGE_COMPRESSION_OPTIONS,
      maxWidthOrHeight: maxWidth
    };
    
    const compressedFile = await imageCompression(file, options);
    
    // Generate different sizes
    const sizes = [maxWidth, 800, 400, 200]; // original, medium, small, thumbnail
    const urls = await Promise.all(
      sizes.map(async (size) => {
        const resizedFile = await imageCompression(file, {
          ...options,
          maxWidthOrHeight: size
        });
        return URL.createObjectURL(resizedFile);
      })
    );
    
    return {
      original: urls[0],
      medium: urls[1],
      small: urls[2],
      thumbnail: urls[3],
      file: compressedFile,
      originalSize: file.size,
      optimizedSize: compressedFile.size
    };
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File, type: 'banner' | 'postcard') => {
    if (!file) return;
    
    setImageUploading(true);
    try {
      const maxWidth = type === 'banner' ? 1200 : 600;
      const optimizedImage = await optimizeImage(file, maxWidth);
      
      if (type === 'banner') {
        setBannerImage(optimizedImage);
      } else {
        setPostcardImage(optimizedImage);
      }
    } catch (error) {
      console.error('Image optimization failed:', error);
      alert('Failed to optimize image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  }, [optimizeImage]);

  // Handle category selection
  const handleCategoryToggle = useCallback((categoryId: string) => {
    setSelectedCategories(prev => {
      const newCategories = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      
      form.setValue('categories', newCategories);
      return newCategories;
    });
  }, [form]);

  // Show display price section for Simple Events
  useEffect(() => {
    setShowDisplayPrice(eventType === 'simple');
  }, [eventType]);

  // Get available images for modal
  const availableImages = useMemo(() => {
    const images: { src: string; alt: string; type: 'banner' | 'postcard' }[] = [];
    if (bannerImage) {
      images.push({ src: bannerImage.original, alt: 'Banner Image', type: 'banner' });
    }
    if (postcardImage) {
      images.push({ src: postcardImage.original, alt: 'Postcard Image', type: 'postcard' });
    }
    return images;
  }, [bannerImage, postcardImage]);

  // Open image modal
  const openImageModal = useCallback((imageType: 'banner' | 'postcard') => {
    const index = availableImages.findIndex(img => img.type === imageType);
    if (index !== -1) {
      setCurrentImageIndex(index);
      setImageModalOpen(true);
    }
  }, [availableImages]);

  // Navigate images in modal
  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    if (availableImages.length <= 1) return;
    
    setCurrentImageIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % availableImages.length;
      } else {
        return (prev - 1 + availableImages.length) % availableImages.length;
      }
    });
  }, [availableImages.length]);

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!imageModalOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigateImage('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateImage('next');
          break;
        case 'Escape':
          e.preventDefault();
          setImageModalOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageModalOpen, navigateImage]);

  const eventTypes: EventType[] = [
    {
      id: "simple",
      title: "Simple Events",
      description: "Perfect for community gatherings and free events",
      icon: <UsersIcon className="w-8 h-8 text-blue-600" />,
      price: "Free",
      features: [
        "Basic event information",
        "Free to attend",
        "RSVP tracking",
        "Email notifications",
        "Basic event page"
      ],
      limitations: [
        "No paid ticketing",
        "No seating charts",
        "Basic features only"
      ],
      nextSteps: [
        "Event details",
        "Review & publish"
      ],
      upgrade: {
        to: "Ticketed",
        benefits: ["Add paid tickets", "Multiple pricing tiers", "Payment processing"]
      }
    },
    {
      id: "ticketed",
      title: "Ticketed Events",
      description: "Ideal for paid events with multiple ticket options",
      icon: <TrendingUpIcon className="w-8 h-8 text-green-600" />,
      price: "Platform Fee",
      features: [
        "All Simple Event features",
        "Paid ticketing system",
        "Multiple ticket types",
        "Payment processing (PayPal, Square, Stripe)",
        "Ticket validation",
        "Sales analytics",
        "Discount codes"
      ],
      limitations: [
        "No custom seating",
        "No team management",
        "No QR check-in"
      ],
      nextSteps: [
        "Event details",
        "Ticket configuration",
        "Review & publish"
      ],
      upgrade: {
        to: "Premium",
        benefits: ["Custom seating charts", "Team management", "QR check-in system"]
      }
    },
    {
      id: "premium",
      title: "Premium Events",
      description: "Full-featured platform for professional events",
      icon: <CrownIcon className="w-8 h-8 text-purple-600" />,
      price: "Full Features",
      features: [
        "All Ticketed Event features",
        "Interactive seating charts",
        "Team management & roles",
        "QR code check-in system",
        "Advanced analytics",
        "Premium support",
        "Custom branding",
        "Bulk operations"
      ],
      nextSteps: [
        "Event details",
        "Ticket configuration",
        "Seating setup",
        "Team management",
        "Review & publish"
      ]
    }
  ];

  const nextStep = () => {
    if (currentStep === 2) {
      // Update legacy eventData for compatibility with other steps
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Create Your Event</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Follow the steps below to create your event
        </p>
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Step 1: Event Type Selection */}
      {currentStep === 1 && (
        <div className="space-y-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Select Event Type</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the type of event you want to create. You can always upgrade to unlock more features later.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
            {eventTypes.map((type) => {
              const isSelected = eventType === type.id;
              return (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 relative ${
                    isSelected 
                      ? 'ring-2 ring-primary shadow-lg scale-105 bg-primary/5' 
                      : 'hover:shadow-lg border-border'
                  }`}
                  onClick={() => setEventType(type.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${type.title} event type`}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEventType(type.id);
                    }
                  }}
                >
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center z-10">
                      <CheckIcon className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors ${
                      isSelected ? 'bg-primary/20' : 'bg-muted/50'
                    }`}>
                      {type.icon}
                    </div>
                    <CardTitle className="text-xl mb-2">{type.title}</CardTitle>
                    <Badge variant={isSelected ? "default" : "secondary"} className="mb-2">
                      {type.price}
                    </Badge>
                    <CardDescription className="text-sm leading-relaxed">
                      {type.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Features */}
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-foreground">Included Features:</h4>
                        <ul className="space-y-1.5">
                          {type.features.slice(0, 4).map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckIcon className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-muted-foreground leading-tight">{feature}</span>
                            </li>
                          ))}
                          {type.features.length > 4 && (
                            <li className="text-xs text-muted-foreground ml-5">
                              +{type.features.length - 4} more features
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Upgrade suggestion */}
                      {type.upgrade && !isSelected && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">
                            Upgrade to {type.upgrade.to} for:
                          </p>
                          <ul className="space-y-1">
                            {type.upgrade.benefits.slice(0, 2).map((benefit, index) => (
                              <li key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <TrendingUpIcon className="w-3 h-3" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Next steps preview */}
                      {isSelected && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs font-medium text-foreground mb-1">Next steps:</p>
                          <div className="flex flex-wrap gap-1">
                            {type.nextSteps.map((step, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {step}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Validation message */}
          {!eventType && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Please select an event type to continue
              </p>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Need help choosing? All plans can be upgraded later.
            </p>
            <Button 
              onClick={nextStep} 
              disabled={!eventType}
              size="lg"
              className="px-8"
            >
{eventType 
                ? `Continue with ${eventTypes.find(t => t.id === eventType)?.title}` 
                : 'Select an event type to continue'
              }
              {eventType && <CheckIcon className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Basic Information */}
      {currentStep === 2 && (
        <form onSubmit={form.handleSubmit(() => nextStep())} className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2">Event Information</h2>
            <p className="text-sm text-muted-foreground">Tell us about your {eventTypes.find(t => t.id === eventType)?.title?.toLowerCase() || 'event'}</p>
            <p className="text-xs text-muted-foreground mt-2 bg-blue-50 dark:bg-blue-950 p-2 rounded">
              📋 Account required to post events
            </p>
          </div>

          <div className="space-y-4">
            {/* Basic Details Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Basic Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Event Title */}
                <div>
                  <Label htmlFor="title" className="text-sm font-medium">Event Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter event title"
                    {...form.register('title')}
                    className={`mt-1 ${form.formState.errors.title ? 'border-red-500' : ''}`}
                  />
                  <div className="flex justify-between mt-1">
                    {form.formState.errors.title && (
                      <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground ml-auto">
                      {form.watch('title')?.length || 0}/100
                    </p>
                  </div>
                </div>

                {/* Organization/Promoter Name */}
                <div>
                  <Label htmlFor="organizationName" className="text-sm font-medium">Organization/Promoter Name *</Label>
                  <Input
                    id="organizationName"
                    placeholder="Organization or promoter name"
                    {...form.register('organizationName')}
                    className={`mt-1 ${form.formState.errors.organizationName ? 'border-red-500' : ''}`}
                  />
                  {form.formState.errors.organizationName && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.organizationName.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-sm font-medium">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your event - what makes it special?"
                    {...form.register('description')}
                    rows={3}
                    className={`mt-1 ${form.formState.errors.description ? 'border-red-500' : ''}`}
                  />
                  <div className="flex justify-between mt-1">
                    {form.formState.errors.description && (
                      <p className="text-xs text-red-500">{form.formState.errors.description.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground ml-auto">
                      {form.watch('description')?.length || 0}/2000
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Label htmlFor="address" className="text-sm font-medium">Event Address *</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St, City, State, ZIP Code"
                    {...form.register('address')}
                    className={`mt-1 ${form.formState.errors.address ? 'border-red-500' : ''}`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter complete address to help people find events by location
                  </p>
                  {form.formState.errors.address && (
                    <p className="text-xs text-red-500">{form.formState.errors.address.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Date & Time Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Start Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="date" className="text-sm font-medium">Start Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      {...form.register('date')}
                      className={`mt-1 ${form.formState.errors.date ? 'border-red-500' : ''}`}
                    />
                    {form.formState.errors.date && (
                      <p className="text-xs text-red-500 mt-1">{form.formState.errors.date.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="time" className="text-sm font-medium">Start Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      {...form.register('time')}
                      className={`mt-1 ${form.formState.errors.time ? 'border-red-500' : ''}`}
                    />
                    {form.formState.errors.time && (
                      <p className="text-xs text-red-500 mt-1">{form.formState.errors.time.message}</p>
                    )}
                  </div>
                </div>

                {/* End Date & Time (Optional) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...form.register('endDate')}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime" className="text-sm font-medium">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      {...form.register('endTime')}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Capacity */}
                <div>
                  <Label htmlFor="capacity" className="text-sm font-medium">Event Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    placeholder="Max attendees (optional)"
                    {...form.register('capacity', { valueAsNumber: true })}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

          {/* Categories Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Event Categories *</CardTitle>
              <CardDescription className="text-sm">
                Select one or more categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EVENT_CATEGORIES.map((category) => (
                  <div
                    key={category.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-all text-center ${
                      selectedCategories.includes(category.id)
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleCategoryToggle(category.id)}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Checkbox
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="scale-90"
                      />
                      <p className="text-sm font-medium">{category.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              {form.formState.errors.categories && (
                <p className="text-xs text-red-500 mt-2">{form.formState.errors.categories.message}</p>
              )}
              {selectedCategories.length > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-1">
                    {selectedCategories.map(categoryId => {
                      const category = EVENT_CATEGORIES.find(c => c.id === categoryId);
                      return category ? (
                        <Badge key={categoryId} variant="default" className="text-xs">
                          {category.label}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Display Price Card - Only for Simple Events */}
          {showDisplayPrice && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSignIcon className="w-4 h-4" />
                  Display Price
                </CardTitle>
                <CardDescription className="text-sm">
                  Show pricing info to attendees (display only for Simple Events)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                  <InfoIcon className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    Display only - no payment processing for Simple Events
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="priceAmount" className="text-sm font-medium">Amount (USD)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        id="priceAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8"
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          form.setValue('displayPrice.amount', amount);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="priceLabel" className="text-sm font-medium">Label</Label>
                    <Input
                      id="priceLabel"
                      placeholder="Entry fee, Donation, etc."
                      className="mt-1"
                      onChange={(e) => form.setValue('displayPrice.label', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Image Upload Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Event Images
              </CardTitle>
              <CardDescription className="text-sm">
                Upload 1-2 images (auto-optimized)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Banner Image */}
              <div>
                <Label className="text-sm font-medium">Banner Image (Recommended)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Main event image
                </p>
                
                {!bannerImage ? (
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.getElementById('banner-upload')?.click()}
                  >
                    <UploadIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Upload banner image</p>
                    <p className="text-xs text-muted-foreground">JPEG, PNG, WebP up to 10MB</p>
                    <input
                      id="banner-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'banner');
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative border rounded-lg overflow-hidden group">
                    <img
                      src={bannerImage.medium}
                      alt="Banner preview"
                      className="w-full h-48 object-cover cursor-pointer transition-transform hover:scale-105"
                      onClick={() => openImageModal('banner')}
                    />
                    {/* Zoom overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors cursor-pointer flex items-center justify-center"
                         onClick={() => openImageModal('banner')}>
                      <ZoomInIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setBannerImage(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                    <div className="p-3 bg-muted/50">
                      <p className="text-xs text-muted-foreground">
                        Original: {(bannerImage.originalSize / 1024).toFixed(1)}KB → 
                        Optimized: {(bannerImage.optimizedSize / 1024).toFixed(1)}KB 
                        ({Math.round((1 - bannerImage.optimizedSize / bannerImage.originalSize) * 100)}% smaller)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Postcard Image */}
              <div>
                <Label className="text-sm font-medium">Postcard Image (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Secondary image
                </p>
                
                {!postcardImage ? (
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.getElementById('postcard-upload')?.click()}
                  >
                    <UploadIcon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-medium">Upload postcard image</p>
                    <p className="text-xs text-muted-foreground">Up to 10MB</p>
                    <input
                      id="postcard-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'postcard');
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative border rounded-lg overflow-hidden group">
                    <img
                      src={postcardImage.medium}
                      alt="Postcard preview"
                      className="w-full h-32 object-cover cursor-pointer transition-transform hover:scale-105"
                      onClick={() => openImageModal('postcard')}
                    />
                    {/* Zoom overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors cursor-pointer flex items-center justify-center"
                         onClick={() => openImageModal('postcard')}>
                      <ZoomInIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPostcardImage(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                    <div className="p-3 bg-muted/50">
                      <p className="text-xs text-muted-foreground">
                        Original: {(postcardImage.originalSize / 1024).toFixed(1)}KB → 
                        Optimized: {(postcardImage.optimizedSize / 1024).toFixed(1)}KB 
                        ({Math.round((1 - postcardImage.optimizedSize / postcardImage.originalSize) * 100)}% smaller)
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {imageUploading && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    Optimizing image...
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col gap-3 pt-4">
            <p className="text-xs text-center text-muted-foreground">
              Auto-saved every 30 seconds
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={!form.formState.isValid || selectedCategories.length === 0}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Image Modal */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>
                {availableImages[currentImageIndex]?.alt || 'Event Image'}
                {availableImages.length > 1 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({currentImageIndex + 1} of {availableImages.length})
                  </span>
                )}
              </span>
              {availableImages.length > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateImage('prev')}
                    disabled={availableImages.length <= 1}
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateImage('next')}
                    disabled={availableImages.length <= 1}
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative flex-1 p-6 pt-2">
            {availableImages.length > 0 && (
              <div className="relative h-full">
                <img
                  src={availableImages[currentImageIndex]?.src}
                  alt={availableImages[currentImageIndex]?.alt}
                  className="w-full h-full object-contain rounded-lg"
                />
                
                {/* Navigation arrows - only show if multiple images */}
                {availableImages.length > 1 && (
                  <>
                    <button
                      onClick={() => navigateImage('prev')}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => navigateImage('next')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRightIcon className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Image dots indicator for multiple images */}
          {availableImages.length > 1 && (
            <div className="flex justify-center gap-2 p-4 pt-0">
              {availableImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentImageIndex
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Step 3: Ticketing */}
      {currentStep === 3 && eventType !== "simple" && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Ticket Configuration</h2>
            <p className="text-muted-foreground">Set up your ticket tiers and pricing</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ticket Tiers</CardTitle>
              <CardDescription>Configure different ticket types for your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {eventData.tickets.map((ticket, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`ticket-name-${index}`}>Ticket Name</Label>
                      <Input
                        id={`ticket-name-${index}`}
                        placeholder="General Admission"
                        value={ticket.name}
                        onChange={(e) => updateTicketTier(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`ticket-price-${index}`}>Price ($)</Label>
                      <Input
                        id={`ticket-price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={ticket.price}
                        onChange={(e) => updateTicketTier(index, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`ticket-quantity-${index}`}>Quantity</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`ticket-quantity-${index}`}
                          type="number"
                          min="1"
                          value={ticket.quantity}
                          onChange={(e) => updateTicketTier(index, 'quantity', parseInt(e.target.value) || 0)}
                        />
                        {eventData.tickets.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTicketTier(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addTicketTier} className="w-full">
                Add Ticket Tier
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 for Simple Events (Skip Ticketing) */}
      {currentStep === 3 && eventType === "simple" && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Almost Done!</h2>
            <p className="text-muted-foreground">Review your event details</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Event Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">{eventData.title}</h3>
                <p className="text-muted-foreground">{eventData.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span>{eventData.date} at {eventData.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4" />
                <span>{eventData.location}</span>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Free Event
              </Badge>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Publish */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Review & Publish</h2>
            <p className="text-muted-foreground">Review your event and publish it</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Event Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-xl font-medium mb-2">{eventData.title}</h3>
                <p className="text-muted-foreground">{eventData.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{eventData.date} at {eventData.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4" />
                  <span>{eventData.location}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Event Type</h4>
                <Badge className={
                  eventType === "simple" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                  eventType === "ticketed" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                  "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                }>
                  {eventTypes.find(t => t.id === eventType)?.title}
                </Badge>
              </div>

              {eventType !== "simple" && (
                <div>
                  <h4 className="font-medium mb-2">Tickets</h4>
                  <div className="space-y-2">
                    {eventData.tickets.map((ticket, index) => (
                      <div key={index} className="flex justify-between items-center p-2 border rounded">
                        <span>{ticket.name}</span>
                        <span>${ticket.price} ({ticket.quantity} available)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              Back
            </Button>
            <Button className="px-8">
              Publish Event
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateEvent;
