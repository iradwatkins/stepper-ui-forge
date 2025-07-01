# Production Setup Guide

## Overview
This guide covers the complete setup process for deploying the Stepper UI Forge application to production using Vercel for frontend hosting and Supabase for backend services.

## Prerequisites

### 1. Production Payment Gateway Accounts
Before deploying, you need to set up production accounts with all payment providers:

#### PayPal Production Account
1. Go to [PayPal Developer Console](https://developer.paypal.com/)
2. Create a production app (not sandbox)
3. Get your production Client ID and Client Secret
4. Set up webhook endpoints for payment notifications

#### Square Production Account
1. Go to [Square Developer Dashboard](https://developer.squareup.com/)
2. Create a production application
3. Get your production Application ID, Access Token, and Location ID
4. Set up webhook endpoints for payment notifications

#### Cash App Pay (via Square)
- Cash App Pay uses Square's payment system
- Use the same Square production credentials
- Enable Cash App Pay in your Square dashboard

### 2. Production Supabase Instance
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new production project
3. Get your production Project URL and anon key
4. Run database migrations from your local schema

## Deployment Steps

### Step 1: Configure Environment Variables

Replace the placeholder values in `.env.production` with your actual production credentials:

```bash
# Supabase Configuration - PRODUCTION
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key

# PayPal Configuration - PRODUCTION
VITE_PAYPAL_CLIENT_ID=your_production_paypal_client_id
VITE_PAYPAL_CLIENT_SECRET=your_production_paypal_client_secret
VITE_PAYPAL_ENVIRONMENT=production

# Square Configuration - PRODUCTION
VITE_SQUARE_APPLICATION_ID=your_production_square_application_id
VITE_SQUARE_ACCESS_TOKEN=your_production_square_access_token
VITE_SQUARE_LOCATION_ID=your_production_square_location_id
VITE_SQUARE_ENVIRONMENT=production

# Cash App Configuration - PRODUCTION
VITE_CASHAPP_CLIENT_ID=your_production_square_application_id
VITE_CASHAPP_ENVIRONMENT=production

# Payment Webhook Configuration - PRODUCTION
VITE_PAYMENT_WEBHOOK_URL=https://your-domain.vercel.app/api/webhooks/payments
```

### Step 2: Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Option B: Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Configure environment variables in the Vercel dashboard
4. Deploy

### Step 3: Configure Vercel Environment Variables

In your Vercel project dashboard, add these environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PAYPAL_CLIENT_ID`
- `VITE_PAYPAL_CLIENT_SECRET`
- `VITE_PAYPAL_ENVIRONMENT` (set to "production")
- `VITE_SQUARE_APPLICATION_ID`
- `VITE_SQUARE_ACCESS_TOKEN`
- `VITE_SQUARE_LOCATION_ID`
- `VITE_SQUARE_ENVIRONMENT` (set to "production")
- `VITE_CASHAPP_CLIENT_ID`
- `VITE_CASHAPP_ENVIRONMENT` (set to "production")
- `VITE_PAYMENT_WEBHOOK_URL`

### Step 4: Update Payment Gateway Webhooks

After deployment, update your payment gateway webhook URLs:

#### PayPal Webhooks
1. Go to PayPal Developer Console
2. Navigate to your production app
3. Add webhook URL: `https://your-domain.vercel.app/api/webhooks/paypal`
4. Subscribe to payment events

#### Square Webhooks
1. Go to Square Developer Dashboard
2. Navigate to your production app
3. Add webhook URL: `https://your-domain.vercel.app/api/webhooks/square`
4. Subscribe to payment events

### Step 5: Test Production Deployment

Run the following tests to ensure everything works:

1. **Payment Gateway Tests**
   - Test PayPal payments with real amounts
   - Test Square payments with real amounts
   - Test Cash App payments with real amounts

2. **Database Operations**
   - Verify event creation works
   - Verify ticket purchases are recorded
   - Verify user authentication works

3. **Security Tests**
   - Verify HTTPS is enforced
   - Verify payment data is encrypted
   - Verify webhook signatures are validated

## Security Checklist

- [ ] All environment variables are set in Vercel (not in code)
- [ ] HTTPS is enforced for all traffic
- [ ] Payment webhook signatures are validated
- [ ] Sensitive data is not logged
- [ ] CORS is properly configured
- [ ] Rate limiting is in place for payment endpoints

## Monitoring and Maintenance

### Recommended Monitoring
- Set up Vercel Analytics for performance monitoring
- Monitor payment gateway transaction logs
- Set up error tracking (Sentry recommended)
- Monitor database performance in Supabase

### Regular Maintenance
- Review payment gateway fees and settings monthly
- Update dependencies regularly
- Monitor and rotate API keys as needed
- Backup database regularly

## Troubleshooting

### Common Issues

#### Payment Failures
- Check if payment gateway credentials are correct
- Verify webhook URLs are accessible
- Check payment gateway logs for errors

#### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check if database is in the correct region
- Verify database schema is up to date

#### Build Failures
- Check if all environment variables are set
- Verify Node.js version compatibility
- Check for TypeScript errors

## Support

For deployment issues:
- Check Vercel deployment logs
- Review payment gateway documentation
- Check Supabase project logs

For application issues:
- Review application logs in Vercel Functions
- Check browser developer console
- Verify payment flow in payment gateway dashboards