import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, ClockIcon, MapPinIcon, SaveIcon, EyeIcon, ArrowLeft, LoaderIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const eventSchema = z.object({
  title: z.string().min(1, "Event title is required").max(100, "Title must be under 100 characters"),
  description: z.string().optional(),
  organizationName: z.string().optional(),
  date: z.string().min(1, "Event date is required"),
  time: z.string().min(1, "Event time is required"),
  location: z.string().min(1, "Event location is required"),
  eventType: z.enum(["simple", "ticketed", "premium"]),
  maxAttendees: z.number().min(1).optional(),
  isPublic: z.boolean().default(true),
  status: z.enum(["draft", "published", "cancelled", "completed"])
});

type EventFormData = z.infer<typeof eventSchema>;

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      organizationName: "",
      date: "",
      time: "",
      location: "",
      eventType: "ticketed",
      isPublic: true,
      status: "draft"
    }
  });

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

      // Populate form with event data
      form.reset({
        title: event.title,
        description: event.description || "",
        organizationName: event.organization_name || "",
        date: event.date,
        time: event.time,
        location: event.location,
        eventType: event.event_type,
        maxAttendees: event.max_attendees || undefined,
        isPublic: event.is_public,
        status: event.status
      });
    } catch (error) {
      console.error("Error loading event:", error);
      setError("Failed to load event");
    } finally {
      setIsLoading(false);
    }
  };

  const saveEvent = async (data: EventFormData) => {
    if (!user || !id) {
      toast.error("Cannot save event: missing user or event ID");
      return;
    }

    setIsSaving(true);
    try {
      const eventData = {
        title: data.title,
        description: data.description || null,
        organization_name: data.organizationName || null,
        date: data.date,
        time: data.time,
        location: data.location,
        event_type: data.eventType,
        max_attendees: data.maxAttendees || null,
        is_public: data.isPublic,
        status: data.status,
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
                <ClockIcon className="h-5 w-5" />
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Event Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    {...form.register("date")}
                    className={form.formState.errors.date ? "border-destructive" : ""}
                  />
                  {form.formState.errors.date && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.date.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="time">Event Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    {...form.register("time")}
                    className={form.formState.errors.time ? "border-destructive" : ""}
                  />
                  {form.formState.errors.time && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.time.message}
                    </p>
                  )}
                </div>
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
                <Label htmlFor="location">Event Location *</Label>
                <Input
                  id="location"
                  placeholder="Enter event location or address"
                  {...form.register("location")}
                  className={form.formState.errors.location ? "border-destructive" : ""}
                />
                {form.formState.errors.location && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.location.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select
                    value={form.watch("eventType")}
                    onValueChange={(value: "simple" | "ticketed" | "premium") =>
                      form.setValue("eventType", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple (Free)</SelectItem>
                      <SelectItem value="ticketed">Ticketed</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
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