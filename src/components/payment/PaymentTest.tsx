// PaymentTest component disabled for production mode
// This component was used for testing payment integrations
// and has been replaced with production payment flows

export default function PaymentTest() {
  return (
    <div className="text-center p-8">
      <h2 className="text-2xl font-bold mb-4">Payment Testing Disabled</h2>
      <p className="text-muted-foreground">
        Payment testing is disabled in production mode.
      </p>
    </div>
  )
}