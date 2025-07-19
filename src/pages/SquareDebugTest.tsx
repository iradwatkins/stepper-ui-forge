import { SquareDebugComponent } from '@/components/payment/SquareDebugComponent';

export default function SquareDebugTest() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Square Payment Configuration Debug</h1>
      <SquareDebugComponent />
    </div>
  );
}