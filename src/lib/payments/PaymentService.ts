// Production Payment Service
// Simplified version for production deployment

import { productionPaymentService } from './ProductionPaymentService'

export class PaymentService {
  private static instance: PaymentService;

  private constructor() {}

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  async initialize(): Promise<void> {
    console.log('✅ Production Payment Service initialized');
  }

  isInitialized(): boolean {
    return true;
  }

  getAvailablePaymentMethods() {
    return productionPaymentService.getAvailablePaymentMethods();
  }

  async processPayment(request: any) {
    return productionPaymentService.processPayment(request);
  }

  getStatus() {
    return productionPaymentService.getStatus();
  }
}

export const paymentService = PaymentService.getInstance();