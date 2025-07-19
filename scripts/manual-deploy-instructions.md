# Manual Square Edge Function Deployment

Since the automatic deployment is taking longer than expected, here's how to deploy manually:

## Option 1: Supabase Dashboard (Fastest)

1. **Go to Edge Functions page**:
   https://app.supabase.com/project/aszzhlgwfbijaotfddsh/functions

2. **Click on `payments-square`**

3. **Click the "Deploy" button** (or "Redeploy" if available)

4. **Wait for deployment** (usually 30-60 seconds)

5. **Verify deployment** by visiting the function URL:
   https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-square
   
   You should see a JSON response with `apiStatus` field.

## Option 2: Check GitHub Actions

1. **Check deployment status**:
   https://github.com/iradwatkins/stepper-ui-forge/actions

2. **Look for the workflow** triggered by commit `35340f1`

3. **If failed**, click on it to see error details

## Option 3: Force Redeploy

If the GitHub Action isn't running:

```bash
# Make another small change
echo "// Force redeploy $(date)" >> supabase/functions/payments-square/index.ts
git add supabase/functions/payments-square/index.ts
git commit -m "Force redeploy Square edge function"
git push origin main
```

## What to Expect After Deployment

Once deployed, the payment test will show detailed errors like:

```json
{
  "error": "Square payment failed (401): UNAUTHORIZED: The access token is invalid",
  "details": {
    "environment": "production",
    "baseUrl": "https://connect.squareup.com",
    "hasCredentials": true
  }
}
```

This will tell us exactly what's wrong with the Square configuration.