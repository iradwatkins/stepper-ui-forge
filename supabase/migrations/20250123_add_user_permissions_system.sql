-- Migration: Add User Permissions System
-- This migration adds a permission system to track user roles and automatically upgrades users to organizers

-- Create permission enum type
CREATE TYPE user_permission AS ENUM (
  'regular_user',   -- Default for new users
  'seller',         -- Can sell tickets for assigned events
  'team_member',    -- Can work events as team member
  'co_organizer',   -- Co-organizer for specific events
  'organizer',      -- Has created at least one event
  'admin'           -- Platform administrator
);

-- Add permission column to profiles table
ALTER TABLE profiles 
ADD COLUMN permission user_permission DEFAULT 'regular_user';

-- Create index for better query performance
CREATE INDEX idx_profiles_permission ON profiles(permission);

-- Update RLS policies to include permission checking
DROP POLICY IF EXISTS "Users can create events" ON events;

CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND permission IN ('regular_user', 'seller', 'team_member', 'co_organizer', 'organizer', 'admin')
        )
    );

-- Create function to upgrade user to organizer
CREATE OR REPLACE FUNCTION upgrade_user_to_organizer()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the user's first event
  IF NOT EXISTS (
    SELECT 1 FROM events 
    WHERE owner_id = NEW.owner_id 
    AND id != NEW.id
  ) THEN
    -- Upgrade user to organizer if they're currently a regular user
    UPDATE profiles 
    SET 
      permission = 'organizer',
      updated_at = NOW()
    WHERE id = NEW.owner_id
    AND permission = 'regular_user';
    
    -- Log the upgrade for audit purposes
    RAISE NOTICE 'User % upgraded to organizer after creating first event %', NEW.owner_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-upgrade users when they create their first event
CREATE TRIGGER trigger_upgrade_to_organizer
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION upgrade_user_to_organizer();

-- Function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(user_id UUID, required_permission user_permission)
RETURNS BOOLEAN AS $$
DECLARE
  user_perm user_permission;
BEGIN
  SELECT permission INTO user_perm
  FROM profiles
  WHERE id = user_id;
  
  -- Define permission hierarchy
  CASE required_permission
    WHEN 'regular_user' THEN
      RETURN TRUE; -- Everyone has at least regular_user permission
    WHEN 'seller' THEN
      RETURN user_perm IN ('seller', 'team_member', 'co_organizer', 'organizer', 'admin');
    WHEN 'team_member' THEN
      RETURN user_perm IN ('team_member', 'co_organizer', 'organizer', 'admin');
    WHEN 'co_organizer' THEN
      RETURN user_perm IN ('co_organizer', 'organizer', 'admin');
    WHEN 'organizer' THEN
      RETURN user_perm IN ('organizer', 'admin');
    WHEN 'admin' THEN
      RETURN user_perm = 'admin';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON COLUMN profiles.permission IS 'User permission level in the system hierarchy';
COMMENT ON TYPE user_permission IS 'User permission levels: regular_user < seller < team_member < co_organizer < organizer < admin';