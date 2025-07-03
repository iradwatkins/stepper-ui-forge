// Simplified EditEvent page for production
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function EditEvent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link to="/dashboard/events">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Events
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-4 text-foreground">Edit Event</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Event editing is being rebuilt for production
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Editing</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The event editing functionality is being rebuilt for production deployment. 
                Please check back soon.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6">
              <Link to="/dashboard/events">
                <Button>Return to My Events</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}