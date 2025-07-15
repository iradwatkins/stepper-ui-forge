-- Migration: Setup Initial Admin User
-- This migration sets up iradwatkins@gmail.com as the initial super admin

-- Function to set up initial admin user
CREATE OR REPLACE FUNCTION setup_initial_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'iradwatkins@gmail.com';
BEGIN
    -- Find the user by email
    SELECT id INTO admin_user_id
    FROM profiles
    WHERE email = admin_email;
    
    -- If user doesn't exist, we can't set them up yet
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user % not found. They need to sign up first.', admin_email;
        RETURN FALSE;
    END IF;
    
    -- Check if already admin
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = admin_user_id 
        AND is_admin = true 
        AND admin_level >= 3
    ) THEN
        RAISE NOTICE 'User % is already a super admin', admin_email;
        RETURN TRUE;
    END IF;
    
    -- Update user to super admin
    UPDATE profiles 
    SET 
        is_admin = true,
        admin_level = 3, -- Super admin
        updated_at = NOW()
    WHERE id = admin_user_id;
    
    -- Create admin permissions entry
    INSERT INTO admin_permissions (
        user_id,
        can_manage_users,
        can_manage_events,
        can_view_analytics,
        can_manage_system,
        can_manage_billing,
        granted_by,
        granted_at,
        is_active
    ) VALUES (
        admin_user_id,
        true,  -- can_manage_users
        true,  -- can_manage_events
        true,  -- can_view_analytics
        true,  -- can_manage_system
        true,  -- can_manage_billing
        admin_user_id, -- self-granted for initial setup
        NOW(),
        true
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        can_manage_users = true,
        can_manage_events = true,
        can_view_analytics = true,
        can_manage_system = true,
        can_manage_billing = true,
        granted_by = admin_user_id,
        granted_at = NOW(),
        revoked_at = NULL,
        is_active = true,
        updated_at = NOW();
    
    RAISE NOTICE 'Successfully set up % as super admin', admin_email;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Try to set up the admin user if they exist
SELECT setup_initial_admin_user();

-- Comment for documentation
COMMENT ON FUNCTION setup_initial_admin_user() IS 'Sets up iradwatkins@gmail.com as the initial super admin if they have signed up';