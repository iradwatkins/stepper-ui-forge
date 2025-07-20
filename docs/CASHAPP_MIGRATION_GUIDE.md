# Cash App Pay Migration Guide: From Direct SDK to Square SDK

## Overview

This guide helps you migrate from using the Cash App direct SDK (kit.cash.app) to using ONLY Square's Web Payments SDK for Cash App Pay integration.

## Key Changes

### ❌ OLD Approach (Remove This)
- Loading Cash App SDK from `kit.cash.app/v1/pay.js`
- Using `window.CashApp.pay()`
- Separate Cash App Client ID
- Multiple SDK conflicts

### ✅ NEW Approach (Use This)
- Loading ONLY Square SDK from `web.squarecdn.com/v1/square.js`
- Using `Square.payments().cashAppPay()`
- Square Application ID works for Cash App Pay
- Single SDK, no conflicts

## Migration Steps

### 1. Remove Cash App Direct SDK References

Search and remove ALL instances of:

```javascript
// REMOVE these script tags:
<script src="https://kit.cash.app/v1/pay.js"></script>
<script src="https://sandbox.kit.cash.app/v1/pay.js"></script>

// REMOVE any code using:
window.CashApp
window.CashApp.pay({ clientId: ... })
```

### 2. Update Environment Variables

```bash
# You can REMOVE these (or let them default to Square values):
VITE_CASHAPP_CLIENT_ID=xxx  # Not needed - uses Square App ID
VITE_CASHAPP_ENVIRONMENT=xxx # Not needed - uses Square environment

# Keep only Square variables:
VITE_SQUARE_APP_ID=sq0idp-XG8irNWHf98C62-iqOwH6Q
VITE_SQUARE_LOCATION_ID=L0Q2YC1SPBGD8
VITE_SQUARE_ENVIRONMENT=production
```

### 3. Use the Clean Implementation

Replace your Cash App Pay component with `CashAppPaySquareOnly`:

```typescript
import { CashAppPaySquareOnly } from '@/components/payment/CashAppPaySquareOnly';

// Usage
<CashAppPaySquareOnly
  amount={10.80}
  orderId="order_123"
  customerEmail="customer@example.com"
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

### 4. Update Backend Processing

No changes needed! The backend still processes Cash App payments through Square's API:

```typescript
// Edge function remains the same
const payment = await createSquarePayment({
  source_id: token, // Token from Square SDK
  amount_money: { amount: 1080, currency: 'USD' },
  location_id: SQUARE_LOCATION_ID
});
```

## Implementation Pattern

### ✅ Correct Implementation Flow

```javascript
// 1. Load Square SDK (only once)
const script = document.createElement('script');
script.src = 'https://web.squarecdn.com/v1/square.js';

// 2. Initialize Square payments (only once)
const payments = Square.payments(appId, locationId);

// 3. Create Cash App Pay instance (only once)
const paymentRequest = payments.paymentRequest({
  countryCode: 'US',
  currencyCode: 'USD',
  total: { amount: '10.80', label: 'Total' }
});

const cashAppPay = await payments.cashAppPay(paymentRequest, {
  redirectURL: window.location.href,
  referenceId: orderId
});

// 4. Attach to DOM (only once)
await cashAppPay.attach('#container');

// 5. Handle tokenization
cashAppPay.addEventListener('ontokenization', (event) => {
  const { tokenResult } = event.detail;
  if (tokenResult.status === 'OK') {
    processPayment(tokenResult.token);
  }
});
```

## Common Issues and Solutions

### Issue: "Element not found"
**Solution**: Wait for DOM element to exist before attaching:
```javascript
const waitForElement = (selector) => {
  return new Promise((resolve) => {
    const check = () => {
      const element = document.querySelector(selector);
      if (element) resolve(element);
      else setTimeout(check, 50);
    };
    check();
  });
};

await waitForElement('#container');
await cashAppPay.attach('#container');
```

### Issue: Multiple initialization
**Solution**: Use refs or flags to prevent re-initialization:
```javascript
const initializedRef = useRef(false);

useEffect(() => {
  if (initializedRef.current) return;
  // ... initialization code ...
  initializedRef.current = true;
}, []);
```

### Issue: "Production client ID required"
**Solution**: This error often means you're trying to use Cash App's direct SDK. Ensure you're ONLY using Square's SDK.

## Testing Checklist

- [ ] Removed ALL references to kit.cash.app
- [ ] Only loading Square SDK (web.squarecdn.com)
- [ ] Using Square Application ID for Cash App Pay
- [ ] Single initialization (no duplicates)
- [ ] Proper cleanup on unmount
- [ ] Container element exists before attach
- [ ] Event listeners added only once

## File Locations

### Components to Use
- `/src/components/payment/CashAppPaySquareOnly.tsx` - Clean implementation

### Components to Remove/Update
- `/src/components/payment/CashAppPay.tsx` - Uses direct SDK (remove)
- Any component loading kit.cash.app SDK

### Test Pages
- `/cashapp-pay-implementation` - Clean implementation demo
- `/payment-debug-test` - Diagnostic tools

## Summary

The key to successful Cash App Pay integration is to:
1. Use ONLY Square's Web Payments SDK
2. Never load the Cash App direct SDK
3. Initialize everything only once
4. Use your Square Application ID

No separate Cash App credentials are needed - your Square credentials work for everything!