import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  X, 
  User, 
  Camera, 
  DollarSign, 
  Clock, 
  MapPin, 
  Calendar,
  Users,
  Book,
  Tag,
  Mail,
  Phone
} from 'lucide-react';
import { CLASS_LEVELS, CLASS_CATEGORIES, CLASS_TYPES } from '@/lib/constants/class-categories';
import { ClassSubmissionData } from '@/services/classService';

interface InstructorClassFormProps {
  onSubmit: (data: ClassSubmissionData) => Promise<void>;
  loading?: boolean;
  initialData?: Partial<ClassSubmissionData>;
}

export function InstructorClassForm({ onSubmit, loading = false, initialData }: InstructorClassFormProps) {
  const [formData, setFormData] = useState<ClassSubmissionData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    classType: initialData?.classType || 'Regular Class',
    level: initialData?.level || 'Beginner',
    category: initialData?.category || 'Stepping',
    location: {
      type: 'physical',
      venue: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      onlineLink: '',
      specialInstructions: ''
    },
    schedule: {
      type: 'weekly',
      startDate: '',
      endDate: '',
      time: '',
      duration: 60,
      daysOfWeek: [],
      notes: ''
    },
    price: 0,
    capacity: 20,
    hasRSVP: true,
    contactInfo: {
      email: '',
      phone: '',
      preferredContact: 'email'
    },
    prerequisites: '',
    whatToBring: '',
    extras: '',
    tags: [],
    images: [],
    ...initialData
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [classLogo, setClassLogo] = useState<File | null>(null);
  const [classImages, setClassImages] = useState<File[]>([]);
  const [currentTag, setCurrentTag] = useState('');

  const handleInputChange = (field: string, value: string | number | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
  };

  const handleScheduleChange = (field: string, value: string | number | number[]) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [field]: value
      }
    }));
  };

  const handleContactChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value
      }
    }));
  };

  const handleImageUpload = (files: FileList | null, type: 'profile' | 'logo' | 'class') => {
    if (!files) return;

    if (type === 'profile' && files[0]) {
      setProfileImage(files[0]);
    } else if (type === 'logo' && files[0]) {
      setClassLogo(files[0]);
    } else if (type === 'class') {
      const newImages = Array.from(files).slice(0, 5 - classImages.length);
      setClassImages(prev => [...prev, ...newImages]);
    }
  };

  const removeClassImage = (index: number) => {
    setClassImages(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine all images
    const allImages = [];
    if (profileImage) allImages.push(profileImage);
    if (classLogo) allImages.push(classLogo);
    allImages.push(...classImages);

    const submissionData = {
      ...formData,
      images: allImages
    };

    await onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="w-5 h-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Class Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Fundamentals of Chicago Stepping"
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Class Fee (USD) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  className="pl-10"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your class, what students will learn, and what makes it special..."
              rows={4}
              required
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Class Type *</Label>
              <Select value={formData.classType} onValueChange={(value) => handleInputChange('classType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_TYPES.map(type => (
                    <SelectItem key={type.id} value={type.label}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level *</Label>
              <Select value={formData.level} onValueChange={(value) => handleInputChange('level', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map(level => (
                    <SelectItem key={level.id} value={level.label}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_CATEGORIES.map(category => (
                    <SelectItem key={category.id} value={category.label}>{category.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Profile Picture */}
            <div>
              <Label>Instructor Profile Picture</Label>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {profileImage ? (
                  <div className="space-y-2">
                    <img
                      src={URL.createObjectURL(profileImage)}
                      alt="Profile preview"
                      className="w-20 h-20 rounded-full mx-auto object-cover"
                    />
                    <p className="text-sm text-muted-foreground">{profileImage.name}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileImage(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <User className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files, 'profile')}
                      className="hidden"
                      id="profile-upload"
                    />
                    <Label htmlFor="profile-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>Upload Profile Picture</span>
                      </Button>
                    </Label>
                  </div>
                )}
              </div>
            </div>

            {/* Class Logo */}
            <div>
              <Label>Class Logo</Label>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {classLogo ? (
                  <div className="space-y-2">
                    <img
                      src={URL.createObjectURL(classLogo)}
                      alt="Logo preview"
                      className="w-20 h-20 mx-auto object-cover rounded"
                    />
                    <p className="text-sm text-muted-foreground">{classLogo.name}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setClassLogo(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files, 'logo')}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>Upload Class Logo</span>
                      </Button>
                    </Label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Class Images */}
          <div>
            <Label>Additional Class Images (up to 5 total)</Label>
            <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                {classImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Class image ${index + 1}`}
                      className="w-full h-20 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 w-6 h-6 p-0"
                      onClick={() => removeClassImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              {classImages.length < 5 && (
                <div className="text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files, 'class')}
                    className="hidden"
                    id="class-images-upload"
                  />
                  <Label htmlFor="class-images-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Add Class Images
                      </span>
                    </Button>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-2">
                    {5 - classImages.length} remaining
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule & Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule & Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Location Type *</Label>
              <Select value={formData.location.type} onValueChange={(value) => handleLocationChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical Location</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schedule Type *</Label>
              <Select value={formData.schedule.type} onValueChange={(value) => handleScheduleChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Session</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.location.type === 'physical' ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venue">Venue Name *</Label>
                <Input
                  id="venue"
                  value={formData.location.venue}
                  onChange={(e) => handleLocationChange('venue', e.target.value)}
                  placeholder="e.g., Chicago Cultural Center"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.location.address}
                  onChange={(e) => handleLocationChange('address', e.target.value)}
                  placeholder="Street address"
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.location.city}
                  onChange={(e) => handleLocationChange('city', e.target.value)}
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.location.state}
                  onChange={(e) => handleLocationChange('state', e.target.value)}
                  placeholder="State"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="onlineLink">Online Meeting Link *</Label>
              <Input
                id="onlineLink"
                value={formData.location.onlineLink}
                onChange={(e) => handleLocationChange('onlineLink', e.target.value)}
                placeholder="https://zoom.us/j/..."
                required
              />
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.schedule.startDate}
                onChange={(e) => handleScheduleChange('startDate', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={formData.schedule.time}
                onChange={(e) => handleScheduleChange('time', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.schedule.duration}
                  onChange={(e) => handleScheduleChange('duration', parseInt(e.target.value) || 60)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="capacity">Class Capacity</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || undefined)}
                className="pl-10"
                placeholder="Maximum number of students"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.contactInfo.email}
                  onChange={(e) => handleContactChange('email', e.target.value)}
                  className="pl-10"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.contactInfo.phone}
                  onChange={(e) => handleContactChange('phone', e.target.value)}
                  className="pl-10"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
          <div>
            <Label>Preferred Contact Method</Label>
            <Select value={formData.contactInfo.preferredContact} onValueChange={(value) => handleContactChange('preferredContact', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prerequisites">Prerequisites</Label>
            <Textarea
              id="prerequisites"
              value={formData.prerequisites}
              onChange={(e) => handleInputChange('prerequisites', e.target.value)}
              placeholder="Any experience or skills required..."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="whatToBring">What to Bring</Label>
            <Textarea
              id="whatToBring"
              value={formData.whatToBring}
              onChange={(e) => handleInputChange('whatToBring', e.target.value)}
              placeholder="Items students should bring to class..."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="extras">Extras/Perks</Label>
            <Textarea
              id="extras"
              value={formData.extras}
              onChange={(e) => handleInputChange('extras', e.target.value)}
              placeholder="Additional benefits, refreshments, etc..."
              rows={2}
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Tag className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="hasRSVP"
              checked={formData.hasRSVP}
              onCheckedChange={(checked) => handleInputChange('hasRSVP', checked)}
            />
            <Label htmlFor="hasRSVP">Require RSVP/Registration</Label>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card>
        <CardContent className="pt-6">
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Creating Class...' : 'Create Class'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}