
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Your Gateway to
            <span className="text-primary block mt-2">Amazing Events</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover, create, and attend events that matter to you. From simple meetups to premium experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/events">
              <Button size="lg" className="px-8 py-4 text-lg">
                Browse Events
              </Button>
            </Link>
            <Link to="/create-event">
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
                Create Event
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Stepperslife?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <CalendarIcon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Easy Event Creation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Create simple meetups, ticketed events, or premium seated experiences with our intuitive wizard.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <UsersIcon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Community Focused</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Connect with like-minded people and build lasting relationships through shared experiences.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <MapPinIcon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Local & Global</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Discover events in your area or join virtual experiences from anywhere in the world.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-8">Get in Touch</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div>
              <h3 className="font-semibold mb-2">Contact Information</h3>
              <p className="text-muted-foreground">office@stepperslife.com</p>
              <p className="text-muted-foreground">404-668-2401</p>
              <p className="text-muted-foreground">251 Little Fall Dr., Wilmington, Delaware 19808</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Follow Us</h3>
              <div className="flex justify-center gap-4">
                <a href="https://www.facebook.com/profile.php?id=61576847294475" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">Facebook</Button>
                </a>
                <a href="https://www.instagram.com/stepperslife1" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">Instagram</Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
