import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, ClockIcon, MapPinIcon, SaveIcon, EyeIcon, ArrowLeft, LoaderIcon, AlertCircle, ImageIcon, Upload as UploadIcon, X as XIcon, TagIcon, GlobeIcon, TicketIcon } from "lucide-react";
import { useImageUpload } from "@/hooks/useImageUpload";
import { toast } from "sonner";
import { EVENT_CATEGORIES } from "@/lib/constants/event-categories";
import { Badge } from "@/components/ui/badge";
import { DateInputField } from "@/components/ui/date-input-field";
import { TimeInputField } from "@/components/ui/time-input-field";
import { GooglePlacesInput } from "@/components/ui/GooglePlacesInput";
import { loadGoogleMapsAPI } from "@/lib/config/google-maps";
import { TicketConfigurationWizard, TicketType } from "@/components/create-event/TicketConfigurationWizard";

const eventSchema = z.object({
  title: z.string().min(1, "Event title is required").max(100, "Title must be under 100 characters"),
  description: z.string().optional(),
  organizationName: z.string().optional(),
  venueName: z.string().optional(),
  date: z.string().min(1, "Event date is required"),
  time: z.string().min(1, "Event time is required"),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().min(1, "Event location is required"),
  maxAttendees: z.number().min(1).optional(),
  isPublic: z.boolean().default(true),
  status: z.enum(["draft", "published", "cancelled", "completed"]),
  categories: z.array(z.string()).min(1, "Please select at least one category"),
  tags: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  // Price fields for simple events (informational only)
  displayPriceAmount: z.number().min(0, "Amount must be 0 or greater").optional(),
  displayPriceLabel: z.string().optional()
}).refine((data) => {
  // Validate end date/time if provided
  if (data.endDate && data.endTime) {
    const startDateTime = new Date(`${data.date}T${data.time}`);
    const endDateTime = new Date(`${data.endDate}T${data.endTime}`);
    return endDateTime > startDateTime;
  }
  return true;
}, {
  message: "End date/time must be after start date/time",
  path: ["endTime"]
});

type EventFormData = z.infer<typeof eventSchema>;

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState<"simple" | "ticketed" | "premium">("ticketed");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  
  // Use the original image upload system
  const {
    uploadedImages,
    setUploadedImages,
    isProcessingImage,
    processingProgress,
    handleImageUpload,
    removeImage
  } = useImageUpload();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      organizationName: "",
      venueName: "",
      date: "",
      time: "",
      endDate: "",
      endTime: "",
      location: "",
      isPublic: true,
      status: "draft",
      categories: [],
      tags: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      displayPriceAmount: 0,
      displayPriceLabel: ""
    }
  });

  // Load Google Maps API
  useEffect(() => {
    const initGoogleMaps = async () => {
      try {
        await loadGoogleMapsAPI();
        setIsGoogleMapsLoaded(true);
      } catch (error) {
        console.warn('Google Maps API failed to load:', error);
      }
    };
    initGoogleMaps();
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!id) {
      setError("No event ID provided");
      setIsLoading(false);
      return;
    }

    loadEvent();
  }, [user, id, navigate]);

  const loadEvent = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: event, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .eq("owner_id", user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError("Event not found or you don't have permission to edit it");
        } else {
          setError("Failed to load event: " + error.message);
        }
        return;
      }

      if (!event) {
        setError("Event not found");
        return;
      }

      // Check if location is "To Be Announced"
      const isTBA = event.location.includes("To Be Announced");
      
      // Set event type in state (not editable)
      setEventType(event.event_type);
      
      // Set categories and tags
      if (event.categories && Array.isArray(event.categories)) {
        setSelectedCategories(event.categories);
      }
      if (event.tags && Array.isArray(event.tags)) {
        setTags(event.tags);
      }
      
      // Populate form with event data
      form.reset({
        title: event.title,
        description: event.description || "",
        organizationName: event.organization_name || "",
        venueName: event.venue_name || "",
        date: event.date,
        time: event.time,
        endDate: event.end_date || "",
        endTime: event.end_time || "",
        location: event.location,
        maxAttendees: event.max_attendees || undefined,
        isPublic: event.is_public,
        status: event.status,
        categories: event.categories || [],
        tags: event.tags || [],
        timezone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        displayPriceAmount: event.display_price?.amount || 0,
        displayPriceLabel: event.display_price?.label || ""
      });

      // Set existing images if they exist
      if (event.images) {
        setUploadedImages(event.images);
      }

      // Load ticket types for ticketed events
      if (event.event_type === 'ticketed' || event.event_type === 'premium') {
        const { data: tickets, error: ticketError } = await supabase
          .from('ticket_types')
          .select('*')
          .eq('event_id', event.id)
          .order('price', { ascending: true });

        if (!ticketError && tickets) {
          const formattedTickets: TicketType[] = tickets.map(ticket => ({
            id: ticket.id,
            name: ticket.name,
            description: ticket.description || '',
            price: ticket.price,
            earlyBirdPrice: ticket.early_bird_price || undefined,
            earlyBirdUntil: ticket.early_bird_until || undefined,
            quantity: ticket.quantity,
            hasEarlyBird: !!ticket.early_bird_price
          }));
          setTicketTypes(formattedTickets);
        }
      }
    } catch (error) {
      console.error("Error loading event:", error);
      setError("Failed to load event");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setSelectedCategories(newCategories);
    form.setValue('categories', newCategories);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        const newTags = [...tags, newTag];
        setTags(newTags);
        form.setValue('tags', newTags);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    form.setValue('tags', newTags);
  };

  const validateDates = (data: EventFormData): boolean => {
    if (data.endDate && data.endTime) {
      const startDateTime = new Date(`${data.date}T${data.time}`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime}`);
      
      if (endDateTime <= startDateTime) {
        toast.error("End date/time must be after start date/time");
        return false;
      }
    }
    return true;
  };

  const saveEvent = async (data: EventFormData) => {
    if (!user || !id) {
      toast.error("Cannot save event: missing user or event ID");
      return;
    }

    // Validate dates if end date/time is provided
    if (!validateDates(data)) {
      return;
    }

    setIsSaving(true);
    try {
      // Prepare display price data for simple events
      let displayPrice = null;
      if (eventType === "simple" && (data.displayPriceAmount || data.displayPriceLabel)) {
        displayPrice = {
          amount: data.displayPriceAmount || 0,
          label: data.displayPriceLabel?.trim() || ""
        };
      }

      const eventData = {
        title: data.title,
        description: data.description || null,
        organization_name: data.organizationName || null,
        venue_name: data.venueName || null,
        date: data.date,
        time: data.time,
        end_date: data.endDate || null,
        end_time: data.endTime || null,
        location: data.location,
        event_type: eventType,
        max_attendees: data.maxAttendees || null,
        is_public: data.isPublic,
        status: data.status,
        categories: selectedCategories,
        tags: tags.length > 0 ? tags : null,
        timezone: data.timezone || null,
        images: uploadedImages,
        display_price: displayPrice,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", id)
        .eq("owner_id", user.id);

      if (error) {
        console.error("Error updating event:", error);
        toast.error("Failed to update event: " + error.message);
        return;
      }

      // Save ticket types for ticketed events
      if ((eventType === 'ticketed' || eventType === 'premium') && ticketTypes.length > 0) {
        // First, delete existing ticket types
        const { error: deleteError } = await supabase
          .from('ticket_types')
          .delete()
          .eq('event_id', id);

        if (deleteError) {
          console.error("Error deleting existing tickets:", deleteError);
          toast.error("Failed to update tickets");
          return;
        }

        // Then insert new ticket types
        const ticketPromises = ticketTypes.map(async (ticket) => {
          const ticketData = {
            event_id: id,
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

          if (ticketError) {
            console.error("Error creating ticket type:", ticketError);
            throw new Error(`Failed to create ticket type "${ticket.name}": ${ticketError.message}`);
          }
        });

        try {
          await Promise.all(ticketPromises);
        } catch (ticketError) {
          console.error('Error saving ticket types:', ticketError);
          toast.error(`Failed to save ticket types: ${ticketError instanceof Error ? ticketError.message : 'Unknown error'}`);
          return;
        }
      }

      toast.success("Event updated successfully!");
      navigate("/dashboard/events");
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    } finally {
      setIsSaving(false);
    }
  };

  const publishEvent = async () => {
    const currentData = form.getValues();
    await saveEvent({ ...currentData, status: "published" });
  };

  const unpublishEvent = async () => {
    const currentData = form.getValues();
    await saveEvent({ ...currentData, status: "draft" });
  };

  const handleTicketsChange = (tickets: TicketType[]) => {
    setTicketTypes(tickets);
  };

  const handleAddressChange = (value: string) => {
    form.setValue('location', value);
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <LoaderIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading event...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate("/dashboard/events")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Events
          </Button>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard/events")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Events
          </Button>
          <h1 className="text-4xl font-bold mb-4 text-foreground">Edit Event</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Update your event details
          </p>
        </div>

        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter your event title"
                  {...form.register("title")}
                  className={form.formState.errors.title ? "border-destructive" : ""}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your event..."
                  rows={4}
                  {...form.register("description")}
                />
              </div>

              <div>
                <Label htmlFor="organizationName">Organization/Promoter Name</Label>
                <Input
                  id="organizationName"
                  placeholder="Your organization or name"
                  {...form.register("organizationName")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Event Images
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Banner Image */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Banner Image</Label>
                  <span className="text-xs text-muted-foreground">Recommended: 1200x600px</span>
                </div>
                
                {!uploadedImages.banner ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="banner-upload"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleImageUpload(e.target.files, 'banner');
                        }
                      }}
                      className="hidden"
                      disabled={isProcessingImage}
                    />
                    <label
                      htmlFor="banner-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <UploadIcon className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {isProcessingImage ? "Processing banner..." : "Upload banner image"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WebP up to 10MB - Auto-optimized to WebP
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={uploadedImages.banner.medium || uploadedImages.banner.thumbnail}
                        alt="Event banner"
                        className="w-full max-w-md mx-auto h-auto object-contain"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <div className="text-white text-center text-xs space-y-1">
                        <p>Compression: {uploadedImages.banner.metadata.compressionRatio}%</p>
                        <p>Size: {(uploadedImages.banner.metadata.compressedSize / 1024 / 1024).toFixed(2)}MB</p>
                        <p>{uploadedImages.banner.metadata.dimensions.width}x{uploadedImages.banner.metadata.dimensions.height}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage('banner')}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Postcard Image */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Postcard Image</Label>
                  <span className="text-xs text-muted-foreground">Recommended: 600x400px</span>
                </div>
                
                {!uploadedImages.postcard ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <input
                      type="file"
                      id="postcard-upload"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleImageUpload(e.target.files, 'postcard');
                        }
                      }}
                      className="hidden"
                      disabled={isProcessingImage}
                    />
                    <label
                      htmlFor="postcard-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <UploadIcon className="w-6 h-6 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {isProcessingImage ? "Processing postcard..." : "Upload postcard image"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Optional - For social sharing and listings
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={uploadedImages.postcard.medium || uploadedImages.postcard.thumbnail}
                        alt="Event postcard"
                        className="w-full max-w-sm mx-auto h-auto object-contain"
                        style={{ maxHeight: '250px' }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <div className="text-white text-center text-xs space-y-1">
                        <p>Compression: {uploadedImages.postcard.metadata.compressionRatio}%</p>
                        <p>Size: {(uploadedImages.postcard.metadata.compressedSize / 1024 / 1024).toFixed(2)}MB</p>
                        <p>{uploadedImages.postcard.metadata.dimensions.width}x{uploadedImages.postcard.metadata.dimensions.height}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage('postcard')}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Processing Progress */}
              {isProcessingImage && (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Processing image optimization...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Converting to WebP format and generating multiple sizes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Start Date *</Label>
                  <DateInputField
                    value={form.watch("date")}
                    onChange={(value) => form.setValue("date", value)}
                    className={form.formState.errors.date ? "border-destructive" : ""}
                    defaultToToday={false}
                  />
                  {form.formState.errors.date && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.date.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="time">Start Time *</Label>
                  <TimeInputField
                    value={form.watch("time")}
                    onChange={(value) => form.setValue("time", value)}
                    className={form.formState.errors.time ? "border-destructive" : ""}
                  />
                  {form.formState.errors.time && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.time.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <DateInputField
                    value={form.watch("endDate")}
                    onChange={(value) => form.setValue("endDate", value)}
                    minDate={form.watch("date")}
                    className={form.formState.errors.endDate ? "border-destructive" : ""}
                    defaultToToday={false}
                  />
                  {form.formState.errors.endDate && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.endDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <TimeInputField
                    value={form.watch("endTime")}
                    onChange={(value) => form.setValue("endTime", value)}
                    className={form.formState.errors.endTime ? "border-destructive" : ""}
                  />
                  {form.formState.errors.endTime && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.endTime.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={form.watch("timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone}
                  onValueChange={(value) => form.setValue("timezone", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="America/Phoenix">Arizona Time</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii Time</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska Time</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Event times will be displayed in this timezone
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                Location & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="venueName">Venue Name</Label>
                <Input
                  id="venueName"
                  placeholder="Enter venue or location name"
                  {...form.register("venueName")}
                />
              </div>

              <div>
                <Label htmlFor="location">Event Address *</Label>
                <GooglePlacesInput
                  value={form.watch('location') || ''}
                  onChange={handleAddressChange}
                  placeholder="Search for venue, address, or landmark..."
                  error={!!form.formState.errors.location}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isGoogleMapsLoaded ? (
                    <>🌍 Enhanced search enabled! Search for venues, addresses, or use current location.</>
                  ) : (
                    <>Include city and state/region for better search results.</>
                  )}
                </p>
                {form.formState.errors.location && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.location.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Event Type</Label>
                  <div className="px-3 py-2 border rounded-md bg-gray-50">
                    {eventType === 'simple' ? 'Simple Event' : 
                     eventType === 'ticketed' ? 'Ticketed Event' : 
                     'Premium Event'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Event type cannot be changed after creation
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxAttendees">Max Attendees</Label>
                  <Input
                    id="maxAttendees"
                    type="number"
                    placeholder="Enter max capacity"
                    {...form.register("maxAttendees", { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value: "draft" | "published" | "cancelled" | "completed") =>
                      form.setValue("status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price Information for Simple Events */}
              {eventType === "simple" && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Price (Informational Only)
                    </h3>
                    <span className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                      No payment processing
                    </span>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    For Simple Events, you can display a suggested price or cost information (no actual payment processing)
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="displayPriceAmount">Amount</Label>
                      <Input
                        id="displayPriceAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        {...form.register("displayPriceAmount", { valueAsNumber: true })}
                        className={form.formState.errors.displayPriceAmount ? "border-destructive" : ""}
                      />
                      {form.formState.errors.displayPriceAmount && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.displayPriceAmount.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="displayPriceLabel">Label</Label>
                      <Input
                        id="displayPriceLabel"
                        placeholder="e.g., Suggested donation, Entry fee"
                        {...form.register("displayPriceLabel")}
                        className={form.formState.errors.displayPriceLabel ? "border-destructive" : ""}
                      />
                      {form.formState.errors.displayPriceLabel && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.displayPriceLabel.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <p><strong>Examples:</strong></p>
                    <p>• "Suggested donation: $10"</p>
                    <p>• "Entry fee: $5"</p>
                    <p>• "Free (donations welcome)"</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ticket Configuration for Ticketed Events */}
          {eventType === "ticketed" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TicketIcon className="h-5 w-5" />
                  Ticket Types & Pricing
                </CardTitle>
                <CardDescription>
                  Configure your ticket tiers, pricing, and availability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TicketConfigurationWizard
                  form={form}
                  eventType={eventType}
                  onTicketsChange={handleTicketsChange}
                  initialTickets={ticketTypes}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TagIcon className="h-5 w-5" />
                Event Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EVENT_CATEGORIES.map((category) => {
                  const isSelected = selectedCategories.includes(category.id);
                  return (
                    <div
                      key={category.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-all text-center ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleCategoryToggle(category.id)}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'bg-primary border-primary' 
                            : 'border-muted-foreground'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                          {category.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {form.formState.errors.categories && (
                <p className="text-sm text-destructive mt-2">
                  {form.formState.errors.categories.message}
                </p>
              )}
              {selectedCategories.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">Please select at least one category</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TagIcon className="h-5 w-5" />
                Event Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tagInput">Add Tags</Label>
                <Input
                  id="tagInput"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type a tag and press Enter"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tags help people find your event
                </p>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-3 py-1 text-sm cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <XIcon className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(saveEvent)}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <SaveIcon className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            
            {form.watch("status") === "draft" ? (
              <Button
                type="button"
                onClick={publishEvent}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <EyeIcon className="h-4 w-4" />
                {isSaving ? "Publishing..." : "Publish Event"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={unpublishEvent}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <EyeIcon className="h-4 w-4" />
                {isSaving ? "Unpublishing..." : "Unpublish Event"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}