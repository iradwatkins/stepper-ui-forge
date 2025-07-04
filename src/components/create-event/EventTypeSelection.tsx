
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckIcon, UsersIcon, TrendingUpIcon, CrownIcon } from "lucide-react";

interface EventType {
  id: 'simple' | 'ticketed' | 'premium';
  title: string;
  description: string;
  icon: React.ReactNode;
  price: string;
  features: string[];
  limitations?: string[];
  nextSteps: string[];
  upgrade?: {
    to: string;
    benefits: string[];
  };
}

interface EventTypeSelectionProps {
  eventType: EventType['id'] | "";
  setEventType: (type: EventType['id']) => void;
}

const eventTypes: EventType[] = [
  {
    id: "simple",
    title: "Simple Events",
    description: "Perfect for community gatherings and free events",
    icon: <UsersIcon className="w-8 h-8 text-blue-600" />,
    price: "Free",
    features: [
      "Basic event information",
      "Free to attend",
      "RSVP tracking",
      "Email notifications",
      "Basic event page"
    ],
    limitations: [
      "No paid ticketing",
      "No seating charts",
      "Basic features only"
    ],
    nextSteps: [
      "Event details",
      "Review & publish"
    ],
    upgrade: {
      to: "Ticketed",
      benefits: ["Add paid tickets", "Multiple pricing tiers", "Payment processing"]
    }
  },
  {
    id: "ticketed",
    title: "Ticketed Events",
    description: "Ideal for paid events with multiple ticket options",
    icon: <TrendingUpIcon className="w-8 h-8 text-green-600" />,
    price: "Platform Fee",
    features: [
      "All Simple Event features",
      "Paid ticketing system",
      "Multiple ticket types",
      "Payment processing (PayPal, Square, Cash App)",
      "QR code check-in system",
      "Ticket validation",
      "Sales analytics",
      "Team member assignments",
      "Discount codes"
    ],
    limitations: [
      "No custom seating charts",
      "No advanced team management"
    ],
    nextSteps: [
      "Event details",
      "Ticket configuration",
      "Review & publish"
    ],
    upgrade: {
      to: "Premium",
      benefits: ["Interactive seating charts", "Advanced team management", "Custom branding"]
    }
  },
  {
    id: "premium",
    title: "Premium Events",
    description: "Full-featured platform for professional events",
    icon: <CrownIcon className="w-8 h-8 text-purple-600" />,
    price: "Full Features",
    features: [
      "All Ticketed Event features",
      "Interactive seating charts",
      "Team management & roles",
      "QR code check-in system",
      "Advanced analytics",
      "Premium support",
      "Custom branding",
      "Bulk operations"
    ],
    nextSteps: [
      "Event details",
      "Ticket configuration",
      "Seating setup",
      "Review & publish"
    ]
  }
];

export const EventTypeSelection = ({ eventType, setEventType }: EventTypeSelectionProps) => {
  console.log("EventTypeSelection rendering with eventType:", eventType);

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">Select Event Type</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the type of event you want to create. You can always upgrade to unlock more features later.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
        {eventTypes.map((type) => {
          const isSelected = eventType === type.id;
          return (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 relative ${
                isSelected 
                  ? 'ring-2 ring-primary shadow-lg scale-105 bg-primary/5' 
                  : 'hover:shadow-lg border-border'
              }`}
              onClick={() => {
                console.log("Selected event type:", type.id);
                setEventType(type.id);
              }}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center z-10">
                  <CheckIcon className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors ${
                  isSelected ? 'bg-primary/20' : 'bg-muted/50'
                }`}>
                  {type.icon}
                </div>
                <CardTitle className="text-xl mb-2">{type.title}</CardTitle>
                <Badge variant={isSelected ? "default" : "secondary"} className="mb-2">
                  {type.price}
                </Badge>
                <CardDescription className="text-sm leading-relaxed">
                  {type.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-foreground">Included Features:</h4>
                    <ul className="space-y-1.5">
                      {type.features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckIcon className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground leading-tight">{feature}</span>
                        </li>
                      ))}
                      {type.features.length > 4 && (
                        <li className="text-xs text-muted-foreground ml-5">
                          +{type.features.length - 4} more features
                        </li>
                      )}
                    </ul>
                  </div>

                  {isSelected && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-foreground mb-1">Next steps:</p>
                      <div className="flex flex-wrap gap-1">
                        {type.nextSteps.map((step, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {step}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Need help choosing? All plans can be upgraded later.
        </p>
        {eventType && (
          <p className="text-sm text-primary font-medium mt-2">
            ✓ Selected: {eventTypes.find(t => t.id === eventType)?.title}
          </p>
        )}
      </div>
    </div>
  );
};
