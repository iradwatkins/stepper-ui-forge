import { UseFormReturn } from "react-hook-form";
import { EventFormData } from "@/types/event-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, 
  MapPinIcon, 
  UsersIcon, 
  DollarSignIcon, 
  BuildingIcon,
  ImageIcon,
  TagIcon,
  EyeIcon,
  SaveIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatEventDate, formatEventTime } from "@/lib/utils/dateUtils";

interface ProcessedImages {
  banner?: {
    original: string;
    thumbnail: string;
    metadata: {
      dimensions: { width: number; height: number; };
      compressionRatio: number;
    };
  };
  postcard?: {
    original: string;
    thumbnail: string;
    metadata: {
      dimensions: { width: number; height: number; };
      compressionRatio: number;
    };
  };
}

interface ReviewStepWizardProps {
  form: UseFormReturn<EventFormData>;
  eventType: 'simple' | 'ticketed' | 'premium' | '';
  selectedCategories: string[];
  uploadedImages: ProcessedImages;
  onSave: (status: 'draft' | 'published') => Promise<boolean>;
  isSaving: boolean;
}

const categoryLabels: Record<string, string> = {
  'workshops': 'Workshops',
  'sets': 'Sets',
  'in-the-park': 'In the park',
  'trips': 'Trips',
  'cruises': 'Cruises',
  'holiday': 'Holiday',
  'competitions': 'Competitions'
};

const eventTypeLabels: Record<string, string> = {
  'simple': 'Simple Event (Free)',
  'ticketed': 'Ticketed Event',
  'premium': 'Premium Event'
};

export const ReviewStepWizard = ({ 
  form, 
  eventType, 
  selectedCategories, 
  uploadedImages,
  onSave,
  isSaving
}: ReviewStepWizardProps) => {
  const formData = form.getValues();

  // Use timezone-aware date formatting from dateUtils

  const handleSaveDraft = () => {
    onSave('draft');
  };

  const handlePublish = () => {
    onSave('published');
  };

  // Check if Premium event has all requirements
  const isPremiumReady = eventType === 'premium' && 
    formData.venueImageUrl && 
    formData.seats && formData.seats.length > 0 &&
    formData.seatCategories && formData.seatCategories.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">Review & Publish</h2>
        <p className="text-sm text-muted-foreground">
          Review your event details and publish when ready
        </p>
      </div>

      {/* Ready to Go Alert for Premium Events */}
      {eventType === 'premium' && isPremiumReady && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircleIcon className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>🎉 Ready to Go!</strong> Your premium event is fully configured with venue layout, 
            ticket types, and seating chart. You can now publish your event or save it as a draft.
          </AlertDescription>
        </Alert>
      )}

      {/* Warning if Premium event is missing requirements */}
      {eventType === 'premium' && !isPremiumReady && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircleIcon className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Configuration Incomplete:</strong> Please complete the venue configuration step 
            (upload venue, create tickets, and place seats) before publishing.
          </AlertDescription>
        </Alert>
      )}

      {/* Event Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{formData.title}</CardTitle>
            <Badge variant={eventType === 'simple' ? 'secondary' : eventType === 'premium' ? 'default' : 'outline'}>
              {eventTypeLabels[eventType] || 'Unknown'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{formData.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{formatEventDate(formData.date)}</div>
                <div className="text-sm text-muted-foreground">
                  {formatEventTime(formData.time)}
                  {formData.endDate && formData.endTime && (
                    <span> - {formData.endDate === formData.date ? formatEventTime(formData.endTime) : `${formatEventDate(formData.endDate)} ${formatEventTime(formData.endTime)}`}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Location</div>
                <div className="text-sm text-muted-foreground">{formData.address}</div>
              </div>
            </div>

            {formData.organizationName && (
              <div className="flex items-center gap-2">
                <BuildingIcon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Organizer</div>
                  <div className="text-sm text-muted-foreground">{formData.organizationName}</div>
                </div>
              </div>
            )}

            {formData.capacity && (
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Capacity</div>
                  <div className="text-sm text-muted-foreground">{formData.capacity} attendees</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      {selectedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TagIcon className="w-5 h-5" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map(categoryId => (
                <Badge key={categoryId} variant="secondary">
                  {categoryLabels[categoryId] || categoryId}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Images */}
      {(uploadedImages.banner || uploadedImages.postcard) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Event Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadedImages.banner && (
                <div>
                  <h4 className="font-medium mb-2">Banner Image</h4>
                  <img
                    src={uploadedImages.banner.thumbnail}
                    alt="Event banner"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadedImages.banner.metadata.dimensions.width}x{uploadedImages.banner.metadata.dimensions.height} • 
                    {uploadedImages.banner.metadata.compressionRatio}% compressed
                  </p>
                </div>
              )}
              {uploadedImages.postcard && (
                <div>
                  <h4 className="font-medium mb-2">Postcard Image</h4>
                  <img
                    src={uploadedImages.postcard.thumbnail}
                    alt="Event postcard"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadedImages.postcard.metadata.dimensions.width}x{uploadedImages.postcard.metadata.dimensions.height} • 
                    {uploadedImages.postcard.metadata.compressionRatio}% compressed
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Event Configuration Summary */}
      {eventType === 'premium' && formData.seats && formData.seatCategories && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BuildingIcon className="w-5 h-5" />
              Premium Venue Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Seats</p>
                <p className="text-lg font-medium">{formData.seats.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Categories</p>
                <p className="text-lg font-medium">{formData.seatCategories.length}</p>
              </div>
              {formData.seats.some((s: any) => s.isAccessible) && (
                <div>
                  <p className="text-sm text-muted-foreground">Accessible Seats</p>
                  <p className="text-lg font-medium">
                    {formData.seats.filter((s: any) => s.isAccessible).length}
                  </p>
                </div>
              )}
              {formData.seats.some((s: any) => s.tableId) && (
                <div>
                  <p className="text-sm text-muted-foreground">Tables</p>
                  <p className="text-lg font-medium">
                    {new Set(formData.seats.filter((s: any) => s.tableId).map((s: any) => s.tableId)).size}
                  </p>
                </div>
              )}
            </div>
            {formData.venueImageUrl && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Venue Layout</p>
                <img
                  src={formData.venueImageUrl}
                  alt="Venue layout"
                  className="w-full max-h-48 object-contain rounded-lg border"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Display Price for Simple Events */}
      {eventType === 'simple' && formData.displayPrice && formData.displayPrice.amount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSignIcon className="w-5 h-5" />
              Display Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">${formData.displayPrice.amount}</span>
              <span className="text-muted-foreground">({formData.displayPrice.label})</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              This is a display price only - no payment processing for simple events
            </p>
          </CardContent>
        </Card>
      )}

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Event Visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {formData.isPublic ? (
              <>
                <EyeIcon className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">Public Event</span>
                <span className="text-muted-foreground">- Will appear in search results and event listings</span>
              </>
            ) : (
              <>
                <EyeIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">Private Event</span>
                <span className="text-muted-foreground">- Only accessible via direct link</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Check - Different message for Premium events */}
      {eventType === 'premium' && isPremiumReady ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              Premium Event Ready!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-green-700">
            <p className="mb-3">Your premium event is fully configured and ready to go live. You have:</p>
            <ul className="list-disc list-inside space-y-1 mb-4">
              <li>Uploaded venue layout image</li>
              <li>Created {formData.seatCategories?.length || 0} ticket categories</li>
              <li>Placed {formData.seats?.length || 0} seats on the seating chart</li>
              <li>Configured accessible seating options</li>
            </ul>
            <p className="font-medium">You can now publish your event or save it as a draft to make changes later.</p>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <CheckCircleIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Ready to publish!</strong> All required information has been provided. 
            You can save as draft to continue editing later, or publish to make your event live.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <SaveIcon className="w-4 h-4" />
              Save as Draft
            </>
          )}
        </Button>
        
        <Button
          type="button"
          onClick={handlePublish}
          disabled={isSaving || (eventType === 'premium' && !isPremiumReady)}
          className={`flex items-center gap-2 min-w-[140px] ${
            eventType === 'premium' && isPremiumReady ? 'bg-green-600 hover:bg-green-700' : ''
          }`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <EyeIcon className="w-4 h-4" />
              Publish Event
            </>
          )}
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          💡 <strong>Tip:</strong> You can always edit your event details after publishing from your dashboard.
        </p>
      </div>
    </div>
  );
};