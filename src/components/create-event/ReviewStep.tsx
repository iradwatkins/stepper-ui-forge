
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon } from "lucide-react";

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
  onPrevious: () => void;
  onPublish: () => void;
}

export const ReviewStep = ({ eventData, eventType, eventTypes, onPrevious, onPublish }: ReviewStepProps) => {
  console.log("ReviewStep rendering with eventData:", eventData);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Review & Publish</h2>
        <p className="text-muted-foreground">Review your event and publish it</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-xl font-medium mb-2">{eventData.title}</h3>
            <p className="text-muted-foreground">{eventData.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span>{eventData.date} at {eventData.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4" />
              <span>{eventData.location}</span>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Event Type</h4>
            <Badge className={
              eventType === "simple" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
              eventType === "ticketed" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
              "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
            }>
              {eventTypes.find(t => t.id === eventType)?.title}
            </Badge>
          </div>

          {eventType !== "simple" && (
            <div>
              <h4 className="font-medium mb-2">Tickets</h4>
              <div className="space-y-2">
                {eventData.tickets.map((ticket, index) => (
                  <div key={index} className="flex justify-between items-center p-2 border rounded">
                    <span>{ticket.name}</span>
                    <span>${ticket.price} ({ticket.quantity} available)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Back
        </Button>
        <Button className="px-8" onClick={onPublish}>
          Publish Event
        </Button>
      </div>
    </div>
  );
};
