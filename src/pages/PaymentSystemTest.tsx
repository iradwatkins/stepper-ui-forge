import React, { useState, Suspense } from 'react';
import { PaymentProvider, CreditCardPayment, PaymentModal, PaymentErrorBoundary } from '../modules/payments';
import { PaymentResult } from '../modules/payments/types';
import { formatCurrency } from '../modules/payments/utils/paymentValidator';
import { Loader2, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

const PaymentSystemTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testAmount, setTestAmount] = useState(10.00);
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  
  // Square configuration
  const squareConfig = {
    appId: environment === 'sandbox' 
      ? 'sandbox-sq0idb-A5J5J5J5J5J5J5J5J5J5JA' // Example sandbox app ID
      : process.env.REACT_APP_SQUARE_APP_ID || '',
    locationId: environment === 'sandbox'
      ? 'LH2G2G2G2G2G2G2G2G2G2G2G2G' // Example sandbox location ID
      : process.env.REACT_APP_SQUARE_LOCATION_ID || '',
    environment
  };

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    setLogs(prev => [logEntry, ...prev].slice(0, 100)); // Keep last 100 logs
    console.log(logEntry);
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  const stopAllTimers = () => {
    let count = 0;
    for (let i = 1; i < 9999; i++) {
      if (clearInterval(i)) count++;
      if (clearTimeout(i)) count++;
    }
    addLog(`Cleared ${count} timers and intervals`, 'warning');
  };

  const handlePaymentSuccess = (result: PaymentResult) => {
    addLog(`Payment successful! Token: ${result.token?.substring(0, 20)}...`, 'success');
    addLog(`Transaction ID: ${result.transactionId}`, 'success');
  };

  const handlePaymentError = (error: string) => {
    addLog(`Payment failed: ${error}`, 'error');
  };

  const testDirectPayment = () => {
    addLog('Starting direct payment test', 'info');
  };

  const testModalPayment = () => {
    addLog('Opening payment modal', 'info');
    setIsModalOpen(true);
  };

  const reloadPage = () => {
    addLog('Reloading page...', 'warning');
    window.location.reload();
  };

  const getLogIcon = (logEntry: string) => {
    if (logEntry.includes('SUCCESS:')) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (logEntry.includes('ERROR:')) return <XCircle className="w-4 h-4 text-red-500" />;
    if (logEntry.includes('WARNING:')) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <div className="w-4 h-4 rounded-full bg-blue-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Payment System Test Environment
        </h1>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Test Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            
            <div className="space-y-4">
              {/* Environment Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as 'sandbox' | 'production')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Production</option>
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Amount
                </label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
                  min="0.50"
                  max="999999.99"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={testDirectPayment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Test Direct Payment
                </button>
                
                <button
                  onClick={testModalPayment}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Test Payment Modal
                </button>

                <button
                  onClick={stopAllTimers}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Stop All Timers
                </button>

                <button
                  onClick={reloadPage}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Reload Page
                </button>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">System Status</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Environment:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  environment === 'sandbox' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {environment}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Test Amount:</span>
                <span className="font-medium">{formatCurrency(testAmount)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Square App ID:</span>
                <span className="font-mono text-sm text-gray-500">
                  {squareConfig.appId ? `${squareConfig.appId.substring(0, 15)}...` : 'Not configured'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Location ID:</span>
                <span className="font-mono text-sm text-gray-500">
                  {squareConfig.locationId ? `${squareConfig.locationId.substring(0, 15)}...` : 'Not configured'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Test Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Direct Payment Test */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Direct Payment Test</h3>
              <p className="text-gray-600 text-sm mt-1">
                Test the payment component directly without modal
              </p>
            </div>
            
            <div className="p-6">
              <PaymentProvider>
                <PaymentErrorBoundary>
                  <Suspense fallback={
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  }>
                    <CreditCardPayment
                      amount={testAmount}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                      title="Test Payment"
                      description={`Testing payment for ${formatCurrency(testAmount)}`}
                    />
                  </Suspense>
                </PaymentErrorBoundary>
              </PaymentProvider>
            </div>
          </div>

          {/* Logs Panel */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">System Logs</h3>
              <button
                onClick={clearLogs}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Clear Logs
              </button>
            </div>
            
            <div className="h-96 overflow-y-auto p-4">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center">No logs yet...</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      {getLogIcon(log)}
                      <pre className="flex-1 font-mono text-xs text-gray-800 whitespace-pre-wrap break-all">
                        {log}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Modal Test */}
        <PaymentProvider>
          <PaymentModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              addLog('Payment modal closed', 'info');
            }}
            amount={testAmount}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            title="Modal Payment Test"
            description={`Testing modal payment for ${formatCurrency(testAmount)}`}
          />
        </PaymentProvider>
      </div>
    </div>
  );
};

export default PaymentSystemTest;