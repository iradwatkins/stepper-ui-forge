import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Store,
  ArrowLeft,
  Save,
  Plus,
  X,
  Clock,
  MapPin,
  Globe,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  AlertCircle,
  CheckCircle,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { imageUploadService } from '@/lib/services/ImageUploadService';
import { 
  CommunityBusinessService,
  BusinessCategory,
  BusinessType,
  ServiceRateType,
  PriceRange,
  BusinessHours,
  SocialMedia
} from '@/lib/services/CommunityBusinessService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Validation schema - dynamic based on business type
const createBusinessSchema = (businessType: BusinessType) => {
  const baseSchema = {
    business_name: z.string().min(2, 'Business name must be at least 2 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: z.string().min(1, 'Please select a category'),
    business_type: z.string().min(1, 'Please select a business type'),
    subcategory: z.string().optional(),
    contact_email: z.string().email('Invalid email address').optional().or(z.literal('')),
    contact_phone: z.string().optional(),
    website_url: z.string().url('Invalid website URL').optional().or(z.literal('')),
    price_range: z.enum(['$', '$$', '$$$', '$$$$']).optional(),
    service_area_radius: z.number().min(0).max(500).optional()
  };

  // Conditional validation based on business type
  if (CommunityBusinessService.requiresPhysicalAddress(businessType)) {
    return z.object({
      ...baseSchema,
      address: z.string().min(1, 'Address is required for physical businesses'),
      city: z.string().min(1, 'City is required for physical businesses'),
      state: z.string().min(1, 'State is required for physical businesses'),
      zip_code: z.string().optional()
    });
  }

  if (businessType === 'online_business') {
    return z.object({
      ...baseSchema,
      website_url: z.string().url('Website URL is required for online businesses'),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip_code: z.string().optional()
    });
  }

  if (businessType === 'service_provider' || businessType === 'mobile_service') {
    return z.object({
      ...baseSchema,
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip_code: z.string().optional(),
      service_area_radius: z.number().min(1, 'Service area radius is required').max(500)
    });
  }

  return z.object({
    ...baseSchema,
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip_code: z.string().optional()
  });
};

type BusinessFormData = {
  business_name: string;
  description: string;
  category: string;
  business_type: string;
  subcategory?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  price_range?: PriceRange;
  service_area_radius?: number;
};

export default function CreateBusiness() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>('physical_business');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [serviceOfferings, setServiceOfferings] = useState<string[]>([]);
  const [newServiceOffering, setNewServiceOffering] = useState('');
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [socialMedia, setSocialMedia] = useState<SocialMedia>({});
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(createBusinessSchema(selectedBusinessType)),
    defaultValues: {
      business_name: '',
      description: '',
      category: '',
      business_type: 'physical_business',
      subcategory: '',
      contact_email: user?.email || '',
      contact_phone: '',
      website_url: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      service_area_radius: CommunityBusinessService.getDefaultServiceAreaRadius('physical_business') || 25
    }
  });

  // Update form validation when business type changes
  React.useEffect(() => {
    form.clearErrors();
    const defaultRadius = CommunityBusinessService.getDefaultServiceAreaRadius(selectedBusinessType);
    if (defaultRadius) {
      form.setValue('service_area_radius', defaultRadius);
    }
  }, [selectedBusinessType, form]);

  const categories = CommunityBusinessService.getBusinessCategories();
  const businessTypes = CommunityBusinessService.getBusinessTypes();
  const serviceRateTypes = CommunityBusinessService.getServiceRateTypes();

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()]);
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialtyToRemove: string) => {
    setSpecialties(specialties.filter(specialty => specialty !== specialtyToRemove));
  };

  const addServiceOffering = () => {
    if (newServiceOffering.trim() && !serviceOfferings.includes(newServiceOffering.trim())) {
      setServiceOfferings([...serviceOfferings, newServiceOffering.trim()]);
      setNewServiceOffering('');
    }
  };

  const removeServiceOffering = (offeringToRemove: string) => {
    setServiceOfferings(serviceOfferings.filter(offering => offering !== offeringToRemove));
  };

  const updateBusinessHours = (day: keyof BusinessHours, hours: { open: string; close: string; closed?: boolean }) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: hours
    }));
  };

  const updateSocialMedia = (platform: keyof SocialMedia, url: string) => {
    setSocialMedia(prev => ({
      ...prev,
      [platform]: url || undefined
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const result = await imageUploadService.uploadOptimizedImage(file, {
          bucket: 'venue-images',
          folder: `businesses/${user?.id}`,
          maxSizeBytes: 5 * 1024 * 1024, // 5MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
          userId: user?.id
        });

        if (result.success && result.url) {
          return result.url;
        } else {
          toast.error(`Failed to upload ${file.name}: ${result.error}`);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(url => url !== null) as string[];
      
      if (successfulUploads.length > 0) {
        setUploadedImages(prev => [...prev, ...successfulUploads]);
        toast.success(`Uploaded ${successfulUploads.length} image(s) successfully`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (imageUrl: string) => {
    setUploadedImages(prev => prev.filter(url => url !== imageUrl));
  };

  const onSubmit = async (data: BusinessFormData) => {
    if (!user) {
      toast.error('You must be logged in to create a business listing');
      return;
    }

    try {
      setLoading(true);

      const businessData = {
        ...data,
        category: data.category as BusinessCategory,
        business_type: selectedBusinessType,
        price_range: data.price_range as PriceRange,
        tags,
        specialties,
        service_offerings: serviceOfferings.length > 0 ? serviceOfferings : undefined,
        business_hours: Object.keys(businessHours).length > 0 ? businessHours : undefined,
        social_media: Object.keys(socialMedia).length > 0 ? socialMedia : undefined,
        gallery_images: uploadedImages,
        owner_id: user.id
      };

      await CommunityBusinessService.createBusiness(businessData);

      toast.success('Business listing created successfully! It will be reviewed before being published.');
      navigate('/community');
    } catch (error) {
      console.error('Error creating business:', error);
      toast.error('Failed to create business listing');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">
              You need to be logged in to create a business listing.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/account')} className="flex-1">
                Sign In
              </Button>
              <Button variant="outline" onClick={() => navigate('/community')} className="flex-1">
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/community')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Community
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add Your Business or Service</h1>
            <p className="text-muted-foreground">
              List your business, service, or venue in our community directory
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="type" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="type">Type</TabsTrigger>
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="hours">Hours</TabsTrigger>
                </TabsList>

                <TabsContent value="type" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Business Type</CardTitle>
                      <CardDescription>
                        Choose the type that best describes your listing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {businessTypes.map((type) => (
                          <div
                            key={type.value}
                            onClick={() => {
                              setSelectedBusinessType(type.value);
                              form.setValue('business_type', type.value);
                            }}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              selectedBusinessType === type.value
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="text-2xl">{type.icon}</div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-sm">{type.label}</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {type.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Business Type Specific Info */}
                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">
                          Requirements for {CommunityBusinessService.getBusinessTypeLabel(selectedBusinessType)}:
                        </h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {CommunityBusinessService.getRequiredFieldsForType(selectedBusinessType).map((field) => (
                            <li key={field} className="flex items-center space-x-2">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span className="capitalize">{field.replace('_', ' ')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="basic" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Business Information</CardTitle>
                      <CardDescription>
                        Tell us about your business or service
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="business_name">Business Name *</Label>
                        <Input
                          id="business_name"
                          {...form.register('business_name')}
                          placeholder="Your business name"
                        />
                        {form.formState.errors.business_name && (
                          <p className="text-sm text-red-500 mt-1">
                            {form.formState.errors.business_name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <Select onValueChange={(value) => form.setValue('category', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category.value} value={category.value}>
                                <div>
                                  <div className="font-medium">{category.label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {category.description}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.category && (
                          <p className="text-sm text-red-500 mt-1">
                            {form.formState.errors.category.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="subcategory">Subcategory</Label>
                        <Input
                          id="subcategory"
                          {...form.register('subcategory')}
                          placeholder="e.g., Wedding Photography, Personal Training"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                          id="description"
                          {...form.register('description')}
                          placeholder="Describe your business, services, and what makes you unique"
                          rows={4}
                        />
                        {form.formState.errors.description && (
                          <p className="text-sm text-red-500 mt-1">
                            {form.formState.errors.description.message}
                          </p>
                        )}
                      </div>

                      {/* Conditional Price Range or Service Rate */}
                      {selectedBusinessType === 'service_provider' ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="hourly_rate">Service Rate</Label>
                            <div className="flex space-x-2">
                              <Input
                                id="hourly_rate"
                                type="number"
                                placeholder="Enter rate"
                                className="flex-1"
                              />
                              <Select>
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Rate type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {serviceRateTypes.map(rateType => (
                                    <SelectItem key={rateType.value} value={rateType.value}>
                                      {rateType.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="price_range">Price Range</Label>
                          <Select onValueChange={(value: PriceRange) => form.setValue('price_range', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select price range" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="$">$ - Budget friendly</SelectItem>
                              <SelectItem value="$$">$$ - Moderate</SelectItem>
                              <SelectItem value="$$$">$$$ - Premium</SelectItem>
                              <SelectItem value="$$$$">$$$$ - Luxury</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Service-specific fields */}
                      {(selectedBusinessType === 'service_provider' || selectedBusinessType === 'mobile_service') && (
                        <div className="space-y-4">
                          <div>
                            <Label>Service Offerings</Label>
                            <div className="flex gap-2 mb-2">
                              <Input
                                value={newServiceOffering}
                                onChange={(e) => setNewServiceOffering(e.target.value)}
                                placeholder="Add a service offering"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addServiceOffering())}
                              />
                              <Button type="button" onClick={addServiceOffering}>
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {serviceOfferings.map(offering => (
                                <Badge key={offering} variant="secondary" className="flex items-center gap-1">
                                  {offering}
                                  <X
                                    className="w-3 h-3 cursor-pointer"
                                    onClick={() => removeServiceOffering(offering)}
                                  />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Image Upload Section */}
                      <div>
                        <Label>Business Photos</Label>
                        <div className="space-y-4">
                          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                            <div className="text-center">
                              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="mt-4">
                                <Label htmlFor="images" className="cursor-pointer">
                                  <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Upload business photos
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    PNG, JPG, WEBP up to 5MB each
                                  </span>
                                </Label>
                                <Input
                                  id="images"
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  className="hidden"
                                  disabled={uploading}
                                />
                              </div>
                              <div className="mt-4">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  disabled={uploading}
                                  onClick={() => document.getElementById('images')?.click()}
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  {uploading ? 'Uploading...' : 'Choose Images'}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Display uploaded images */}
                          {uploadedImages.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {uploadedImages.map((imageUrl, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={imageUrl}
                                    alt={`Business photo ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeImage(imageUrl)}
                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="contact" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                      <CardDescription>
                        How can customers reach you?
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="contact_email">Email</Label>
                        <Input
                          id="contact_email"
                          type="email"
                          {...form.register('contact_email')}
                          placeholder="business@example.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="contact_phone">Phone</Label>
                        <Input
                          id="contact_phone"
                          {...form.register('contact_phone')}
                          placeholder="(555) 123-4567"
                        />
                      </div>

                      <div>
                        <Label htmlFor="website_url">Website</Label>
                        <Input
                          id="website_url"
                          {...form.register('website_url')}
                          placeholder="https://your-website.com"
                        />
                      </div>

                      <div className="space-y-4">
                        <Label>Social Media</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="facebook" className="flex items-center gap-2">
                              <Facebook className="w-4 h-4" />
                              Facebook
                            </Label>
                            <Input
                              id="facebook"
                              value={socialMedia.facebook || ''}
                              onChange={(e) => updateSocialMedia('facebook', e.target.value)}
                              placeholder="https://facebook.com/yourpage"
                            />
                          </div>
                          <div>
                            <Label htmlFor="instagram" className="flex items-center gap-2">
                              <Instagram className="w-4 h-4" />
                              Instagram
                            </Label>
                            <Input
                              id="instagram"
                              value={socialMedia.instagram || ''}
                              onChange={(e) => updateSocialMedia('instagram', e.target.value)}
                              placeholder="https://instagram.com/youraccount"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Location</CardTitle>
                      <CardDescription>
                        Where is your business located?
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          {...form.register('address')}
                          placeholder="123 Main Street"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            {...form.register('city')}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            {...form.register('state')}
                            placeholder="State"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="zip_code">ZIP Code</Label>
                        <Input
                          id="zip_code"
                          {...form.register('zip_code')}
                          placeholder="12345"
                        />
                      </div>

                      {/* Conditional Service Area */}
                      {(selectedBusinessType === 'service_provider' || selectedBusinessType === 'mobile_service') && (
                        <div>
                          <Label htmlFor="service_area_radius">Service Area Radius (miles)</Label>
                          <Input
                            id="service_area_radius"
                            type="number"
                            {...form.register('service_area_radius', { valueAsNumber: true })}
                            placeholder={CommunityBusinessService.getDefaultServiceAreaRadius(selectedBusinessType)?.toString() || "25"}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            How far are you willing to travel or provide services?
                          </p>
                        </div>
                      )}

                      {selectedBusinessType === 'online_business' && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            As an online business, make sure to provide a website URL in the contact section.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tags & Specialties</CardTitle>
                      <CardDescription>
                        Help customers find you with relevant keywords
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Tags</Label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add a tag"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          />
                          <Button type="button" onClick={addTag}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                              {tag}
                              <X
                                className="w-3 h-3 cursor-pointer"
                                onClick={() => removeTag(tag)}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Specialties</Label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={newSpecialty}
                            onChange={(e) => setNewSpecialty(e.target.value)}
                            placeholder="Add a specialty"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                          />
                          <Button type="button" onClick={addSpecialty}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {specialties.map(specialty => (
                            <Badge key={specialty} variant="outline" className="flex items-center gap-1">
                              {specialty}
                              <X
                                className="w-3 h-3 cursor-pointer"
                                onClick={() => removeSpecialty(specialty)}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Online Booking for Service Providers */}
                      {CommunityBusinessService.supportsOnlineBooking(selectedBusinessType) && (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" id="accepts_booking" className="rounded" />
                            <Label htmlFor="accepts_booking" className="text-sm">
                              Accept online booking/scheduling
                            </Label>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="min_duration">Min Booking (minutes)</Label>
                              <Input
                                id="min_duration"
                                type="number"
                                placeholder="60"
                              />
                            </div>
                            <div>
                              <Label htmlFor="advance_notice">Advance Notice (hours)</Label>
                              <Input
                                id="advance_notice"
                                type="number"
                                placeholder="24"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="hours" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {selectedBusinessType === 'service_provider' ? 'Availability' : 'Business Hours'}
                      </CardTitle>
                      <CardDescription>
                        {selectedBusinessType === 'service_provider' 
                          ? 'When are you available to provide services?' 
                          : selectedBusinessType === 'online_business'
                          ? 'When do you respond to inquiries?'
                          : 'When are you open?'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                          <div key={day} className="flex items-center gap-4">
                            <div className="w-20 text-sm font-medium capitalize">
                              {day}
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="time"
                                placeholder="Open"
                                value={businessHours[day as keyof BusinessHours]?.open || ''}
                                onChange={(e) => updateBusinessHours(day as keyof BusinessHours, {
                                  open: e.target.value,
                                  close: businessHours[day as keyof BusinessHours]?.close || '',
                                  closed: false
                                })}
                                className="w-32"
                              />
                              <span className="text-muted-foreground">to</span>
                              <Input
                                type="time"
                                placeholder="Close"
                                value={businessHours[day as keyof BusinessHours]?.close || ''}
                                onChange={(e) => updateBusinessHours(day as keyof BusinessHours, {
                                  open: businessHours[day as keyof BusinessHours]?.open || '',
                                  close: e.target.value,
                                  closed: false
                                })}
                                className="w-32"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateBusinessHours(day as keyof BusinessHours, {
                                  open: '',
                                  close: '',
                                  closed: true
                                })}
                              >
                                Closed
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Save className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Business Listing
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/community')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your {selectedBusinessType === 'service_provider' ? 'service' : 'business'} listing will be reviewed before being published to ensure quality and relevance to our community.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Tips for Success</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Use clear, descriptive business names</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Include relevant keywords in your description</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Add multiple contact methods</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Set accurate business hours</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Use tags that customers might search for</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}