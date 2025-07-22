# IMPORTANT: Square Payment Setup

## The "applicationId option is not in the correct format" Error

If you're seeing this error, it means Square is rejecting your application ID. This happens when:

### 1. **You're Using Example/Demo Credentials**
The credentials in this codebase (`sq0idp-XG8irNWHf98C62-iqOwH6Q`) are EXAMPLE credentials and will not work. You must replace them with your own.

### 2. **How to Get Your Real Square Credentials**

1. Go to https://developer.squareup.com/apps
2. Make sure you're viewing **PRODUCTION** (not sandbox)
3. Click on your production application
4. Go to the "Credentials" tab
5. Copy:
   - **Application ID** (starts with `sq0idp-`)
   - **Access Token** (for server-side)
6. Go to "Locations" tab
7. Copy your **Location ID**

### 3. **Update Your Credentials**

#### Option A: Environment Variables (Recommended)
Update your `.env` file:
```env
VITE_SQUARE_APP_ID=YOUR_REAL_PRODUCTION_APP_ID
VITE_SQUARE_LOCATION_ID=YOUR_REAL_LOCATION_ID
```

#### Option B: Hardcoded Fallback
Update `/src/config/production.payment.config.ts`:
```typescript
const PRODUCTION_CREDENTIALS = {
  square: {
    appId: 'YOUR_REAL_PRODUCTION_APP_ID',
    locationId: 'YOUR_REAL_LOCATION_ID',
    environment: 'production'
  }
};
```

### 4. **Verify Your Credentials**

Production Application IDs must:
- Start with `sq0idp-` (note the 'p' for production)
- Be exactly 29 characters long
- Be from an active Square account
- Have the Web Payments SDK enabled

### 5. **Common Mistakes**
- ❌ Using sandbox credentials (start with `sandbox-` or `sq0idb-`)
- ❌ Using the Access Token instead of Application ID
- ❌ Extra spaces or characters in the ID
- ❌ Using credentials from a different Square account than the location

### 6. **Testing Your Credentials**
1. Open `/production-payment-test` in your browser
2. Click "Show Diagnostics"
3. Verify your credentials are loaded correctly
4. Click "Test Square Initialization" to test

## Security Note
Never commit real production credentials to version control. Always use environment variables for production deployments.