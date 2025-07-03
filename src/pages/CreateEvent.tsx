// Simplified CreateEvent page for production
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function CreateEvent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Create Event</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Event creation is being rebuilt for production
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Creation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The event creation wizard is being rebuilt for production deployment. 
                Please check back soon.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6">
              <Link to="/dashboard">
                <Button>Return to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}