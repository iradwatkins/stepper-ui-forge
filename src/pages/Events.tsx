
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, MapPinIcon, CalendarIcon, UsersIcon } from "lucide-react";
import { Link } from "react-router-dom";

const Events = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", label: "All Events" },
    { id: "workshops", label: "Workshops" },
    { id: "sets", label: "Sets" },
    { id: "meetups", label: "Meetups" },
    { id: "conferences", label: "Conferences" },
  ];

  const mockEvents = [
    {
      id: 1,
      title: "React Workshop: Building Modern Apps",
      description: "Learn the latest React patterns and best practices",
      date: "2024-07-15",
      time: "10:00 AM",
      location: "Downtown Tech Hub",
      price: "$75",
      category: "workshops",
      attendees: 45,
      image: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=200&fit=crop",
      type: "ticketed"
    },
    {
      id: 2,
      title: "Summer Music Set",
      description: "Enjoy live music from local artists",
      date: "2024-07-20",
      time: "7:00 PM",
      location: "Riverside Park",
      price: "Free",
      category: "sets",
      attendees: 120,
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop",
      type: "simple"
    },
    {
      id: 3,
      title: "Tech Entrepreneurs Meetup",
      description: "Network with fellow entrepreneurs and share ideas",
      date: "2024-07-25",
      time: "6:00 PM",
      location: "Innovation Center",
      price: "$25",
      category: "meetups",
      attendees: 80,
      image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=200&fit=crop",
      type: "ticketed"
    },
    {
      id: 4,
      title: "Premium Design Conference",
      description: "Exclusive conference with industry leaders",
      date: "2024-08-01",
      time: "9:00 AM",
      location: "Grand Convention Center",
      price: "$299",
      category: "conferences",
      attendees: 200,
      image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&h=200&fit=crop",
      type: "premium"
    },
  ];

  const filteredEvents = mockEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "simple": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "ticketed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "premium": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Discover Events</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Find amazing events happening near you
        </p>

        {/* Search Bar */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              className="rounded-full"
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <Link key={event.id} to={`/events/${event.id}`}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="aspect-video overflow-hidden">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge className={getEventTypeColor(event.type)}>
                    {event.type}
                  </Badge>
                  <span className="text-lg font-bold text-primary">{event.price}</span>
                </div>
                <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {event.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{event.date} at {event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" />
                    <span>{event.attendees} attending</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground">No events found matching your criteria.</p>
          <Link to="/create-event">
            <Button className="mt-4">Create Your Own Event</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Events;
