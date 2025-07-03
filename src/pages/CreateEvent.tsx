import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { CalendarIcon, ClockIcon, MapPinIcon, SaveIcon, EyeIcon } from "lucide-react";
import { toast } from "sonner";

const eventSchema = z.object({
  title: z.string().min(1, "Event title is required").max(100, "Title must be under 100 characters"),
  description: z.string().optional(),
  organizationName: z.string().optional(),
  date: z.string().min(1, "Event date is required"),
  time: z.string().min(1, "Event time is required"),
  location: z.string().min(1, "Event location is required"),
  eventType: z.enum(["simple", "ticketed", "premium"]).default("ticketed"),
  maxAttendees: z.number().min(1).optional(),
  isPublic: z.boolean().default(true)
});

type EventFormData = z.infer<typeof eventSchema>;

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      isPublic: true
    }
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const saveEvent = async (data: EventFormData, status: "draft" | "published" = "draft") => {
    if (!user) {
      toast.error("You must be logged in to create an event");
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
        status: status,
        owner_id: user.id
      };

      const { data: event, error } = await supabase
        .from("events")
        .insert(eventData)
        .select()
        .single();

      if (error) {
        console.error("Error creating event:", error);
        toast.error("Failed to create event: " + error.message);
        return;
      }

      toast.success(`Event ${status === 'published' ? 'published' : 'saved as draft'} successfully!`);
      
      if (status === "published") {
        navigate(`/events/${event.id}`);
      } else {
        navigate("/dashboard/events");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmitDraft = async (data: EventFormData) => {
    await saveEvent(data, "draft");
  };

  const onSubmitPublish = async (data: EventFormData) => {
    await saveEvent(data, "published");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Create Event</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Create your event and share it with the world
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onSubmitDraft)}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <SaveIcon className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save as Draft"}
            </Button>
            
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmitPublish)}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <EyeIcon className="h-4 w-4" />
              {isSaving ? "Publishing..." : "Publish Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}