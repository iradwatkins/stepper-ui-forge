# Cash App Pay Integration Guide

## Overview

Cash App Pay is integrated through Square's Web Payments SDK. You don't need a separate Cash App ID - your Square credentials work for both Square card payments and Cash App Pay.

## Key Points

1. **No Separate Cash App ID Required**: Cash App Pay uses your Square Application ID
2. **Production Ready**: Works in both sandbox and production environments
3. **Unified Backend**: Uses the same Square payment processing infrastructure

## Implementation

### 1. Environment Configuration

Ensure your `.env.production` file has these Square credentials:

```env
# Square Configuration - PRODUCTION
VITE_SQUARE_APP_ID=sq0idp-XG8irNWHf98C62-iqOwH6Q
VITE_SQUARE_LOCATION_ID=L0Q2YC1SPBGD8
VITE_SQUARE_ENVIRONMENT=production

# Cash App Configuration (uses Square credentials)
VITE_CASHAPP_CLIENT_ID=sq0idp-XG8irNWHf98C62-iqOwH6Q
VITE_CASHAPP_ENVIRONMENT=production
```

### 2. Frontend Implementation

The Cash App Pay button is initialized using Square's Web SDK:

```typescript
// Initialize Square payments
const payments = Square.payments(applicationId, locationId);

// Create payment request
const paymentRequest = payments.paymentRequest({
  countryCode: 'US',
  currencyCode: 'USD',
  total: {
    amount: '10.80',
    label: 'Total'
  }
});

// Initialize Cash App Pay
const cashAppPay = await payments.cashAppPay(paymentRequest, {
  redirectURL: window.location.href,
  referenceId: 'order-123'
});

// Attach to DOM
await cashAppPay.attach('#cash-app-pay-container');
```

### 3. Payment Flow

1. **Customer Interaction**:
   - Desktop: Shows QR code to scan with Cash App
   - Mobile: Redirects to Cash App application

2. **Authorization**:
   - Customer approves payment in Cash App
   - Cash App sends token back to your website

3. **Processing**:
   - Frontend receives payment token
   - Token sent to backend for processing
   - Backend uses Square API to complete payment

### 4. Testing

#### Available Test Pages:

1. **Cash App Pay Implementation** - `/cashapp-pay-implementation`
   - Full implementation example
   - Shows order summary
   - Handles payment flow

2. **Payment Debug Test** - `/payment-debug-test`
   - Comprehensive testing tools
   - Cash App configuration check
   - Multiple payment method tests

### 5. Production Considerations

- **SSL Required**: HTTPS must be enabled in production
- **Real Payments**: In production mode, real payments will be processed
- **Error Handling**: Implement proper error handling for declined payments
- **Idempotency**: Use unique idempotency keys to prevent duplicate charges

### 6. Common Issues and Solutions

#### "Production client ID must be used in production environment"
- Ensure you're using production Square credentials
- Check that VITE_SQUARE_ENVIRONMENT is set to "production"

#### Cash App button not appearing
- Verify Square Application ID is correct
- Check browser console for initialization errors
- Ensure the container element exists in DOM

#### Payment token not received
- Check that event listeners are properly attached
- Verify redirect URL is correct
- Ensure customer completes authorization in Cash App

### 7. Backend Processing

The Cash App payment is processed through the same Square payments API:

```typescript
// Edge function: payments-cashapp
const payment = await createSquarePayment({
  source_id: token,
  amount_money: {
    amount: 1080, // $10.80 in cents
    currency: 'USD'
  },
  location_id: SQUARE_LOCATION_ID
});
```

### 8. Security Best Practices

1. Never expose Square Access Token on frontend
2. Validate payment amounts on backend
3. Use HTTPS in production
4. Implement webhook verification
5. Store transaction records

## API Reference

### Frontend Methods

- `payments.cashAppPay(paymentRequest, options)` - Initialize Cash App Pay
- `cashAppPay.attach(elementId)` - Attach button to DOM
- `cashAppPay.destroy()` - Clean up resources
- `cashAppPay.addEventListener('ontokenization', handler)` - Handle payment token

### Backend Endpoints

- `POST /functions/v1/payments-cashapp` - Process Cash App payment
- `GET /functions/v1/payments-cashapp` - Health check

## Support

For issues or questions:
1. Check browser console for errors
2. Verify environment configuration
3. Review Square API documentation
4. Contact Square support for API issues