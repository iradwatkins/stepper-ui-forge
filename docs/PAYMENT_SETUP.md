# Payment Gateway Setup Guide

This guide explains how to configure PayPal, Square, and Cash App payment gateways for the steppers.com platform.

## 🔐 Environment Variables Setup

### Step 1: Copy Environment Template
```bash
cp .env.example .env.local
```

### Step 2: Configure Each Payment Gateway

## 💰 PayPal Setup

### Development (Sandbox)
1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/developer/applications/)
2. Create a new app for sandbox testing
3. Get your Client ID and Client Secret
4. Add to `.env.local`:

```env
VITE_PAYPAL_CLIENT_ID=your_sandbox_client_id
VITE_PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
VITE_PAYPAL_ENVIRONMENT=sandbox
```

### Production
```env
VITE_PAYPAL_CLIENT_ID=your_production_client_id
VITE_PAYPAL_CLIENT_SECRET=your_production_client_secret
VITE_PAYPAL_ENVIRONMENT=production
```

## 🟦 Square Setup

### Development (Sandbox)
1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Create a new application
3. Navigate to "Credentials" tab
4. Copy Sandbox credentials
5. Add to `.env.local`:

```env
VITE_SQUARE_APP_ID=your_sandbox_app_id
VITE_SQUARE_ACCESS_TOKEN=your_sandbox_access_token
VITE_SQUARE_LOCATION_ID=your_sandbox_location_id
VITE_SQUARE_ENVIRONMENT=sandbox
```

### Production
```env
VITE_SQUARE_APP_ID=your_production_app_id
VITE_SQUARE_ACCESS_TOKEN=your_production_access_token
VITE_SQUARE_LOCATION_ID=your_production_location_id
VITE_SQUARE_ENVIRONMENT=production
```

## 💚 Cash App Setup

### Development (Sandbox)
1. Go to [Cash App Developer Portal](https://developers.cash.app/)
2. Create a new application
3. Get your Client ID for sandbox
4. Add to `.env.local`:

```env
VITE_CASHAPP_CLIENT_ID=your_sandbox_client_id
VITE_CASHAPP_ENVIRONMENT=sandbox
```

### Production
```env
VITE_CASHAPP_CLIENT_ID=your_production_client_id
VITE_CASHAPP_ENVIRONMENT=production
```

## 🔗 Optional: Webhook Configuration

If you want to receive payment confirmations via webhooks:

```env
VITE_PAYMENT_WEBHOOK_URL=https://yourdomain.com/api/payment-webhook
```

## 📋 Complete Example .env.local

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=AeA1QIjRd6EXAMPLE
VITE_PAYPAL_CLIENT_SECRET=EMj9fEXAMPLE
VITE_PAYPAL_ENVIRONMENT=sandbox

# Square Configuration  
VITE_SQUARE_APP_ID=sq0idp-EXAMPLE
VITE_SQUARE_ACCESS_TOKEN=EAAAEOjEXAMPLE
VITE_SQUARE_ENVIRONMENT=sandbox
VITE_SQUARE_LOCATION_ID=LH1EXAMPLE

# Cash App Configuration
VITE_CASHAPP_CLIENT_ID=CA_EXAMPLE
VITE_CASHAPP_ENVIRONMENT=sandbox

# Optional: Webhook URLs
VITE_PAYMENT_WEBHOOK_URL=http://localhost:3000/api/payment-webhook
```

## 🚀 Testing Your Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open browser console to see payment configuration status
3. Navigate to an event and try adding items to cart
4. Open checkout modal - you should see no configuration warnings
5. All payment methods should be available

## ⚠️ Security Notes

- **Never commit real credentials** to version control
- Use `.env.local` for local development (it's in .gitignore)
- Use environment variables in production deployment
- Rotate keys regularly
- Use sandbox/development keys for testing

## 🐛 Troubleshooting

### Configuration Warnings
If you see "Payment configuration incomplete" in the checkout modal:

1. Check that all required environment variables are set
2. Restart the development server after adding new variables
3. Check browser console for detailed missing configuration

### Payment Method Not Working
1. Verify credentials are correct for the environment (sandbox vs production)
2. Check that the payment gateway account is active
3. Ensure webhook URLs are accessible (if configured)

## 📚 Additional Resources

- [PayPal Developer Docs](https://developer.paypal.com/docs/)
- [Square Developer Docs](https://developer.squareup.com/docs)
- [Cash App Developer Docs](https://developers.cash.app/docs)