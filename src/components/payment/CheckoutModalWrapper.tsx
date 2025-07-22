import React from 'react';
import { ProductionCheckoutModal } from './production/ProductionCheckoutModal';

// This component determines which checkout modal to use
// For now, we'll use the production checkout modal
export function CheckoutModalWrapper(props: any) {
  // Always use production checkout
  return <ProductionCheckoutModal {...props} />;
}

export { CheckoutModalWrapper as CheckoutModal };