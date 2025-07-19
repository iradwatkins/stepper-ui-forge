#!/bin/bash

echo "🔍 Testing Square Edge Function Health Check"
echo "==========================================="
echo ""

# Get the anon key from .env file
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzenpobGd3ZmJpamFvdGZkZHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDMwODgsImV4cCI6MjA2NjcxOTA4OH0.ilfdDmbwme7oACe4TxsAJVko3O-DgPl-QWIHKbfZop0"

echo "Testing with proper authorization header..."
echo ""

# Make the request with authorization header
response=$(curl -s -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-square)

# Check if we got a response
if [ -z "$response" ]; then
    echo "❌ No response from edge function"
    echo ""
    echo "The function might not be deployed or is failing to start."
    echo "Deploy it manually at:"
    echo "https://app.supabase.com/project/aszzhlgwfbijaotfddsh/functions/payments-square"
else
    echo "✅ Response received:"
    echo ""
    echo "$response" | jq . 2>/dev/null || echo "$response"
    
    # Check if it's the new version
    if echo "$response" | grep -q "apiStatus"; then
        echo ""
        echo "✅ NEW VERSION DEPLOYED! The function has detailed error handling."
        echo ""
        echo "Now test payments at: https://www.stepperslife.com/payment-debug-test"
    else
        echo ""
        echo "⚠️  OLD VERSION still running. Deploy the new version at:"
        echo "https://app.supabase.com/project/aszzhlgwfbijaotfddsh/functions/payments-square"
    fi
fi