import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, UsersIcon, DollarSignIcon, BuildingIcon } from "lucide-react";

interface EventType {
  id: 'simple' | 'ticketed' | 'premium';
  title: string;
}

interface EventData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  organizationName?: string;
  capacity?: number;
  displayPrice?: {
    amount: number;
    label: string;
  };
  isPublic?: boolean;
  endDate?: string;
  endTime?: string;
  images?: string[];
  tickets: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

interface ReviewStepProps {
  eventData: EventData;
  eventType: EventType['id'] | "";
  eventTypes: EventType[];
}

export const ReviewStep = ({ eventData, eventType, eventTypes }: ReviewStepProps) => {
  console.log("ReviewStep rendering with eventData:", eventData);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Review & Publish</h2>
        <p className="text-muted-foreground">Review your event details before publishing</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BuildingIcon className="w-5 h-5" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-medium mb-2">{eventData.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{eventData.description}</p>
            </div>

            {eventData.organizationName && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Organized by</h4>
                <p className="text-sm">{eventData.organizationName}</p>
              </div>
            )}

            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Event Type</h4>
              <Badge className={
                eventType === "simple" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                eventType === "ticketed" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
              }>
                {eventTypes.find(t => t.id === eventType)?.title}
              </Badge>
            </div>

            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Categories</h4>
              <div className="flex flex-wrap gap-1">
                {eventData.category.split(', ').map((cat, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            {eventData.displayPrice && eventType === 'simple' && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Display Price</h4>
                <div className="flex items-center gap-2">
                  <DollarSignIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {eventData.displayPrice.label}: ${eventData.displayPrice.amount}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date, Time & Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Schedule & Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Date & Time</h4>
              <div className="space-y-1">
                <p className="text-sm">
                  <strong>Start:</strong> {formatDate(eventData.date)} at {formatTime(eventData.time)}
                </p>
                {eventData.endDate && eventData.endTime && (
                  <p className="text-sm">
                    <strong>End:</strong> {formatDate(eventData.endDate)} at {formatTime(eventData.endTime)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Location</h4>
              <div className="flex items-start gap-2">
                <MapPinIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm">{eventData.location}</p>
              </div>
            </div>

            {eventData.capacity && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Capacity</h4>
                <div className="flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{eventData.capacity} attendees</span>
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Visibility</h4>
              <Badge variant={eventData.isPublic ? "default" : "secondary"}>
                {eventData.isPublic ? "Public" : "Private"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Images Preview */}
      {eventData.images && eventData.images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Event Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {eventData.images.map((image, index) => (
                <div key={index} className="aspect-video overflow-hidden rounded-lg border">
                  <img
                    src={image}
                    alt={`Event image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets Section - Only for Ticketed and Premium Events */}
      {eventType !== "simple" && eventData.tickets && eventData.tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSignIcon className="w-5 h-5" />
              Ticket Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventData.tickets.map((ticket, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{ticket.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {ticket.quantity} tickets available
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">${ticket.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};
