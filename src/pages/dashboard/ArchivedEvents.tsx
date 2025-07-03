// Simplified ArchivedEvents page for production
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ArchivedEvents() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Archived Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Archived events functionality is being rebuilt for production.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}