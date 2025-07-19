import { CashAppPayDiagnostic } from '@/components/payment/CashAppPayDiagnostic';

export default function CashAppDiagnostic() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Cash App Pay Configuration Test</h1>
      <CashAppPayDiagnostic />
    </div>
  );
}