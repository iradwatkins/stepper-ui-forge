# Cash App Pay Integration Guide - Slide-out Cart

## Overview

This guide shows how to integrate Cash App Pay with Square payments in a unified payment manager to avoid SDK conflicts.

## Important: Payment Request Requirement

As of the latest Square SDK update, Cash App Pay requires a `paymentRequest` object during initialization. This object must include:
- `countryCode`: The country code (e.g., 'US')
- `currencyCode`: The currency code (e.g., 'USD')
- `total`: An object with `amount` (as string) and `label`

## Key Components

### 1. Global Payment Manager (`/src/lib/services/paymentManager.ts`)

The payment manager ensures:
- Single Square SDK initialization
- Shared payment instance across the app
- Proper cleanup of payment instances
- No duplicate SDK loading

### 2. Updated Components

#### Main CashAppPay Component
Updated to use the global payment manager instead of loading its own SDK.

#### SlideOutCashAppPay Component
New component specifically for cart integration that uses the payment manager.

#### CartDrawerWithPayment Component
Enhanced cart drawer that supports in-cart Cash App payments.

## Implementation Steps

### Step 1: Replace Cart Component

In your main app, replace the standard CartDrawer with CartDrawerWithPayment:

```tsx
import { CartDrawerWithPayment } from '@/components/cart/CartDrawerWithPayment';

// In your component
<CartDrawerWithPayment 
  open={cartOpen} 
  onOpenChange={setCartOpen} 
/>
```

### Step 2: Ensure Environment Variables

Make sure your `.env` file has:
```env
VITE_SQUARE_APP_ID=your_square_app_id
VITE_SQUARE_LOCATION_ID=your_location_id
```

### Step 3: Initialize Payment Manager

The payment manager initializes automatically when components mount. You can also pre-initialize it:

```tsx
import { paymentManager } from '@/lib/services/paymentManager';

// In your app initialization
useEffect(() => {
  paymentManager.initializeSquarePayments();
}, []);
```

## How It Works

1. **Single SDK Load**: Square SDK loads once when payment manager initializes
2. **Payment Request Creation**: Each Cash App Pay instance requires a payment request with amount details
3. **Shared Instance**: All payment components share the same Square payments instance
4. **Container-based Rendering**: Each Cash App Pay button renders in its own container
5. **Proper Cleanup**: Instances are destroyed when components unmount

### Payment Flow

```typescript
// 1. Create payment request
const paymentRequest = payments.paymentRequest({
  countryCode: 'US',
  currencyCode: 'USD',
  total: {
    amount: '1000', // $10.00 in cents as string
    label: 'Total',
  },
});

// 2. Create Cash App Pay instance with payment request
const cashAppPay = await payments.cashAppPay(paymentRequest, {
  redirectURL: window.location.href,
  referenceId: 'order-123',
});

// 3. Attach to container
await cashAppPay.attach('#cash-app-pay-button');

// 4. Handle tokenization
cashAppPay.addEventListener('ontokenization', (event) => {
  const { tokenResult } = event.detail;
  if (tokenResult.status === 'OK') {
    // Process payment with tokenResult.token
  }
});
```

## Benefits

- ✅ No SDK conflicts between main page and cart
- ✅ Faster loading (SDK loads once)
- ✅ Consistent payment experience
- ✅ Proper memory management
- ✅ Works with both checkout modal and in-cart payments

## Testing

1. Add items to cart
2. Open cart drawer
3. Select "Cash App Pay" payment method
4. Click "Pay with Cash App"
5. Cash App button appears in the cart
6. Complete payment without leaving the cart

## Troubleshooting

### "Square SDK not loaded" Error
- Check that Square SDK is available in window.Square
- Ensure payment manager is initialized before use

### "Container not found" Error
- Verify the container element exists in DOM
- Use unique IDs for different payment instances

### Payment Token Issues
- Use the ontokenization event for Square Cash App Pay
- Token format: `cnon:xxx...`

## Important Notes

1. **Never load Cash App SDK directly** - Always use Square's Cash App Pay
2. **Use unique container IDs** - Each instance needs its own container
3. **Clean up on unmount** - Always destroy payment instances
4. **Check for Square SDK** - Ensure it's loaded before initializing