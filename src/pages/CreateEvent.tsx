
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, UsersIcon, DollarSignIcon, CheckIcon } from "lucide-react";

const CreateEvent = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [eventType, setEventType] = useState("");
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    category: "",
    tickets: [{ name: "General Admission", price: 0, quantity: 100 }]
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const eventTypes = [
    {
      id: "simple",
      title: "Simple Meetup",
      description: "Free events for community gatherings",
      icon: <UsersIcon className="w-8 h-8" />,
      features: ["Free to attend", "Basic event info", "RSVP tracking"]
    },
    {
      id: "ticketed",
      title: "Ticketed Event",
      description: "Paid events with ticket sales",
      icon: <DollarSignIcon className="w-8 h-8" />,
      features: ["Paid tickets", "Multiple ticket tiers", "Payment processing"]
    },
    {
      id: "premium",
      title: "Premium Seated",
      description: "High-end events with reserved seating",
      icon: <MapPinIcon className="w-8 h-8" />,
      features: ["Reserved seating", "Premium pricing", "VIP options"]
    }
  ];

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addTicketTier = () => {
    setEventData(prev => ({
      ...prev,
      tickets: [...prev.tickets, { name: "", price: 0, quantity: 0 }]
    }));
  };

  const removeTicketTier = (index: number) => {
    setEventData(prev => ({
      ...prev,
      tickets: prev.tickets.filter((_, i) => i !== index)
    }));
  };

  const updateTicketTier = (index: number, field: string, value: string | number) => {
    setEventData(prev => ({
      ...prev,
      tickets: prev.tickets.map((ticket, i) => 
        i === index ? { ...ticket, [field]: value } : ticket
      )
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Create Your Event</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Follow the steps below to create your event
        </p>
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Step 1: Event Type Selection */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Select Event Type</h2>
            <p className="text-muted-foreground">Choose the type of event you want to create</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {eventTypes.map((type) => (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all ${
                  eventType === type.id ? 'ring-2 ring-primary' : 'hover:shadow-lg'
                }`}
                onClick={() => setEventType(type.id)}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    {type.icon}
                  </div>
                  <CardTitle>{type.title}</CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {type.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckIcon className="w-4 h-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={nextStep} disabled={!eventType}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Basic Information */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Event Information</h2>
            <p className="text-muted-foreground">Tell us about your event</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  placeholder="Enter event title"
                  value={eventData.title}
                  onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your event"
                  value={eventData.description}
                  onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={eventData.date}
                    onChange={(e) => setEventData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={eventData.time}
                    onChange={(e) => setEventData(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Event location"
                  value={eventData.location}
                  onChange={(e) => setEventData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep} disabled={!eventData.title || !eventData.date}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Ticketing */}
      {currentStep === 3 && eventType !== "simple" && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Ticket Configuration</h2>
            <p className="text-muted-foreground">Set up your ticket tiers and pricing</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ticket Tiers</CardTitle>
              <CardDescription>Configure different ticket types for your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {eventData.tickets.map((ticket, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`ticket-name-${index}`}>Ticket Name</Label>
                      <Input
                        id={`ticket-name-${index}`}
                        placeholder="General Admission"
                        value={ticket.name}
                        onChange={(e) => updateTicketTier(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`ticket-price-${index}`}>Price ($)</Label>
                      <Input
                        id={`ticket-price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={ticket.price}
                        onChange={(e) => updateTicketTier(index, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`ticket-quantity-${index}`}>Quantity</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`ticket-quantity-${index}`}
                          type="number"
                          min="1"
                          value={ticket.quantity}
                          onChange={(e) => updateTicketTier(index, 'quantity', parseInt(e.target.value) || 0)}
                        />
                        {eventData.tickets.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTicketTier(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addTicketTier} className="w-full">
                Add Ticket Tier
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 for Simple Events (Skip Ticketing) */}
      {currentStep === 3 && eventType === "simple" && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Almost Done!</h2>
            <p className="text-muted-foreground">Review your event details</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Event Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">{eventData.title}</h3>
                <p className="text-muted-foreground">{eventData.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span>{eventData.date} at {eventData.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4" />
                <span>{eventData.location}</span>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Free Event
              </Badge>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Publish */}
      {currentStep === 4 && (
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
            <Button variant="outline" onClick={prevStep}>
              Back
            </Button>
            <Button className="px-8">
              Publish Event
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateEvent;
