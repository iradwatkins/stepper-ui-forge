-- Migration: Upgrade Existing Event Owners to Organizer Permission
-- This migration updates all existing users who have created events to have organizer permission

-- Update all users who own at least one event to organizer permission
UPDATE profiles 
SET 
  permission = 'organizer',
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT owner_id 
  FROM events
  WHERE owner_id IS NOT NULL
)
AND (permission = 'regular_user' OR permission IS NULL);

-- Also update any users who are already marked as admins to have admin permission
UPDATE profiles
SET 
  permission = 'admin',
  updated_at = NOW()
WHERE is_admin = true
AND (permission != 'admin' OR permission IS NULL);

-- Update sellers who have been granted selling permissions
UPDATE profiles
SET 
  permission = 'seller',
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT follower_id
  FROM follower_promotions
  WHERE can_sell_tickets = true
)
AND permission = 'regular_user';

-- Update team members
UPDATE profiles
SET 
  permission = 'team_member',
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT user_id
  FROM team_members
  WHERE accepted_at IS NOT NULL
)
AND permission IN ('regular_user', 'seller');

-- Update co-organizers
UPDATE profiles
SET 
  permission = 'co_organizer',
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT follower_id
  FROM follower_promotions
  WHERE is_co_organizer = true
)
AND permission IN ('regular_user', 'seller', 'team_member');

-- Log summary of updates
DO $$
DECLARE
  organizer_count INTEGER;
  admin_count INTEGER;
  seller_count INTEGER;
  team_member_count INTEGER;
  co_organizer_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO organizer_count FROM profiles WHERE permission = 'organizer';
  SELECT COUNT(*) INTO admin_count FROM profiles WHERE permission = 'admin';
  SELECT COUNT(*) INTO seller_count FROM profiles WHERE permission = 'seller';
  SELECT COUNT(*) INTO team_member_count FROM profiles WHERE permission = 'team_member';
  SELECT COUNT(*) INTO co_organizer_count FROM profiles WHERE permission = 'co_organizer';
  
  RAISE NOTICE 'Permission migration complete:';
  RAISE NOTICE '  Organizers: %', organizer_count;
  RAISE NOTICE '  Admins: %', admin_count;
  RAISE NOTICE '  Sellers: %', seller_count;
  RAISE NOTICE '  Team Members: %', team_member_count;
  RAISE NOTICE '  Co-organizers: %', co_organizer_count;
END $$;