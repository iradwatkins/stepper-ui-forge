-- Check which columns exist in the events table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;

-- Check which columns exist in the ticket_types table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ticket_types'
ORDER BY ordinal_position;

-- Check if early_bird columns exist in ticket_types
SELECT 
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ticket_types' 
        AND column_name = 'early_bird_price'
    ) as has_early_bird_price,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ticket_types' 
        AND column_name = 'early_bird_until'
    ) as has_early_bird_until;

-- Check if new event columns exist
SELECT 
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'organization_name'
    ) as has_organization_name,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'display_price'
    ) as has_display_price,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'registration_deadline'
    ) as has_registration_deadline;