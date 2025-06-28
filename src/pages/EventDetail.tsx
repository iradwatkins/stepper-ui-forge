
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, MapPinIcon, UsersIcon, ShareIcon, HeartIcon } from "lucide-react";
import { useParams } from "react-router-dom";
import CheckoutModal from "@/components/CheckoutModal";

const EventDetail = () => {
  const { id } = useParams();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Mock event data - in real app this would come from API
  const event = {
    id: 1,
    title: "React Workshop: Building Modern Apps",
    description: "Join us for an intensive workshop on building modern React applications. We'll cover the latest patterns, hooks, state management, and best practices that will help you build scalable and maintainable applications.",
    fullDescription: `This comprehensive workshop is designed for developers who want to master React development. 

What you'll learn:
• Modern React patterns and best practices
• Advanced hooks and custom hook development
• State management with Context API and Zustand
• Performance optimization techniques
• Testing strategies for React components
• Building responsive and accessible interfaces

Prerequisites:
• Basic knowledge of JavaScript
• Familiarity with HTML/CSS
• Basic React knowledge helpful but not required

What's included:
• 6 hours of hands-on training
• Workshop materials and code samples
• Certificate of completion
• Networking lunch
• Follow-up support for 30 days`,
    date: "2024-07-15",
    time: "10:00 AM - 4:00 PM",
    location: "Downtown Tech Hub, 123 Innovation Ave",
    price: 75,
    category: "workshops",
    attendees: 45,
    maxAttendees: 60,
    image: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&h=400&fit=crop",
    type: "ticketed",
    organizer: {
      name: "Tech Learning Hub",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
    },
    tags: ["React", "JavaScript", "Web Development", "Workshop"]
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "simple": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "ticketed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "premium": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-80 md:h-96 overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="container mx-auto">
            <Badge className={`${getEventTypeColor(event.type)} mb-2`}>
              {event.type}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.title}</h1>
            <p className="text-lg opacity-90">{event.description}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Info */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{event.date}</p>
                    <p className="text-sm text-muted-foreground">{event.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPinIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UsersIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{event.attendees} / {event.maxAttendees} attending</p>
                    <p className="text-sm text-muted-foreground">{event.maxAttendees - event.attendees} spots remaining</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-line">{event.fullDescription}</p>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  ${event.price}
                  <span className="text-base font-normal text-muted-foreground ml-2">per ticket</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  Buy Tickets
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <HeartIcon className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <ShareIcon className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Organizer Card */}
            <Card>
              <CardHeader>
                <CardTitle>Organizer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <img
                    src={event.organizer.avatar}
                    alt={event.organizer.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium">{event.organizer.name}</p>
                    <p className="text-sm text-muted-foreground">Event Organizer</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Contact Organizer
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        event={event}
      />
    </div>
  );
};

export default EventDetail;
