# 🚨 URGENT: Fix Critical Issues

## Issue 1: Database Error - "profiles" table does not exist
Your website shows this error:
```
ERROR: relation "profiles" does not exist (SQLSTATE 42P01)
```

This means your production database is missing the profiles table entirely!

### Fix Database First (CRITICAL):
1. Go to: https://supabase.com/dashboard/project/aszzhlgwfbijaotfddsh/sql/new
2. Run the initial schema migration to create the profiles table:

```sql
-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    organization_name TEXT,
    organization_type TEXT,
    website TEXT,
    about TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY IF NOT EXISTS "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);
```

## Issue 2: Duplicate "Sign In / Register" Button

After searching the codebase, I found a potential source:

### CommunitySection Component
File: `/src/components/home/CommunitySection.tsx`
- Contains "Create Account" and "Sign In" buttons
- However, this component is NOT being imported anywhere in the codebase

### To Find the Duplicate:
1. **Use Browser Developer Tools**:
   - Right-click on the duplicate blue button
   - Select "Inspect Element"
   - Look at the HTML structure and class names
   - Check the parent elements to identify which component is rendering it

2. **Check for Dynamic Imports**:
   The duplicate might be coming from:
   - A dynamically loaded component
   - Server-side rendered content
   - A third-party script or widget
   - An older cached version of the site

### If CommunitySection is the culprit:
Remove or comment out the buttons in `/src/components/home/CommunitySection.tsx`:
```tsx
// Comment out lines 18-27:
{/* {!user && (
  <div className="flex flex-col sm:flex-row justify-center gap-4">
    <Button asChild size="lg" className="bg-primary hover:bg-blue-600">
      <Link to="/account">Create Account</Link>
    </Button>
    <Button asChild variant="outline" size="lg">
      <Link to="/account">Sign In</Link>
    </Button>
  </div>
)} */}
```

### Immediate Actions:
1. **Fix the database error first** - users can't log in without the profiles table
2. **Inspect the duplicate button** in browser to find its exact source
3. **Check deployment** - ensure latest code is deployed
4. **Clear all caches** - CDN, browser, and server caches

The database error is preventing authentication entirely and must be fixed first!