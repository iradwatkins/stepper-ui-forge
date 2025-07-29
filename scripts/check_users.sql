-- Check existing users and their roles

-- 1. Show all users with their roles
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.organization,
  CASE 
    WHEN p.is_admin THEN 'Admin'
    WHEN EXISTS (SELECT 1 FROM events WHERE owner_id = p.id) THEN 'Event Organizer'
    ELSE 'Regular User'
  END as user_type,
  p.created_at
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 20;

-- 2. Show existing follower relationships
SELECT 
  'Existing Relationships' as section,
  pf.email as follower_email,
  pf.full_name as follower_name,
  po.email as organizer_email,
  po.full_name as organizer_name,
  uf.created_at as followed_since
FROM user_follows uf
JOIN profiles pf ON pf.id = uf.follower_id
JOIN profiles po ON po.id = uf.organizer_id
ORDER BY uf.created_at DESC;

-- 3. Show follower permissions
SELECT 
  'Permissions' as section,
  p.email,
  p.full_name,
  fp.can_sell_tickets,
  fp.can_work_events,
  fp.is_co_organizer,
  fp.commission_type,
  CASE 
    WHEN fp.commission_type = 'percentage' THEN fp.commission_rate || '%'
    WHEN fp.commission_type = 'fixed' THEN '$' || fp.commission_fixed_amount
    ELSE 'N/A'
  END as commission
FROM follower_promotions fp
JOIN profiles p ON p.id = fp.follower_id
ORDER BY fp.created_at DESC;