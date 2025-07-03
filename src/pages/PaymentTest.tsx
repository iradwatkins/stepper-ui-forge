// PaymentTest page simplified for production
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentTest() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Payment testing is disabled in production mode. 
            Use the checkout flow in events to test payments.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}