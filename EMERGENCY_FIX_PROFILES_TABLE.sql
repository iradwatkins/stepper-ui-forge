-- EMERGENCY FIX: Create profiles table if it doesn't exist
-- Run this FIRST before the main migration

-- Check if profiles table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles') THEN
        
        RAISE NOTICE 'Creating profiles table...';
        
        -- Create the profiles table
        CREATE TABLE profiles (
            id UUID REFERENCES auth.users(id) PRIMARY KEY,
            email TEXT NOT NULL,
            full_name TEXT,
            avatar_url TEXT,
            bio TEXT,
            website TEXT,
            phone TEXT,
            location TEXT,
            organization TEXT,
            social_links JSONB DEFAULT '{}',
            notification_preferences JSONB DEFAULT '{
                "emailMarketing": true,
                "emailUpdates": true,
                "emailTickets": true,
                "pushNotifications": true,
                "smsNotifications": false
            }',
            privacy_settings JSONB DEFAULT '{
                "profileVisible": true,
                "showEmail": false,
                "showPhone": false,
                "showEvents": true
            }',
            is_admin BOOLEAN DEFAULT FALSE,
            admin_level INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_profiles_email ON profiles(email);
        CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);
        
        RAISE NOTICE 'Profiles table created successfully!';
    ELSE
        RAISE NOTICE 'Profiles table already exists.';
    END IF;
END $$;

-- Now create profiles for all existing users
INSERT INTO profiles (
    id,
    email,
    full_name,
    avatar_url,
    is_admin,
    admin_level,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name', 
        split_part(au.email, '@', 1)
    ) as full_name,
    COALESCE(
        au.raw_user_meta_data->>'avatar_url',
        au.raw_user_meta_data->>'picture',
        au.raw_user_meta_data->>'photo_url'
    ) as avatar_url,
    CASE WHEN au.email = 'iradwatkins@gmail.com' THEN true ELSE false END as is_admin,
    CASE WHEN au.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END as admin_level,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable" 
    ON profiles FOR SELECT 
    USING (privacy_settings->>'profileVisible' = 'true');

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;

-- Check how many profiles were created
DO $$
DECLARE
    profile_count INT;
    user_count INT;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    
    RAISE NOTICE 'Total users: %, Total profiles: %', user_count, profile_count;
    
    -- Show your specific user
    PERFORM email, full_name, avatar_url 
    FROM profiles 
    WHERE email = 'iradwatkins@gmail.com';
    
    IF FOUND THEN
        RAISE NOTICE 'Your profile exists!';
    ELSE
        RAISE NOTICE 'Your profile NOT found - creating now...';
        
        -- Force create your profile
        INSERT INTO profiles (id, email, full_name, avatar_url, is_admin, admin_level)
        SELECT id, email, 
               COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Ira Watkins'),
               COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture'),
               true, 3
        FROM auth.users
        WHERE email = 'iradwatkins@gmail.com'
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;