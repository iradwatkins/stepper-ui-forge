-- First, let's check existing users
SELECT id, email, full_name, organization, is_admin 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- Find users who can be organizers (have created events)
SELECT DISTINCT p.id, p.email, p.full_name, 'organizer' as role
FROM profiles p
JOIN events e ON e.owner_id = p.id
LIMIT 5;

-- Find regular users who can become followers
SELECT id, email, full_name, 'potential_follower' as role
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM events WHERE owner_id = p.id
)
AND is_admin = false
LIMIT 10;
EOF < /dev/null