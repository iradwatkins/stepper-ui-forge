#!/bin/bash

echo "Edge Function Deployment Status Check"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Checking local Square function version...${NC}"
echo ""

# Check for detailed error handling in local file
if grep -q "details: {" supabase/functions/payments-square/index.ts; then
    echo -e "${GREEN}✓ Local version has improved error handling${NC}"
    grep -n "environment: SQUARE_ENVIRONMENT" supabase/functions/payments-square/index.ts | head -1
else
    echo -e "${RED}✗ Local version missing improved error handling${NC}"
fi

echo ""
echo -e "${YELLOW}2. Testing deployed Square function...${NC}"
echo ""

# Test the deployed function
RESPONSE=$(curl -s https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-square)
echo "Health check response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo ""
echo -e "${YELLOW}3. Deployment Options:${NC}"
echo ""
echo "Option A: Via GitHub Actions (Recommended)"
echo "  1. Make a small change to supabase/functions/payments-square/index.ts"
echo "  2. Commit and push to main branch"
echo "  3. GitHub Actions will auto-deploy"
echo ""
echo "Option B: Via Supabase Dashboard"
echo "  1. Go to: https://app.supabase.com/project/aszzhlgwfbijaotfddsh/functions/payments-square"
echo "  2. Click 'Deploy' button"
echo ""
echo "Option C: Trigger GitHub Action Manually"
echo "  1. Go to: https://github.com/YOUR_REPO/actions/workflows/deploy-edge-functions.yml"
echo "  2. Click 'Run workflow' > 'Run workflow'"
echo ""

# Create a simple file change to trigger deployment
echo -e "${YELLOW}4. Quick deployment trigger:${NC}"
echo ""
echo "Run this command to add a version comment and trigger deployment:"
echo ""
echo -e "${GREEN}echo '// Version: $(date +%Y%m%d-%H%M%S)' >> supabase/functions/payments-square/index.ts${NC}"
echo -e "${GREEN}git add supabase/functions/payments-square/index.ts${NC}"
echo -e "${GREEN}git commit -m 'Redeploy Square function with improved error handling'${NC}"
echo -e "${GREEN}git push origin main${NC}"