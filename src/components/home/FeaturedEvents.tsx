import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Calendar, MapPin, Clock } from "lucide-react";

export function FeaturedEvents() {
  // Filter out past events
  const allEvents = [
    {
      image: "/lovable-uploads/d2c906eb-d210-4ea5-9f2a-a4541ecce215.png",
      title: "Annual Step Championship",
      date: "June 15, 2025",
      location: "Chicago, IL",
      time: "6:00 PM",
      id: "event-1"
    },
    {
      image: "/lovable-uploads/57af8e89-b2a5-4ec1-b145-021863925527.png",
      title: "Cultural Dance Showcase",
      date: "July 8, 2025",
      location: "Atlanta, GA",
      time: "7:30 PM",
      id: "event-2"
    },
    {
      image: "/lovable-uploads/40b545ff-7f41-48d9-abe4-b3999e7fbb1b.png",
      title: "Summer Step Festival",
      date: "August 22, 2025",
      location: "New York, NY",
      time: "5:00 PM",
      id: "event-3"
    }
  ];

  // Only show future events
  const currentDate = new Date();
  const featuredEvents = allEvents.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= currentDate;
  });

  // Don't render section if no future events
  if (featuredEvents.length === 0) {
    return null;
  }

  return (
    <div className="bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Upcoming Events</h2>
          <Link to="/events">
            <Button variant="outline">View All Events</Button>
          </Link>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredEvents.map((event, index) => (
            <Card key={index} className="overflow-hidden transition-transform hover:scale-105">
              <div className="aspect-video w-full overflow-hidden">
                <img 
                  src={event.image} 
                  alt={event.title} 
                  className="w-full h-full object-cover object-center"
                />
              </div>
              
              <CardHeader>
                <h3 className="font-bold text-xl">{event.title}</h3>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{event.date}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{event.location}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{event.time}</span>
                </div>
              </CardContent>
              
              <CardFooter>
                <Link to={`/events/${event.id}`} className="w-full">
                  <Button className="w-full">View Details</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}