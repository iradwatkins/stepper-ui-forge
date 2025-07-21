# Square Payment Integration Setup Guide

## Critical: Supabase Environment Variables Configuration

The Square payment integration requires environment variables to be configured in **TWO** places:

### 1. Local Development (.env file)
These are already configured in your `.env` file:
```
VITE_SQUARE_APP_ID=sq0idp-XG8irNWHf98C62-iqOwH6Q
VITE_SQUARE_ACCESS_TOKEN=EAAAlwLSKasNtDyFEQ4mDkK9Ces5pQ9FQ4_kiolkTnjd-4qHlOx2K9-VrGC7QcOi
VITE_SQUARE_ENVIRONMENT=production
VITE_SQUARE_LOCATION_ID=L0Q2YC1SPBGD8
```

### 2. Supabase Edge Functions (REQUIRED FOR PRODUCTION)

**⚠️ IMPORTANT: This is likely why your Square payments are failing with 500 errors!**

You MUST configure the following environment variables in your Supabase Dashboard:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions** → **Secrets**
4. Add the following secrets:

| Variable Name | Value |
|--------------|-------|
| `SQUARE_APPLICATION_ID` | `sq0idp-XG8irNWHf98C62-iqOwH6Q` |
| `SQUARE_ACCESS_TOKEN` | `EAAAlwLSKasNtDyFEQ4mDkK9Ces5pQ9FQ4_kiolkTnjd-4qHlOx2K9-VrGC7QcOi` |
| `SQUARE_LOCATION_ID` | `L0Q2YC1SPBGD8` |
| `SQUARE_ENVIRONMENT` | `production` |

**Note**: The edge function uses different variable names (without the `VITE_` prefix).

## Verifying Your Configuration

### 1. Check Edge Function Health
Visit: `https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-square`

You should see a response like:
```json
{
  "status": "ok",
  "gateway": "square",
  "environment": "production",
  "configured": true,
  "apiStatus": "healthy"
}
```

### 2. Check Debug Logs
The edge function now includes detailed configuration logging. Check Supabase Function Logs to see:
- Which environment variables are missing
- Configuration status
- Detailed error messages

## Common Issues

### Issue: 500 Internal Server Error
**Cause**: Missing Square environment variables in Supabase
**Solution**: Add the secrets as shown above

### Issue: Amount Errors
**Cause**: Double conversion between cents and dollars
**Solution**: Fixed in latest code - amounts stay in cents throughout

### Issue: "Square configuration missing" error
**Cause**: Edge function cannot find SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID
**Solution**: Add these secrets in Supabase Dashboard

## Testing Payments

1. Use the debug page at `/square-debug` to test:
   - Health check
   - Direct edge function calls
   - Payment processing

2. For production testing, use real card details:
   - Test card: 4111 1111 1111 1111
   - Any future expiry date
   - Any CVV

## Square SDK Loading

The Square SDK is loaded in `index.html`:
```html
<script type="text/javascript" src="https://web.squarecdn.com/v1/square.js"></script>
```

This ensures it's available before React components try to use it.

## Amount Handling

- Frontend sends amounts in **cents** (e.g., $1.00 = 100)
- Edge function receives cents and converts to cents for Square API
- No double conversion needed

## Support

If payments still fail after configuring Supabase secrets:
1. Check Supabase Function Logs for detailed errors
2. Verify all 4 environment variables are set correctly
3. Ensure you're using production credentials (starting with `sq0idp-`)
4. Test with the health check endpoint first