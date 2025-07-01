# Supabase Environment Variables Setup

## Payment Gateway Secrets - Server-Side Only

You need to configure these environment variables in your Supabase project settings:

### Navigate to Supabase Dashboard:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `aszzhlgwfbijaotfddsh`
3. Go to Settings → Edge Functions → Environment Variables

### Add These Environment Variables:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=AWcmEjsKDeNUzvVQJyvc3lq5n4NXsh7-sHPgGT4ZiPFo8X6csYZcElZg2wsu_xsZE22DUoXOtF3MolVK
PAYPAL_CLIENT_SECRET=EOKT1tTTaBV8EOx-4yMwF0xtSYaO0D2fVkU8frfqITvV-QYgU2Ep3MG3ttqqdbug9LeevJ9p7BgDFXmp
PAYPAL_ENVIRONMENT=production

# Square Configuration
SQUARE_APPLICATION_ID=sq0idp-XG8irNWHf98C62-iqOwH6Q
SQUARE_ACCESS_TOKEN=EAAAlwLSKasNtDyFEQ4mDkK9Ces5pQ9FQ4_kiolkTnjd-4qHlOx2K9-VrGC7QcOi
SQUARE_LOCATION_ID=L0Q2YC1SPBGD8
SQUARE_ENVIRONMENT=production
```

## Deploy Edge Functions

After setting the environment variables, deploy the functions:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref aszzhlgwfbijaotfddsh

# Deploy all functions
supabase functions deploy payments-paypal
supabase functions deploy payments-square
supabase functions deploy payments-webhook
```

## Function URLs

After deployment, your functions will be available at:

- **PayPal**: `https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-paypal`
- **Square**: `https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-square`
- **Webhook**: `https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-webhook`

## Update Payment Gateway Webhooks

Update your payment gateway webhook URLs:

### PayPal Dashboard:
- URL: `https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-webhook?provider=paypal`

### Square Dashboard:
- URL: `https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-webhook?provider=square`

## Security Benefits

✅ **Payment secrets now server-side only**  
✅ **No secrets exposed in client bundles**  
✅ **Reduced deployment costs (no Vercel function fees)**  
✅ **Better database integration**  
✅ **Unified platform management**