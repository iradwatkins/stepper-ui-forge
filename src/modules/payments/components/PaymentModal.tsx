import React, { Suspense } from 'react';
import { PaymentProps } from '../types';
import { PaymentErrorBoundary } from './PaymentErrorBoundary';
import { CreditCardPayment } from './CreditCardPayment';
import { X } from 'lucide-react';

interface PaymentModalProps extends PaymentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

const PaymentModalFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

/**
 * Payment Modal Component
 * Wraps the payment form in a modal with error boundary
 */
export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  currency,
  onSuccess,
  onError,
  title = 'Complete Payment',
  description,
  ...props
}) => {
  if (!isOpen) return null;

  const handleSuccess = (result: any) => {
    onSuccess(result);
    onClose();
  };

  const handleError = (error: string) => {
    onError(error);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Content */}
          <div className="p-6">
            <PaymentErrorBoundary>
              <Suspense fallback={<PaymentModalFallback />}>
                <CreditCardPayment
                  amount={amount}
                  currency={currency}
                  onSuccess={handleSuccess}
                  onError={handleError}
                  onCancel={handleCancel}
                  title={title}
                  description={description}
                  {...props}
                />
              </Suspense>
            </PaymentErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};