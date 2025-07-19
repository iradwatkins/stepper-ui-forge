#!/bin/bash

# Test Square Edge Function directly
echo "Testing Square Edge Function..."

SUPABASE_URL="https://aszzhlgwfbijaotfddsh.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzenpobGd3ZmJpamFvdGZkZHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDMwODgsImV4cCI6MjA2NjcxOTA4OH0.ilfdDmbwme7oACe4TxsAJVko3O-DgPl-QWIHKbfZop0"

echo "1. Testing health check endpoint..."
curl -s -X GET "${SUPABASE_URL}/functions/v1/payments-square" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n2. Testing payment creation (will show detailed error)..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/payments-square" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_payment",
    "sourceId": "test-source",
    "amount": 1.00,
    "currency": "USD"
  }' | jq '.'

echo -e "\nDone. Check the output above for specific error messages."