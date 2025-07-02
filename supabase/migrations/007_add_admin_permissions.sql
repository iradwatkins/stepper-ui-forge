-- Migration: Add Admin Permissions System
-- This migration adds proper admin role management to the profiles table

-- Add admin permission field to profiles table
ALTER TABLE profiles 
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN admin_level INTEGER DEFAULT 0; -- 0=regular, 1=moderator, 2=admin, 3=super_admin

-- Create admin_permissions table for granular admin permissions
CREATE TABLE admin_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    can_manage_users BOOLEAN DEFAULT FALSE,
    can_manage_events BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT FALSE,
    can_manage_system BOOLEAN DEFAULT FALSE,
    can_manage_billing BOOLEAN DEFAULT FALSE,
    granted_by UUID REFERENCES profiles(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add indexes for performance
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX idx_profiles_admin_level ON profiles(admin_level);
CREATE INDEX idx_admin_permissions_user_id ON admin_permissions(user_id);
CREATE INDEX idx_admin_permissions_is_active ON admin_permissions(is_active);

-- Enable RLS on admin_permissions table
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_permissions
CREATE POLICY "Admins can view all admin permissions" ON admin_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.is_admin = true OR profiles.admin_level >= 2)
        )
    );

CREATE POLICY "Users can view own admin permissions" ON admin_permissions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage admin permissions" ON admin_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.admin_level >= 3
        )
    );

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((
        SELECT is_admin 
        FROM profiles 
        WHERE id = user_uuid
    ), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin permissions
CREATE OR REPLACE FUNCTION get_admin_permissions(user_uuid UUID)
RETURNS TABLE (
    is_admin BOOLEAN,
    admin_level INTEGER,
    can_manage_users BOOLEAN,
    can_manage_events BOOLEAN,
    can_view_analytics BOOLEAN,
    can_manage_system BOOLEAN,
    can_manage_billing BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.is_admin, false) as is_admin,
        COALESCE(p.admin_level, 0) as admin_level,
        COALESCE(ap.can_manage_users, false) as can_manage_users,
        COALESCE(ap.can_manage_events, false) as can_manage_events,
        COALESCE(ap.can_view_analytics, false) as can_view_analytics,
        COALESCE(ap.can_manage_system, false) as can_manage_system,
        COALESCE(ap.can_manage_billing, false) as can_manage_billing
    FROM profiles p
    LEFT JOIN admin_permissions ap ON ap.user_id = p.id AND ap.is_active = true
    WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote user to admin (only super admins can do this)
CREATE OR REPLACE FUNCTION promote_user_to_admin(
    target_user_id UUID,
    admin_level_param INTEGER DEFAULT 1,
    granted_by_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
    granter_level INTEGER;
BEGIN
    -- Check if the granter has sufficient permissions
    SELECT COALESCE(admin_level, 0) INTO granter_level
    FROM profiles 
    WHERE id = granted_by_id;
    
    -- Only super admins (level 3) can promote users
    IF granter_level < 3 THEN
        RAISE EXCEPTION 'Insufficient permissions to promote users';
    END IF;
    
    -- Update the target user's admin status
    UPDATE profiles 
    SET 
        is_admin = true,
        admin_level = admin_level_param,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Create or update admin permissions
    INSERT INTO admin_permissions (
        user_id,
        can_manage_users,
        can_manage_events,
        can_view_analytics,
        can_manage_system,
        can_manage_billing,
        granted_by
    ) VALUES (
        target_user_id,
        admin_level_param >= 2, -- Admins and above can manage users
        admin_level_param >= 1, -- All admin levels can manage events
        admin_level_param >= 1, -- All admin levels can view analytics
        admin_level_param >= 3, -- Only super admins can manage system
        admin_level_param >= 3, -- Only super admins can manage billing
        granted_by_id
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        can_manage_users = admin_level_param >= 2,
        can_manage_events = admin_level_param >= 1,
        can_view_analytics = admin_level_param >= 1,
        can_manage_system = admin_level_param >= 3,
        can_manage_billing = admin_level_param >= 3,
        granted_by = granted_by_id,
        granted_at = NOW(),
        revoked_at = NULL,
        is_active = true,
        updated_at = NOW();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke admin access
CREATE OR REPLACE FUNCTION revoke_admin_access(
    target_user_id UUID,
    revoked_by_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
    revoker_level INTEGER;
BEGIN
    -- Check if the revoker has sufficient permissions
    SELECT COALESCE(admin_level, 0) INTO revoker_level
    FROM profiles 
    WHERE id = revoked_by_id;
    
    -- Only super admins (level 3) can revoke admin access
    IF revoker_level < 3 THEN
        RAISE EXCEPTION 'Insufficient permissions to revoke admin access';
    END IF;
    
    -- Update the target user's admin status
    UPDATE profiles 
    SET 
        is_admin = false,
        admin_level = 0,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Revoke admin permissions
    UPDATE admin_permissions 
    SET 
        revoked_at = NOW(),
        is_active = false,
        updated_at = NOW()
    WHERE user_id = target_user_id AND is_active = true;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger for admin_permissions
CREATE TRIGGER handle_admin_permissions_updated_at
    BEFORE UPDATE ON admin_permissions
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Add profile creation trigger to ensure new users get default permissions
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert profile for new user with default settings
    INSERT INTO profiles (
        id,
        email,
        full_name,
        is_admin,
        admin_level,
        notification_preferences,
        privacy_settings
    ) VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        false,
        0,
        '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}',
        '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- Comments for documentation
COMMENT ON TABLE admin_permissions IS 'Granular admin permissions for platform administration';
COMMENT ON COLUMN profiles.is_admin IS 'Boolean flag indicating if user has any admin privileges';
COMMENT ON COLUMN profiles.admin_level IS 'Admin level: 0=regular, 1=moderator, 2=admin, 3=super_admin';
COMMENT ON FUNCTION is_user_admin(UUID) IS 'Check if a user has admin privileges';
COMMENT ON FUNCTION get_admin_permissions(UUID) IS 'Get detailed admin permissions for a user';