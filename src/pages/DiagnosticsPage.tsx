import React from 'react';
import { EnvDiagnostics } from '@/components/payment/EnvDiagnostics';

export default function DiagnosticsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-8">Payment System Diagnostics</h1>
      <EnvDiagnostics />
    </div>
  );
}