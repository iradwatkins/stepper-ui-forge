# Square Sandbox Setup Guide

## Why Sandbox Mode?
The current Square error `"applicationId option is not in the correct format"` occurs because the system is trying to use fake production credentials. For development, you should use Square's sandbox environment.

## Step 1: Create Square Sandbox Account
1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Create a free developer account if you don't have one
3. Create a new Application for testing

## Step 2: Get Your Sandbox Credentials
In your Square Developer Dashboard:
1. Select your application
2. Go to **Sandbox** tab
3. Copy these values:
   - **Sandbox Application ID** (starts with `sandbox-sq0idb-`)
   - **Sandbox Access Token** (starts with `EAAAl...`)
   - **Sandbox Location ID** (looks like `L...`)

## Step 3: Update Your .env File
Replace the placeholder values in your `.env` file:

```bash
# Square Configuration - SANDBOX (for development)
VITE_SQUARE_APP_ID=sandbox-sq0idb-YOUR_ACTUAL_SANDBOX_APP_ID_HERE
VITE_SQUARE_ACCESS_TOKEN=YOUR_ACTUAL_SANDBOX_ACCESS_TOKEN_HERE  
VITE_SQUARE_ENVIRONMENT=sandbox
VITE_SQUARE_LOCATION_ID=YOUR_ACTUAL_SANDBOX_LOCATION_ID_HERE

# Cash App Configuration - SANDBOX (uses same client ID as Square)
VITE_CASHAPP_CLIENT_ID=sandbox-sq0idb-YOUR_ACTUAL_SANDBOX_APP_ID_HERE
VITE_CASHAPP_ENVIRONMENT=sandbox
```

## Step 4: Test Square Payments
After updating your credentials:
1. Restart your development server: `npm run dev`
2. Try to access a checkout page
3. The Square payment form should now initialize without errors
4. Use Square's test card numbers for testing:
   - **Visa**: `4111 1111 1111 1111`
   - **Mastercard**: `5555 5555 5555 4444`
   - **Any future expiry date and any CVV**

## Expected Results
✅ **Before Fix**: `Square SDK initialization failed: The Payment 'applicationId' option is not in the correct format`  
✅ **After Fix**: Square payment form loads successfully and accepts test payments

## Production Setup (Later)
When ready for production:
1. Switch to **Production** tab in Square Dashboard
2. Get production credentials (start with `sq0idp-`)
3. Update environment variables
4. Set `VITE_SQUARE_ENVIRONMENT=production`

## Troubleshooting
- **"Container not found"**: Restart dev server and refresh page
- **"Invalid credentials"**: Double-check you copied the full sandbox credentials
- **"Network error"**: Verify your Square app has Web Payments SDK enabled