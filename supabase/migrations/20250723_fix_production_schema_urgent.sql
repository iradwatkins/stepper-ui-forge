-- URGENT: Fix production schema errors for follower_promotions and team_members
-- Apply this migration to production ASAP to fix the 400 errors

-- Add missing columns to follower_promotions table
DO $$
BEGIN
    -- Add is_co_organizer if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'follower_promotions' 
                   AND column_name = 'is_co_organizer') THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN is_co_organizer BOOLEAN DEFAULT false;
    END IF;

    -- Add can_work_events if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'follower_promotions' 
                   AND column_name = 'can_work_events') THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN can_work_events BOOLEAN DEFAULT false;
    END IF;

    -- Add can_sell_events if missing (app expects this, not can_sell_tickets)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'follower_promotions' 
                   AND column_name = 'can_sell_events') THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN can_sell_events BOOLEAN DEFAULT false;
    END IF;

    -- Add is_approved if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'follower_promotions' 
                   AND column_name = 'is_approved') THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN is_approved BOOLEAN DEFAULT false;
    END IF;

    -- Add commission_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'follower_promotions' 
                   AND column_name = 'commission_type') THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN commission_type VARCHAR(20) DEFAULT 'percentage' 
        CHECK (commission_type IN ('percentage', 'fixed'));
    END IF;

    -- Add commission_fixed_amount if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'follower_promotions' 
                   AND column_name = 'commission_fixed_amount') THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN commission_fixed_amount DECIMAL(10,2) DEFAULT 0.00;
    END IF;

    -- Migrate data from can_sell_tickets to can_sell_events if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'follower_promotions' 
               AND column_name = 'can_sell_tickets') THEN
        UPDATE follower_promotions 
        SET can_sell_events = can_sell_tickets 
        WHERE can_sell_events = false AND can_sell_tickets = true;
    END IF;
END $$;

-- Add missing columns to team_members table
DO $$
BEGIN
    -- Add status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'team_members' 
                   AND column_name = 'status') THEN
        ALTER TABLE team_members 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'disabled'));
    END IF;

    -- Add disabled_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'team_members' 
                   AND column_name = 'disabled_at') THEN
        ALTER TABLE team_members 
        ADD COLUMN disabled_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add disabled_by column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'team_members' 
                   AND column_name = 'disabled_by') THEN
        ALTER TABLE team_members 
        ADD COLUMN disabled_by UUID REFERENCES auth.users(id);
    END IF;

    -- Add disable_reason column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'team_members' 
                   AND column_name = 'disable_reason') THEN
        ALTER TABLE team_members 
        ADD COLUMN disable_reason TEXT;
    END IF;
END $$;

-- Update the get_user_permissions function
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE (
    is_organizer boolean,
    is_seller boolean,
    is_team_member boolean,
    is_co_organizer boolean,
    commission_rate numeric,
    commission_type varchar,
    commission_fixed_amount numeric,
    can_sell_events boolean,
    can_work_events boolean
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM events 
                WHERE organizer_id = user_uuid 
                AND status = 'published'
            ) THEN true 
            ELSE false 
        END as is_organizer,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM follower_promotions fp
                WHERE fp.follower_id = user_uuid
                AND fp.is_approved = true
                AND fp.can_sell_events = true
            ) THEN true 
            ELSE false 
        END as is_seller,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM follower_promotions fp
                WHERE fp.follower_id = user_uuid
                AND fp.is_approved = true
                AND fp.can_work_events = true
            ) OR EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.user_id = user_uuid
                AND tm.status = 'active'
            ) THEN true 
            ELSE false 
        END as is_team_member,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM follower_promotions fp
                WHERE fp.follower_id = user_uuid
                AND fp.is_approved = true
                AND fp.is_co_organizer = true
            ) THEN true 
            ELSE false 
        END as is_co_organizer,
        COALESCE(
            (SELECT fp.commission_rate 
             FROM follower_promotions fp
             WHERE fp.follower_id = user_uuid
             AND fp.is_approved = true
             LIMIT 1),
            0
        ) as commission_rate,
        COALESCE(
            (SELECT fp.commission_type 
             FROM follower_promotions fp
             WHERE fp.follower_id = user_uuid
             AND fp.is_approved = true
             LIMIT 1),
            'percentage'
        ) as commission_type,
        COALESCE(
            (SELECT fp.commission_fixed_amount 
             FROM follower_promotions fp
             WHERE fp.follower_id = user_uuid
             AND fp.is_approved = true
             LIMIT 1),
            0
        ) as commission_fixed_amount,
        COALESCE(
            (SELECT fp.can_sell_events 
             FROM follower_promotions fp
             WHERE fp.follower_id = user_uuid
             AND fp.is_approved = true
             LIMIT 1),
            false
        ) as can_sell_events,
        COALESCE(
            (SELECT fp.can_work_events 
             FROM follower_promotions fp
             WHERE fp.follower_id = user_uuid
             AND fp.is_approved = true
             LIMIT 1),
            false
        ) as can_work_events;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_follower_promotions_is_co_organizer 
ON follower_promotions(is_co_organizer) 
WHERE is_co_organizer = true;

CREATE INDEX IF NOT EXISTS idx_follower_promotions_can_work_events 
ON follower_promotions(can_work_events) 
WHERE can_work_events = true;

CREATE INDEX IF NOT EXISTS idx_follower_promotions_can_sell_events 
ON follower_promotions(can_sell_events) 
WHERE can_sell_events = true;

CREATE INDEX IF NOT EXISTS idx_team_members_status 
ON team_members(status) 
WHERE status = 'active';

-- Grant permissions
GRANT SELECT ON follower_promotions TO authenticated;
GRANT SELECT ON team_members TO authenticated;