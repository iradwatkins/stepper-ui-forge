# Cash App Pay Integration Guide - Slide-out Cart

## Overview

This guide shows how to integrate Cash App Pay with Square payments in a unified payment manager to avoid SDK conflicts.

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
2. **Shared Instance**: All payment components share the same Square payments instance
3. **Container-based Rendering**: Each Cash App Pay button renders in its own container
4. **Proper Cleanup**: Instances are destroyed when components unmount

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