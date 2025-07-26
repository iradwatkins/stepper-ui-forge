#!/bin/bash

# Business Creation Flow Test Runner
# This script runs all tests related to business creation and management

echo "🧪 Running Business Creation Flow Tests..."
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

# Navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo -e "${BLUE}📁 Working directory: $PROJECT_DIR${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}📝 Please update .env with your actual Supabase credentials${NC}"
    else
        echo -e "${RED}❌ .env.example file not found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Run different types of tests
echo -e "\n${BLUE}=== Running Jest Unit Tests ===${NC}"
npm test -- --testPathPattern=BusinessCreationFlow.test.tsx --verbose

JEST_EXIT_CODE=$?

echo -e "\n${BLUE}=== Running Integration Test Script ===${NC}"
node scripts/test-business-creation-flow.js

INTEGRATION_EXIT_CODE=$?

# Test with coverage
echo -e "\n${BLUE}=== Running Tests with Coverage ===${NC}"
npm run test:coverage -- --testPathPattern=BusinessCreationFlow.test.tsx

COVERAGE_EXIT_CODE=$?

# Summary
echo -e "\n${BLUE}=== TEST RESULTS SUMMARY ===${NC}"
echo "================================="

if [ $JEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Jest Unit Tests: PASSED${NC}"
else
    echo -e "${RED}✗ Jest Unit Tests: FAILED${NC}"
fi

if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Integration Tests: PASSED${NC}"
else
    echo -e "${RED}✗ Integration Tests: FAILED${NC}"
fi

if [ $COVERAGE_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Coverage Report: GENERATED${NC}"
else
    echo -e "${RED}✗ Coverage Report: FAILED${NC}"
fi

# Final result
if [ $JEST_EXIT_CODE -eq 0 ] && [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Business creation flow is working correctly.${NC}"
    echo -e "${GREEN}✅ Frontend form validation working${NC}"
    echo -e "${GREEN}✅ Backend service methods working${NC}"
    echo -e "${GREEN}✅ Database storage and retrieval working${NC}"
    echo -e "${GREEN}✅ Community page integration working${NC}"
    echo -e "${GREEN}✅ Dashboard integration working${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the output above.${NC}"
    echo -e "${YELLOW}Common issues to check:${NC}"
    echo -e "${YELLOW}• Supabase connection and credentials${NC}"
    echo -e "${YELLOW}• Database schema and migrations${NC}"
    echo -e "${YELLOW}• RLS policies${NC}"
    echo -e "${YELLOW}• Environment variables${NC}"
    exit 1
fi