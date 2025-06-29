
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ImageIcon, X, Upload } from "lucide-react";

interface EventFormData {
  title: string;
  description: string;
  organizationName: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  address: string;
  categories: string[];
  capacity?: number;
  displayPrice?: {
    amount: number;
    label: string;
  };
  isPublic: boolean;
  tags?: string[];
  timezone?: string;
  images?: string[];
}

interface BasicInformationProps {
  form: UseFormReturn<EventFormData>;
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  uploadedImages: string[];
  onImageUpload: (files: FileList) => void;
  onRemoveImage: (index: number) => void;
  isProcessingImage: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

const EVENT_CATEGORIES = [
  { id: 'workshops', label: 'Workshops' },
  { id: 'sets', label: 'Sets' },
  { id: 'in-the-park', label: 'In the park' },
  { id: 'trips', label: 'Trips' },
  { id: 'cruises', label: 'Cruises' },
  { id: 'holiday', label: 'Holiday' },
  { id: 'competitions', label: 'Competitions' }
] as const;

export const BasicInformation = ({ 
  form, 
  selectedCategories, 
  onCategoryToggle, 
  uploadedImages,
  onImageUpload,
  onRemoveImage,
  isProcessingImage,
  onNext, 
  onPrevious 
}: BasicInformationProps) => {
  console.log("BasicInformation rendering with categories:", selectedCategories);

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageUpload(e.target.files);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(() => onNext())} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">Event Information</h2>
        <p className="text-sm text-muted-foreground">Tell us about your event</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Event Images
            </CardTitle>
            <CardDescription className="text-sm">
              Upload images to make your event more appealing (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
                  onChange={handleImageInputChange}
                  className="hidden"
                  disabled={isProcessingImage}
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {isProcessingImage ? "Processing images..." : "Click to upload images"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF up to 10MB each
                    </p>
                  </div>
                </label>
              </div>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Event image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                  onClick={() => onCategoryToggle(category.id)}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Checkbox
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => onCategoryToggle(category.id)}
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
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onPrevious} className="flex-1">
          Back
        </Button>
        <Button 
          type="submit" 
          disabled={!form.formState.isValid || selectedCategories.length === 0 || isProcessingImage}
          className="flex-1"
        >
          {isProcessingImage ? "Processing..." : "Continue"}
        </Button>
      </div>
    </form>
  );
};
