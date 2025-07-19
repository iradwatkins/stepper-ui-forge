#!/bin/bash

echo "⏳ Waiting for Square Edge Function Deployment..."
echo "================================================"
echo ""

# Function endpoint
ENDPOINT="https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-square"

# Counter
attempt=1
max_attempts=30  # 5 minutes max (10 second intervals)

while [ $attempt -le $max_attempts ]; do
    echo -n "Attempt $attempt/$max_attempts: "
    
    # Check if the function returns the new error format
    response=$(curl -s "$ENDPOINT")
    
    # Check if response contains the new fields
    if echo "$response" | grep -q "apiStatus"; then
        echo "✅ Deployment complete!"
        echo ""
        echo "New health check response:"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        echo ""
        echo "Now test at: https://www.stepperslife.com/payment-debug-test"
        exit 0
    else
        echo "Still old version..."
    fi
    
    # Wait 10 seconds before next attempt
    sleep 10
    attempt=$((attempt + 1))
done

echo ""
echo "❌ Deployment timeout. Check GitHub Actions:"
echo "https://github.com/iradwatkins/stepper-ui-forge/actions"
echo ""
echo "Alternative: Deploy manually via Supabase Dashboard:"
echo "https://app.supabase.com/project/aszzhlgwfbijaotfddsh/functions/payments-square"