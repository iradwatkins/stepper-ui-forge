// Simplified MyTickets page for production
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function MyTickets() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>My Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your purchased tickets will appear here. 
            This feature is being rebuilt for production.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}