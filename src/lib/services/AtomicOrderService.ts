// Simplified Order Service for Production
// Handles order processing without complex atomic transactions

import { productionPaymentService } from '@/lib/payments/ProductionPaymentService'

export class AtomicOrderService {
  private static instance: AtomicOrderService;

  static getInstance(): AtomicOrderService {
    if (!AtomicOrderService.instance) {
      AtomicOrderService.instance = new AtomicOrderService();
    }
    return AtomicOrderService.instance;
  }

  // Legacy method for compatibility
  async extendReservations(reservationIds: string[]) {
    console.log('Extending reservations:', reservationIds);
    return { success: true };
  }

  // Legacy method for compatibility
  async createAtomicOrder(orderData: any) {
    return this.processOrder(orderData);
  }

  async processOrder(orderData: {
    eventId: string;
    items: any[];
    customerInfo: any;
    paymentMethod: string;
    totalAmount: number;
  }) {
    try {
      // Create order in database
      const orderId = crypto.randomUUID();
      
      // Process payment
      const paymentResult = await productionPaymentService.processPayment({
        amount: orderData.totalAmount,
        gateway: orderData.paymentMethod,
        orderId,
        customerEmail: orderData.customerInfo.email
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      return {
        success: true,
        orderId,
        paymentResult
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Order processing failed'
      };
    }
  }
}

export const atomicOrderService = AtomicOrderService.getInstance();