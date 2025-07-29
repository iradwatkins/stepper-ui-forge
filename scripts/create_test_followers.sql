-- Create Test Follower Relationships and Permissions
-- This script creates sample follower/employee relationships using actual user IDs

-- Step 1: Find an organizer (someone who has created events)
WITH organizer AS (
  SELECT DISTINCT p.id, p.email, p.full_name
  FROM profiles p
  JOIN events e ON e.owner_id = p.id
  WHERE p.email IS NOT NULL
  LIMIT 1
),
-- Step 2: Find potential followers (users who haven't created events)
followers AS (
  SELECT p.id, p.email, p.full_name
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM events WHERE owner_id = p.id
  )
  AND p.is_admin = false
  AND p.id != (SELECT id FROM organizer)
  AND p.email IS NOT NULL
  LIMIT 3
)
-- Step 3: Create follow relationships
INSERT INTO user_follows (follower_id, organizer_id)
SELECT f.id, o.id
FROM followers f, organizer o
ON CONFLICT (follower_id, organizer_id) DO NOTHING;

-- Step 4: Promote first follower as seller with 15% commission
WITH follow_data AS (
  SELECT uf.id as follow_id, uf.follower_id, uf.organizer_id
  FROM user_follows uf
  JOIN profiles p ON p.id = uf.follower_id
  WHERE p.email IS NOT NULL
  ORDER BY uf.created_at DESC
  LIMIT 1
)
INSERT INTO follower_promotions (
  follow_id, 
  organizer_id, 
  follower_id, 
  can_sell_tickets, 
  commission_rate,
  commission_type
)
SELECT 
  follow_id,
  organizer_id,
  follower_id,
  true,
  15.0,
  'percentage'
FROM follow_data
ON CONFLICT (follow_id) DO UPDATE
SET can_sell_tickets = true,
    commission_rate = 15.0;

-- Step 5: Promote second follower as team member (can check in at events)
WITH follow_data AS (
  SELECT uf.id as follow_id, uf.follower_id, uf.organizer_id
  FROM user_follows uf
  JOIN profiles p ON p.id = uf.follower_id
  WHERE p.email IS NOT NULL
  ORDER BY uf.created_at DESC
  OFFSET 1
  LIMIT 1
)
INSERT INTO follower_promotions (
  follow_id, 
  organizer_id, 
  follower_id, 
  can_work_events,
  can_sell_tickets,
  commission_rate
)
SELECT 
  follow_id,
  organizer_id,
  follower_id,
  true,
  false,
  0
FROM follow_data
ON CONFLICT (follow_id) DO UPDATE
SET can_work_events = true;

-- Step 6: Promote third follower as both seller AND team member with fixed commission
WITH follow_data AS (
  SELECT uf.id as follow_id, uf.follower_id, uf.organizer_id
  FROM user_follows uf
  JOIN profiles p ON p.id = uf.follower_id
  WHERE p.email IS NOT NULL
  ORDER BY uf.created_at DESC
  OFFSET 2
  LIMIT 1
)
INSERT INTO follower_promotions (
  follow_id, 
  organizer_id, 
  follower_id, 
  can_sell_tickets,
  can_work_events,
  commission_type,
  commission_fixed_amount
)
SELECT 
  follow_id,
  organizer_id,
  follower_id,
  true,
  true,
  'fixed',
  25.00
FROM follow_data
ON CONFLICT (follow_id) DO UPDATE
SET can_sell_tickets = true,
    can_work_events = true,
    commission_type = 'fixed',
    commission_fixed_amount = 25.00;

-- Verify the results
SELECT 
  'Organizer' as role,
  p.email,
  p.full_name,
  COUNT(DISTINCT uf.follower_id) as follower_count
FROM profiles p
LEFT JOIN user_follows uf ON uf.organizer_id = p.id
WHERE p.id IN (SELECT DISTINCT organizer_id FROM user_follows)
GROUP BY p.id, p.email, p.full_name

UNION ALL

SELECT 
  CASE 
    WHEN fp.can_sell_tickets AND fp.can_work_events THEN 'Seller + Team Member'
    WHEN fp.can_sell_tickets THEN 'Seller'
    WHEN fp.can_work_events THEN 'Team Member'
    ELSE 'Follower'
  END as role,
  p.email,
  p.full_name,
  CASE 
    WHEN fp.commission_type = 'percentage' THEN fp.commission_rate || '%'
    WHEN fp.commission_type = 'fixed' THEN '$' || fp.commission_fixed_amount
    ELSE 'N/A'
  END as commission
FROM profiles p
JOIN user_follows uf ON uf.follower_id = p.id
LEFT JOIN follower_promotions fp ON fp.follow_id = uf.id
ORDER BY role, email;