// Simplified Cash Payment Dashboard for production
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CashPaymentDashboard() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Cash Payment Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Cash payment functionality is being rebuilt for production.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}