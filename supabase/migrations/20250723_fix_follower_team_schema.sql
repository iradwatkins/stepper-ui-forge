-- Fix follower_promotions and team_members schema mismatches
-- This migration adds missing columns that are expected by the application code

-- Add missing columns to follower_promotions table
DO $$
BEGIN
    -- Add commission_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'follower_promotions' 
                   AND column_name = 'commission_type') THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN commission_type VARCHAR(20) DEFAULT 'percentage' 
        CHECK (commission_type IN ('percentage', 'fixed'));
        
        COMMENT ON COLUMN follower_promotions.commission_type IS 'Type of commission: percentage or fixed amount';
    END IF;

    -- Add commission_fixed_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'follower_promotions' 
                   AND column_name = 'commission_fixed_amount') THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN commission_fixed_amount DECIMAL(10,2) DEFAULT 0.00;
        
        COMMENT ON COLUMN follower_promotions.commission_fixed_amount IS 'Fixed dollar amount for commission when commission_type is fixed';
    END IF;

    -- Add can_work_events column if it doesn't exist (referenced in errors)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'follower_promotions' 
                   AND column_name = 'can_work_events') THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN can_work_events BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN follower_promotions.can_work_events IS 'Whether the follower can work at events as team member';
    END IF;
END $$;

-- Add missing columns to team_members table
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'team_members' 
                   AND column_name = 'status') THEN
        ALTER TABLE team_members 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'disabled'));
        
        COMMENT ON COLUMN team_members.status IS 'Status of the team member: active or disabled';
    END IF;

    -- Add disabled_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'team_members' 
                   AND column_name = 'disabled_at') THEN
        ALTER TABLE team_members 
        ADD COLUMN disabled_at TIMESTAMP WITH TIME ZONE;
        
        COMMENT ON COLUMN team_members.disabled_at IS 'Timestamp when the team member was disabled';
    END IF;

    -- Add disabled_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'team_members' 
                   AND column_name = 'disabled_by') THEN
        ALTER TABLE team_members 
        ADD COLUMN disabled_by UUID REFERENCES auth.users(id);
        
        COMMENT ON COLUMN team_members.disabled_by IS 'User who disabled this team member';
    END IF;

    -- Add disable_reason column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'team_members' 
                   AND column_name = 'disable_reason') THEN
        ALTER TABLE team_members 
        ADD COLUMN disable_reason TEXT;
        
        COMMENT ON COLUMN team_members.disable_reason IS 'Reason for disabling the team member';
    END IF;
END $$;

-- Update the get_user_permissions function to include new commission columns
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_follower_promotions_commission_type 
ON follower_promotions(commission_type) 
WHERE commission_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_status 
ON team_members(status) 
WHERE status = 'active';

-- Grant necessary permissions
GRANT SELECT ON follower_promotions TO authenticated;
GRANT SELECT ON team_members TO authenticated;