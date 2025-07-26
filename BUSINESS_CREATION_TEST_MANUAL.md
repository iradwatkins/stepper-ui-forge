# Business Creation Flow Test Manual

This manual describes the comprehensive test suite for the business creation and management system.

## Test Files Created

### 1. `/src/__tests__/BusinessCreationFlow.test.tsx`
**Purpose:** Jest unit and integration tests for React components and services
**Coverage:**
- CreateBusinessSteps component rendering and form validation
- CommunityBusinessService.createBusiness method
- Form step navigation and validation
- Database integration mocking
- Error handling scenarios

### 2. `/scripts/test-business-creation-flow.js`
**Purpose:** End-to-end integration test with real Supabase database
**Coverage:**
- Real database operations
- Complete business creation workflow
- Data persistence verification
- Business retrieval and filtering
- Dashboard integration
- Community page display
- Form validation at database level

### 3. `/scripts/run-business-tests.sh`
**Purpose:** Test runner script that executes all business-related tests
**Features:**
- Runs Jest unit tests
- Executes integration tests
- Generates coverage reports
- Provides comprehensive test summary

## What These Tests Verify

### ✅ Frontend Form Validation
- **Step Navigation:** Users can navigate through all 5 form steps
- **Required Fields:** Form validates required fields based on business type
- **Field Mapping:** All form fields map correctly to database schema
- **Error Handling:** Form shows appropriate validation errors
- **Business Type Logic:** Different business types require different fields

### ✅ Backend Service Layer
- **CommunityBusinessService.createBusiness:** Creates business records correctly
- **Data Transformation:** Form data transforms properly for database storage
- **User Association:** Businesses are correctly associated with authenticated users
- **Status Management:** New businesses default to "pending" status
- **Error Handling:** Service handles database errors gracefully

### ✅ Database Storage
- **Schema Compliance:** All fields saved according to database schema
- **Data Types:** JSON fields (business_hours, social_media) stored correctly
- **Array Fields:** Tags and specialties arrays stored properly
- **Constraints:** Database enforces NOT NULL and enum constraints
- **Timestamps:** created_at and updated_at timestamps set correctly
- **Default Values:** Default values (view_count, rating, etc.) applied

### ✅ Business Retrieval
- **Public Access:** Approved businesses visible in Community page
- **Owner Access:** Business owners can see their pending businesses
- **Filtering:** Businesses filter correctly by category, type, location
- **Search:** Business search functionality works
- **Sorting:** Results sort by various criteria (newest, rating, etc.)

### ✅ Dashboard Integration
- **My Businesses:** Users can view their own businesses in dashboard
- **Edit Capability:** Users can edit their own business information
- **Status Tracking:** Users can see approval status of their businesses
- **Permissions:** Users can only edit their own businesses

### ✅ Community Page Display
- **Approved Only:** Only approved businesses show to public
- **Featured Businesses:** Featured businesses display prominently
- **Business Cards:** Business information displays correctly in cards
- **Contact Info:** Contact information displays and functions properly
- **Location Data:** Address and location information shows correctly

## Running the Tests

### Option 1: Run All Tests (Recommended)
```bash
./scripts/run-business-tests.sh
```

### Option 2: Run Individual Test Types

**Jest Unit Tests:**
```bash
npm test -- --testPathPattern=BusinessCreationFlow.test.tsx
```

**Integration Tests:**
```bash
node scripts/test-business-creation-flow.js
```

**Coverage Report:**
```bash
npm run test:coverage -- --testPathPattern=BusinessCreationFlow.test.tsx
```

## Test Data

The tests use realistic business data:
```javascript
{
  business_name: 'Test Stepping Studio',
  description: 'A premier stepping studio offering classes for all skill levels...',
  category: 'fitness_sports',
  business_type: 'physical_business',
  contact_email: 'info@teststrippingstudio.com',
  contact_phone: '(555) 123-4567',
  website_url: 'https://teststrippingstudio.com',
  address: '123 Dance Street',
  city: 'Chicago',
  state: 'Illinois',
  zip_code: '60601',
  price_range: '$$',
  tags: ['stepping', 'dance classes', 'chicago stepping'],
  specialties: ['Chicago Stepping', 'Partner Dancing'],
  business_hours: { /* full week schedule */ },
  social_media: { facebook: '...', instagram: '...' }
}
```

## Expected Test Results

When all tests pass, you should see:
- ✅ All form steps render correctly
- ✅ Form validation works for all business types
- ✅ Business data saves to database with correct structure
- ✅ All required fields are properly stored
- ✅ Business appears in Community page (when approved)
- ✅ Business appears in user's dashboard
- ✅ Business can be edited by owner
- ✅ Filtering and search work correctly
- ✅ Database constraints are enforced

## Troubleshooting

### Common Issues:

**Tests fail with "Supabase connection error":**
- Check `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Verify Supabase project is running
- Check network connectivity

**Tests fail with "Table does not exist":**
- Run database migrations: `supabase db push`
- Verify `community_businesses` table exists
- Check RLS policies are applied

**Tests fail with "Permission denied":**
- Verify RLS policies allow authenticated users to insert
- Check test user has proper authentication
- Verify service role permissions

**Form validation tests fail:**
- Check Zod validation schemas match business types
- Verify required field logic is correct
- Check form step validation functions

## Manual Verification Steps

After tests pass, manually verify:

1. **Create Business Flow:**
   - Visit `/create-business-steps`
   - Complete all form steps
   - Submit form successfully

2. **Dashboard View:**
   - Go to `/dashboard/my-businesses`
   - See created business listed
   - Edit business successfully

3. **Community Display:**
   - Visit `/community`
   - Search for business (if approved)
   - Filter by category/type

4. **Data Persistence:**
   - Check Supabase dashboard
   - Verify business record exists
   - Confirm all fields saved correctly

## Maintenance

**When adding new business fields:**
1. Update test data in both test files
2. Add field validation tests
3. Verify database schema includes new fields
4. Test form rendering with new fields

**When changing business types:**
1. Update getRequiredFieldsForType tests
2. Verify validation logic for new types
3. Test form behavior with new type requirements

**When modifying RLS policies:**
1. Update integration tests to match new permissions
2. Test both positive and negative permission cases
3. Verify dashboard and community page access rules