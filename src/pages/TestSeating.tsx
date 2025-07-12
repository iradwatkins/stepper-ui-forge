import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createDemoSeatingEvent } from '@/utils/createDemoSeatingEvent';
import { Loader2, CheckCircle, Armchair, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function TestSeating() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [demoEventId, setDemoEventId] = useState<string | null>(null);

  const handleCreateDemo = async () => {
    if (!user) {
      toast.error("Please sign in to create a demo event");
      navigate('/auth/login');
      return;
    }

    setIsCreating(true);
    try {
      const event = await createDemoSeatingEvent(user.id);
      setDemoEventId(event.id);
      toast.success("Demo event created successfully!");
      
      // Navigate to the event page after a short delay
      setTimeout(() => {
        navigate(`/events/${event.id}`);
      }, 2000);
    } catch (error) {
      console.error('Error creating demo:', error);
      toast.error("Failed to create demo event. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Interactive Table Seating System
          </h1>
          <p className="text-lg text-muted-foreground">
            Experience our event hall table reservations with real-time seat availability
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Armchair className="w-5 h-5" />
                For Event Organizers
              </CardTitle>
              <CardDescription>
                Create interactive seating layouts for your venues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Visual table layout designer</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Multiple table categories with pricing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>VIP tables with premium amenities</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Wheelchair accessible table options</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Revenue analytics by table type</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                For Attendees
              </CardTitle>
              <CardDescription>
                Select your perfect seats with ease
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Interactive table and chair selection</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Real-time table availability updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>15-minute table reservation holds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Zoom & pan with touch support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Smart table and chair grouping</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Try It Out!</CardTitle>
            <CardDescription>
              Create a demo event to experience the interactive seating system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTitle>Demo Event Features</AlertTitle>
              <AlertDescription>
                The demo will create a gala dinner event with:
                <ul className="mt-2 ml-4 list-disc text-sm">
                  <li>6 tables with 24 total seats across 3 pricing tiers</li>
                  <li>1 VIP table with champagne service ($100/seat)</li>
                  <li>2 wheelchair accessible tables ($100/seat)</li>
                  <li>4 regular dining tables ($75/seat)</li>
                  <li>November 7th, 2025 event date</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col items-center gap-4">
              {!demoEventId ? (
                <Button
                  size="lg"
                  onClick={handleCreateDemo}
                  disabled={isCreating}
                  className="w-full md:w-auto"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Demo Event...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Create Demo Table Seating Event
                    </>
                  )}
                </Button>
              ) : (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-6 h-6" />
                    <span className="text-lg font-semibold">Demo Event Created!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Redirecting you to the event page...
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Note: Interactive table seating is only available for Premium events.
            <br />
            When creating your own events, select "Premium" as the event type.
          </p>
        </div>
      </div>
    </div>
  );
}