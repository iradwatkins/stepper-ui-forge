import React, { useId } from 'react';
import { PaymentProps } from '../types';
import { usePaymentForm } from '../hooks/usePaymentForm';
import { formatCurrency } from '../utils/paymentValidator';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';

interface CreditCardPaymentProps extends PaymentProps {
  title?: string;
  description?: string;
}

/**
 * Simplified Credit Card Payment Component
 * - Isolated from auth state changes
 * - Uses singleton pattern for Square SDK
 * - Includes proper error handling and retry logic
 */
export const CreditCardPayment: React.FC<CreditCardPaymentProps> = ({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  className = '',
  title = 'Credit Card Payment',
  description
}) => {
  const containerId = useId().replace(/:/g, '');
  const formattedAmount = formatCurrency(amount, currency);

  const {
    state,
    processPayment,
    reset,
    isReady,
    isProcessing,
    hasError
  } = usePaymentForm({
    containerId,
    amount,
    onSuccess,
    onError
  });

  const handlePayment = async () => {
    if (disabled || !isReady) return;
    await processPayment();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const getStatusMessage = () => {
    switch (state.status) {
      case 'initializing':
        return 'Initializing payment form...';
      case 'processing':
        return 'Processing payment...';
      case 'success':
        return 'Payment successful!';
      case 'error':
        return state.error || 'Payment failed';
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case 'initializing':
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'ready':
        return <CreditCard className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`payment-container bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-gray-600 text-sm">
            {description}
          </p>
        )}
        <div className="text-2xl font-bold text-gray-900 mt-2">
          {formattedAmount}
        </div>
      </div>

      {/* Status Message */}
      {state.status !== 'ready' && (
        <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            {getStatusIcon()}
            <span className={`${hasError ? 'text-red-600' : 'text-gray-600'}`}>
              {getStatusMessage()}
            </span>
          </div>
        </div>
      )}

      {/* Payment Form Container */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div 
          id={containerId}
          className={`
            min-h-[50px] p-3 border border-gray-300 rounded-lg
            ${!isReady ? 'bg-gray-50' : 'bg-white'}
            ${hasError ? 'border-red-300' : 'border-gray-300'}
          `}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handlePayment}
          disabled={disabled || !isReady || isProcessing}
          className={`
            flex-1 px-4 py-3 rounded-lg font-medium transition-colors
            ${isReady && !disabled && !isProcessing
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </div>
          ) : (
            `Pay ${formattedAmount}`
          )}
        </button>

        {onCancel && (
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}

        {hasError && (
          <button
            onClick={reset}
            disabled={isProcessing}
            className="px-4 py-3 border border-blue-300 rounded-lg font-medium text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Retry
          </button>
        )}
      </div>

      {/* Security Notice */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        <div className="flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Secure payment processed by Square
        </div>
      </div>
    </div>
  );
};