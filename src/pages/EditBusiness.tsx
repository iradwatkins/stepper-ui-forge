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
import { GooglePlacesInput } from '@/components/ui/GooglePlacesInput';
import { loadGoogleMapsAPI } from '@/lib/config/google-maps';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  LoaderIcon, 
  AlertCircle, 
  Building, 
  Phone, 
  Globe, 
  MapPin, 
  Clock,
  DollarSign,
  Image,
  Plus,
  X,
  Calendar,
  Car,
  Laptop,
  Store
} from 'lucide-react';
import { CommunityBusinessService, CommunityBusiness, BusinessType } from '@/lib/services/CommunityBusinessService';

const businessSchema = z.object({
  businessName: z.string().min(1, "Business name is required").max(100, "Name must be under 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  businessType: z.enum(['physical_business', 'service_provider', 'mobile_service', 'online_business', 'venue']),
  category: z.string().min(1, "Category is required"),
  // Contact
  contactPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  contactEmail: z.string().email("Must be a valid email").optional().or(z.literal('')),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  // Location
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  // Business hours
  businessHours: z.record(z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean()
  })).optional(),
  // Features
  tags: z.array(z.string()).optional(),
  serviceOfferings: z.array(z.string()).optional(),
  socialLinks: z.record(z.string()).optional(),
  isHighlighted: z.boolean().optional()
});

type BusinessFormData = z.infer<typeof businessSchema>;

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function EditBusiness() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBusiness, setCurrentBusiness] = useState<CommunityBusiness | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newService, setNewService] = useState('');
  const [categories] = useState(CommunityBusinessService.getBusinessCategories());
  const [businessTypes] = useState(CommunityBusinessService.getBusinessTypes());

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      businessName: "",
      description: "",
      businessType: "physical_business",
      category: "",
      contactPhone: "",
      contactEmail: "",
      websiteUrl: "",
      tags: [],
      serviceOfferings: [],
      socialLinks: {},
      isHighlighted: false,
      businessHours: Object.fromEntries(
        dayNames.map(day => [day, { open: '09:00', close: '17:00', closed: false }])
      )
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
      setError("No business ID provided");
      setIsLoading(false);
      return;
    }

    loadBusiness();
  }, [user, id, navigate]);

  const loadBusiness = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const businessData = await CommunityBusinessService.getBusiness(id);
      
      if (!businessData) {
        setError("Business not found");
        return;
      }

      // Check if user has permission to edit
      if (businessData.user_id !== user?.id && !user?.email?.includes('admin')) {
        setError("You don't have permission to edit this business");
        return;
      }

      setCurrentBusiness(businessData);
      
      // Populate form with business data
      form.reset({
        businessName: businessData.business_name,
        description: businessData.description,
        businessType: businessData.business_type,
        category: businessData.category,
        contactPhone: businessData.contact_phone,
        contactEmail: businessData.contact_email || '',
        websiteUrl: businessData.website_url || '',
        address: businessData.address || '',
        city: businessData.city || '',
        state: businessData.state || '',
        zipCode: businessData.zip_code || '',
        tags: businessData.tags || [],
        serviceOfferings: businessData.service_offerings || [],
        socialLinks: businessData.social_links || {},
        isHighlighted: businessData.is_highlighted || false,
        businessHours: businessData.business_hours || Object.fromEntries(
          dayNames.map(day => [day, { open: '09:00', close: '17:00', closed: false }])
        )
      });
    } catch (error) {
      console.error("Error loading business:", error);
      setError("Failed to load business");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressChange = (value: string) => {
    form.setValue('address', value);
  };

  const addTag = () => {
    if (newTag.trim()) {
      const currentTags = form.getValues('tags') || [];
      form.setValue('tags', [...currentTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter((_, i) => i !== index));
  };

  const addService = () => {
    if (newService.trim()) {
      const currentServices = form.getValues('serviceOfferings') || [];
      form.setValue('serviceOfferings', [...currentServices, newService.trim()]);
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    const currentServices = form.getValues('serviceOfferings') || [];
    form.setValue('serviceOfferings', currentServices.filter((_, i) => i !== index));
  };

  const getBusinessTypeIcon = (type: BusinessType) => {
    switch (type) {
      case 'physical_business': return <Building className="w-4 h-4" />;
      case 'service_provider': return <Calendar className="w-4 h-4" />;
      case 'mobile_service': return <Car className="w-4 h-4" />;
      case 'online_business': return <Laptop className="w-4 h-4" />;
      case 'venue': return <Store className="w-4 h-4" />;
    }
  };

  const saveBusiness = async (data: BusinessFormData) => {
    if (!user || !id) {
      toast.error("Cannot save business: missing user or business ID");
      return;
    }

    setIsSaving(true);
    try {
      // Update business
      await CommunityBusinessService.updateBusiness(id, {
        business_name: data.businessName,
        description: data.description,
        business_type: data.businessType,
        category: data.category,
        contact_phone: data.contactPhone,
        contact_email: data.contactEmail,
        website_url: data.websiteUrl,
        address: data.address,
        city: data.city,
        state: data.state,
        zip_code: data.zipCode,
        tags: data.tags,
        service_offerings: data.serviceOfferings,
        social_links: data.socialLinks,
        is_highlighted: data.isHighlighted,
        business_hours: data.businessHours
      });

      toast.success("Business updated successfully!");
      navigate("/dashboard/businesses");
    } catch (error) {
      console.error("Error updating business:", error);
      toast.error("Failed to update business");
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
          <p>Loading business...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate("/dashboard/businesses")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Businesses
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
          <Button variant="ghost" onClick={() => navigate("/dashboard/businesses")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Businesses
          </Button>
          <h1 className="text-4xl font-bold mb-4 text-foreground">Edit Business</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Update your business details
          </p>
        </div>

        <form onSubmit={form.handleSubmit(saveBusiness)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="Enter business name"
                  {...form.register("businessName")}
                  className={form.formState.errors.businessName ? "border-destructive" : ""}
                />
                {form.formState.errors.businessName && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.businessName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your business..."
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select
                    value={form.watch("businessType")}
                    onValueChange={(value: any) => form.setValue("businessType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            {getBusinessTypeIcon(type.value)}
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={form.watch("category")}
                    onValueChange={(value) => form.setValue("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPhone">Phone Number *</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    {...form.register("contactPhone")}
                    className={form.formState.errors.contactPhone ? "border-destructive" : ""}
                  />
                  {form.formState.errors.contactPhone && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.contactPhone.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contactEmail">Email Address</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="contact@business.com"
                    {...form.register("contactEmail")}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  placeholder="https://www.yourbusiness.com"
                  {...form.register("websiteUrl")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          {(form.watch("businessType") === 'physical_business' || 
            form.watch("businessType") === 'venue' || 
            form.watch("businessType") === 'mobile_service') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          )}

          {/* Business Hours */}
          {form.watch("businessType") === 'physical_business' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Business Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dayNames.map(day => {
                  const hours = form.watch(`businessHours.${day}`);
                  return (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-24">
                        <Label>{day.charAt(0).toUpperCase() + day.slice(1)}</Label>
                      </div>
                      <Switch
                        checked={!hours?.closed}
                        onCheckedChange={(checked) => {
                          form.setValue(`businessHours.${day}.closed`, !checked);
                        }}
                      />
                      {!hours?.closed && (
                        <>
                          <Input
                            type="time"
                            value={hours?.open}
                            onChange={(e) => form.setValue(`businessHours.${day}.open`, e.target.value)}
                            className="w-32"
                          />
                          <span>to</span>
                          <Input
                            type="time"
                            value={hours?.close}
                            onChange={(e) => form.setValue(`businessHours.${day}.close`, e.target.value)}
                            className="w-32"
                          />
                        </>
                      )}
                      {hours?.closed && (
                        <span className="text-muted-foreground">Closed</span>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Tags & Services */}
          <Card>
            <CardHeader>
              <CardTitle>Tags & Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.watch('tags') || []).map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2"
                        onClick={() => removeTag(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Service Offerings</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add a service..."
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addService();
                      }
                    }}
                  />
                  <Button type="button" onClick={addService} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.watch('serviceOfferings') || []).map((service, index) => (
                    <Badge key={index} variant="outline">
                      {service}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2"
                        onClick={() => removeService(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.watch("isHighlighted")}
                  onCheckedChange={(checked) => form.setValue("isHighlighted", checked)}
                />
                <Label>Highlight this business (Featured)</Label>
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