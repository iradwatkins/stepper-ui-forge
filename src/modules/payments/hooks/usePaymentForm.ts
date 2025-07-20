import { useState, useEffect, useRef, useCallback } from 'react';
import { PaymentState, PaymentResult } from '../types';
import { usePayment } from '../PaymentProvider';
import { handlePaymentError, shouldRetry, getRetryDelay } from '../utils/errorHandler';
import { validatePaymentAmount } from '../utils/paymentValidator';

interface UsePaymentFormOptions {
  containerId: string;
  amount: number;
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  maxRetries?: number;
}

export const usePaymentForm = ({
  containerId,
  amount,
  onSuccess,
  onError,
  maxRetries = 3
}: UsePaymentFormOptions) => {
  const { gateway, isReady } = usePayment();
  const [state, setState] = useState<PaymentState>({
    status: 'initializing',
    error: null,
    paymentInstance: null,
    isLoading: false
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  // Initialize payment form when gateway is ready
  useEffect(() => {
    if (isReady && gateway && state.status === 'initializing') {
      initializePaymentForm();
    }
  }, [isReady, gateway, state.status]);

  const cleanup = useCallback(() => {
    if (state.paymentInstance) {
      // Square cards auto-cleanup, but we reset our reference
      setState(prev => ({ ...prev, paymentInstance: null }));
    }
  }, [state.paymentInstance]);

  const waitForContainer = async (maxAttempts = 10): Promise<HTMLElement> => {
    for (let i = 0; i < maxAttempts; i++) {
      const container = document.getElementById(containerId);
      if (container && document.contains(container)) {
        return container;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Container "${containerId}" not found after ${maxAttempts} attempts`);
  };

  const initializePaymentForm = async () => {
    if (!gateway || !isMountedRef.current) return;

    try {
      setState(prev => ({ ...prev, status: 'initializing', error: null }));

      // Wait for container to be ready
      await waitForContainer();

      if (!isMountedRef.current) return;

      // Create payment form
      const paymentInstance = await gateway.createPaymentForm(containerId);

      if (!isMountedRef.current) return;

      setState({
        status: 'ready',
        error: null,
        paymentInstance,
        isLoading: false
      });

      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      if (!isMountedRef.current) return;

      const paymentError = handlePaymentError(error);
      console.error('Payment form initialization failed:', paymentError);

      if (shouldRetry(paymentError, retryCountRef.current + 1) && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = getRetryDelay(retryCountRef.current);
        
        setState(prev => ({ 
          ...prev, 
          status: 'initializing', 
          error: `Retrying in ${delay/1000}s... (${retryCountRef.current}/${maxRetries})` 
        }));

        setTimeout(() => {
          if (isMountedRef.current) {
            initializePaymentForm();
          }
        }, delay);
      } else {
        setState({
          status: 'error',
          error: paymentError.userMessage,
          paymentInstance: null,
          isLoading: false
        });
        onError(paymentError.userMessage);
      }
    }
  };

  const processPayment = async () => {
    if (!gateway || !state.paymentInstance || state.status !== 'ready') {
      onError('Payment form not ready');
      return;
    }

    // Validate amount
    const validation = validatePaymentAmount(amount);
    if (!validation.isValid) {
      onError(validation.errors.join(', '));
      return;
    }

    setState(prev => ({ ...prev, status: 'processing', isLoading: true }));

    try {
      const result = await gateway.processPayment(state.paymentInstance, amount);
      
      if (!isMountedRef.current) return;

      if (result.success) {
        setState(prev => ({ ...prev, status: 'success', isLoading: false }));
        onSuccess(result);
      } else {
        setState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: result.error || 'Payment failed',
          isLoading: false 
        }));
        onError(result.error || 'Payment failed');
      }
    } catch (error) {
      if (!isMountedRef.current) return;

      const paymentError = handlePaymentError(error);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: paymentError.userMessage,
        isLoading: false 
      }));
      onError(paymentError.userMessage);
    }
  };

  const reset = useCallback(() => {
    retryCountRef.current = 0;
    setState({
      status: 'initializing',
      error: null,
      paymentInstance: null,
      isLoading: false
    });
    
    // Re-initialize
    if (isReady && gateway) {
      initializePaymentForm();
    }
  }, [isReady, gateway]);

  return {
    state,
    processPayment,
    reset,
    containerRef,
    isReady: state.status === 'ready',
    isProcessing: state.status === 'processing',
    hasError: state.status === 'error'
  };
};