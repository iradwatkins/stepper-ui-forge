export interface PaymentMethod {
  id: string;
  type: 'card' | 'ach' | 'gift_card' | 'paypal' | 'cash_app';
  name: string;
  enabled: boolean;
}

export interface PaymentConfig {
  square: {
    appId: string;
    locationId: string;
    environment: 'sandbox' | 'production';
  };
  paypal?: {
    clientId: string;
    environment: 'sandbox' | 'production';
  };
  cashApp?: {
    environment: 'sandbox' | 'production';
  };
}

export interface PaymentState {
  status: 'initializing' | 'ready' | 'processing' | 'success' | 'error';
  error: string | null;
  paymentInstance: unknown | null;
  isLoading: boolean;
}

export interface PaymentResult {
  success: boolean;
  token?: string;
  error?: string;
  transactionId?: string;
}

export interface PaymentProps {
  amount: number;
  currency?: string;
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface PaymentGateway {
  initialize(): Promise<void>;
  createPaymentForm(containerId: string): Promise<unknown>;
  processPayment(paymentInstance: unknown, amount: number): Promise<PaymentResult>;
  cleanup(): void;
  isReady(): boolean;
}