#!/bin/bash

# Quick script to fix production database schema errors

echo "🚨 URGENT: Fix Production Database Schema Errors"
echo "================================================"
echo ""
echo "Your production site is experiencing 400 errors due to missing database columns."
echo ""
echo "To fix this, you need to run the migration on your production database."
echo ""
echo "Option 1: Supabase Dashboard (EASIEST)"
echo "--------------------------------------"
echo "1. Open: https://supabase.com/dashboard/project/aszzhlgwfbijaotfddsh/sql/new"
echo "2. Copy contents of: supabase/migrations/20250723_fix_production_schema_urgent.sql"
echo "3. Paste and click 'Run'"
echo ""
echo "Option 2: Using this script (requires password)"
echo "-----------------------------------------------"
echo "Enter your Supabase database password (or press Ctrl+C to cancel):"
read -s DB_PASSWORD

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ No password provided. Please use Option 1 above."
    exit 1
fi

echo ""
echo "🔄 Applying migration to production..."

# Apply the migration
psql "postgresql://postgres.aszzhlgwfbijaotfddsh:${DB_PASSWORD}@aws-0-us-east-2.pooler.supabase.com:6543/postgres" \
    -f supabase/migrations/20250723_fix_production_schema_urgent.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo "🎉 Your production site should now work without errors."
    echo ""
    echo "Please refresh your production site to verify the fix."
else
    echo "❌ Migration failed. Please use Option 1 (Supabase Dashboard) instead."
fi