import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DateInputField } from '@/components/ui/date-input-field';
import { TimeInputField } from '@/components/ui/time-input-field';
import { GooglePlacesInput } from '@/components/ui/GooglePlacesInput';
import { loadGoogleMapsAPI } from '@/lib/config/google-maps';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  LoaderIcon, 
  AlertCircle, 
  Clock, 
  MapPin, 
  DollarSign, 
  Users,
  Calendar,
  GraduationCap,
  Video,
  Building
} from 'lucide-react';
import { classService, SteppingClass, ClassLocation, ClassSchedule } from '@/services/classService';
import { CLASS_CATEGORIES, CLASS_LEVELS } from '@/lib/constants/class-categories';

const classSchema = z.object({
  title: z.string().min(1, "Class title is required").max(100, "Title must be under 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  classType: z.enum(['Regular Class', 'Workshop', 'Private Lesson', 'Group Session']),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  category: z.enum(['Stepping', 'Line Dancing', 'Walking']),
  price: z.number().min(0, "Price must be 0 or greater"),
  capacity: z.number().min(1, "Capacity must be at least 1").optional(),
  // Location fields
  locationType: z.enum(['physical', 'online']),
  venue: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  onlineLink: z.string().url("Must be a valid URL").optional(),
  specialInstructions: z.string().optional(),
  // Schedule fields
  scheduleType: z.enum(['single', 'weekly', 'monthly', 'custom']),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  time: z.string().min(1, "Time is required"),
  duration: z.number().min(15, "Duration must be at least 15 minutes"),
  daysOfWeek: z.array(z.number()).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  scheduleNotes: z.string().optional(),
  // Registration
  registrationOpen: z.boolean(),
  registrationDeadline: z.string().optional()
});

type ClassFormData = z.infer<typeof classSchema>;

export default function EditClass() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentClass, setCurrentClass] = useState<SteppingClass | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      title: "",
      description: "",
      classType: "Regular Class",
      level: "Beginner",
      category: "Stepping",
      price: 0,
      capacity: undefined,
      locationType: "physical",
      scheduleType: "single",
      duration: 60,
      registrationOpen: true
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
      setError("No class ID provided");
      setIsLoading(false);
      return;
    }

    loadClass();
  }, [user, id, navigate]);

  const loadClass = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const classData = await classService.getClass(id);
      
      if (!classData) {
        setError("Class not found");
        return;
      }

      // Check if user has permission to edit
      if (classData.instructorId !== user?.id && !user?.email?.includes('admin')) {
        setError("You don't have permission to edit this class");
        return;
      }

      setCurrentClass(classData);
      
      // Populate form with class data
      form.reset({
        title: classData.title,
        description: classData.description,
        classType: classData.classType,
        level: classData.level,
        category: classData.category,
        price: classData.price,
        capacity: classData.capacity,
        // Location
        locationType: classData.location.type,
        venue: classData.location.venue,
        address: classData.location.address,
        city: classData.location.city,
        state: classData.location.state,
        zipCode: classData.location.zipCode,
        onlineLink: classData.location.onlineLink,
        specialInstructions: classData.location.specialInstructions,
        // Schedule
        scheduleType: classData.schedule.type,
        startDate: classData.schedule.startDate,
        endDate: classData.schedule.endDate,
        time: classData.schedule.time,
        duration: classData.schedule.duration,
        daysOfWeek: classData.schedule.daysOfWeek,
        dayOfMonth: classData.schedule.dayOfMonth,
        scheduleNotes: classData.schedule.notes,
        // Registration
        registrationOpen: classData.registrationOpen,
        registrationDeadline: classData.registrationDeadline
      });

      if (classData.schedule.daysOfWeek) {
        setSelectedDays(classData.schedule.daysOfWeek);
      }
    } catch (error) {
      console.error("Error loading class:", error);
      setError("Failed to load class");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev => {
      const newDays = prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort();
      
      form.setValue('daysOfWeek', newDays);
      return newDays;
    });
  };

  const handleAddressChange = (value: string) => {
    form.setValue('address', value);
  };

  const saveClass = async (data: ClassFormData) => {
    if (!user || !id) {
      toast.error("Cannot save class: missing user or class ID");
      return;
    }

    setIsSaving(true);
    try {
      // Prepare location data
      const location: ClassLocation = {
        type: data.locationType,
        venue: data.venue,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        onlineLink: data.onlineLink,
        specialInstructions: data.specialInstructions
      };

      // Prepare schedule data
      const schedule: ClassSchedule = {
        type: data.scheduleType,
        startDate: data.startDate,
        endDate: data.endDate,
        time: data.time,
        duration: data.duration,
        daysOfWeek: data.daysOfWeek,
        dayOfMonth: data.dayOfMonth,
        notes: data.scheduleNotes
      };

      // Update class
      await classService.updateClass(id, {
        title: data.title,
        description: data.description,
        classType: data.classType,
        level: data.level,
        category: data.category,
        price: data.price,
        capacity: data.capacity,
        location,
        schedule,
        registrationOpen: data.registrationOpen,
        registrationDeadline: data.registrationDeadline
      });

      toast.success("Class updated successfully!");
      navigate("/dashboard/classes");
    } catch (error) {
      console.error("Error updating class:", error);
      toast.error("Failed to update class");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <LoaderIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading class...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate("/dashboard/classes")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Button>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard/classes")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Button>
          <h1 className="text-4xl font-bold mb-4 text-foreground">Edit Class</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Update your class details
          </p>
        </div>

        <form onSubmit={form.handleSubmit(saveClass)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Class Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Class Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter class title"
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
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your class..."
                  rows={4}
                  {...form.register("description")}
                  className={form.formState.errors.description ? "border-destructive" : ""}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="classType">Class Type</Label>
                  <Select
                    value={form.watch("classType")}
                    onValueChange={(value: any) => form.setValue("classType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular Class">Regular Class</SelectItem>
                      <SelectItem value="Workshop">Workshop</SelectItem>
                      <SelectItem value="Private Lesson">Private Lesson</SelectItem>
                      <SelectItem value="Group Session">Group Session</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="level">Level</Label>
                  <Select
                    value={form.watch("level")}
                    onValueChange={(value: any) => form.setValue("level", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASS_LEVELS.map(level => (
                        <SelectItem key={level.id} value={level.name}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={form.watch("category")}
                    onValueChange={(value: any) => form.setValue("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASS_CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing and Capacity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing & Capacity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price per Class ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register("price", { valueAsNumber: true })}
                    className={form.formState.errors.price ? "border-destructive" : ""}
                  />
                  {form.formState.errors.price && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.price.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="capacity">Maximum Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    placeholder="Leave empty for unlimited"
                    {...form.register("capacity", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Location Type</Label>
                <RadioGroup
                  value={form.watch("locationType")}
                  onValueChange={(value: any) => form.setValue("locationType", value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="physical" id="physical" />
                    <Label htmlFor="physical" className="cursor-pointer">
                      Physical Location
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="cursor-pointer">
                      Online Class
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {form.watch("locationType") === "physical" ? (
                <>
                  <div>
                    <Label htmlFor="venue">Venue Name</Label>
                    <Input
                      id="venue"
                      placeholder="Enter venue name"
                      {...form.register("venue")}
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <GooglePlacesInput
                      value={form.watch('address') || ''}
                      onChange={handleAddressChange}
                      placeholder="Search for address..."
                      error={!!form.formState.errors.address}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {isGoogleMapsLoaded ? (
                        <>🌍 Enhanced search enabled!</>
                      ) : (
                        <>Enter full address including city and state</>
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="City"
                        {...form.register("city")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        placeholder="State"
                        {...form.register("state")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        placeholder="ZIP"
                        {...form.register("zipCode")}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="onlineLink">Online Meeting Link</Label>
                  <Input
                    id="onlineLink"
                    type="url"
                    placeholder="https://zoom.us/..."
                    {...form.register("onlineLink")}
                    className={form.formState.errors.onlineLink ? "border-destructive" : ""}
                  />
                  {form.formState.errors.onlineLink && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.onlineLink.message}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  placeholder="Parking info, entrance details, what to bring..."
                  rows={3}
                  {...form.register("specialInstructions")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Schedule Type</Label>
                <RadioGroup
                  value={form.watch("scheduleType")}
                  onValueChange={(value: any) => form.setValue("scheduleType", value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="cursor-pointer">
                      Single Class
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly" className="cursor-pointer">
                      Weekly Recurring
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="cursor-pointer">
                      Monthly Recurring
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <DateInputField
                    value={form.watch('startDate')}
                    onChange={(value) => form.setValue('startDate', value)}
                    className={form.formState.errors.startDate ? "border-destructive" : ""}
                    minDate={new Date().toISOString().split('T')[0]}
                  />
                  {form.formState.errors.startDate && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.startDate.message}
                    </p>
                  )}
                </div>

                {form.watch("scheduleType") !== "single" && (
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <DateInputField
                      value={form.watch('endDate')}
                      onChange={(value) => form.setValue('endDate', value)}
                      minDate={form.watch('startDate')}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="time">Class Time *</Label>
                  <TimeInputField
                    value={form.watch('time')}
                    onChange={(value) => form.setValue('time', value)}
                    className={form.formState.errors.time ? "border-destructive" : ""}
                  />
                  {form.formState.errors.time && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.time.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    step="15"
                    placeholder="60"
                    {...form.register("duration", { valueAsNumber: true })}
                    className={form.formState.errors.duration ? "border-destructive" : ""}
                  />
                  {form.formState.errors.duration && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.duration.message}
                    </p>
                  )}
                </div>
              </div>

              {form.watch("scheduleType") === "weekly" && (
                <div>
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dayNames.map((day, index) => (
                      <Badge
                        key={index}
                        variant={selectedDays.includes(index) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleDayToggle(index)}
                      >
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {form.watch("scheduleType") === "monthly" && (
                <div>
                  <Label htmlFor="dayOfMonth">Day of Month</Label>
                  <Input
                    id="dayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="15"
                    {...form.register("dayOfMonth", { valueAsNumber: true })}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="scheduleNotes">Schedule Notes</Label>
                <Textarea
                  id="scheduleNotes"
                  placeholder="Holiday exceptions, special dates..."
                  rows={2}
                  {...form.register("scheduleNotes")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Registration Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Registration Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.watch("registrationOpen")}
                  onCheckedChange={(checked) => form.setValue("registrationOpen", checked)}
                />
                <Label>Registration Open</Label>
              </div>

              <div>
                <Label htmlFor="registrationDeadline">Registration Deadline</Label>
                <DateInputField
                  value={form.watch('registrationDeadline')}
                  onChange={(value) => form.setValue('registrationDeadline', value)}
                  minDate={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to allow registration until class starts
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}