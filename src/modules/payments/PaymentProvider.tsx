import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PaymentConfig, PaymentGateway } from './types';
import { SquareGateway } from './gateways/SquareGateway';

interface PaymentContextValue {
  gateway: PaymentGateway | null;
  isReady: boolean;
  config: PaymentConfig | null;
  error: string | null;
  setGateway: (gateway: PaymentGateway) => void;
  initializeSquare: (config: PaymentConfig['square']) => Promise<void>;
}

const PaymentContext = createContext<PaymentContextValue | null>(null);

interface PaymentProviderProps {
  children: ReactNode;
  config?: PaymentConfig;
}

/**
 * Payment Provider - Isolated from auth state changes
 * Manages payment gateways and their initialization
 */
export const PaymentProvider: React.FC<PaymentProviderProps> = ({ children, config }) => {
  const [gateway, setGateway] = useState<PaymentGateway | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<PaymentConfig | null>(config || null);

  const initializeSquare = async (squareConfig: PaymentConfig['square']) => {
    try {
      setError(null);
      setIsReady(false);

      const squareGateway = new SquareGateway(squareConfig);
      await squareGateway.initialize();
      
      setGateway(squareGateway);
      setIsReady(true);
      setCurrentConfig(prev => ({ ...prev, square: squareConfig } as PaymentConfig));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Square';
      setError(errorMessage);
      setIsReady(false);
      console.error('Square initialization failed:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gateway) {
        gateway.cleanup();
      }
    };
  }, [gateway]);

  const value: PaymentContextValue = {
    gateway,
    isReady,
    config: currentConfig,
    error,
    setGateway,
    initializeSquare
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = (): PaymentContextValue => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};