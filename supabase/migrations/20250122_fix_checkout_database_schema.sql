-- Fix checkout database schema issues
-- This migration ensures all required tables, functions, and relationships exist

-- Create seller_event_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS seller_event_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    promotion_id UUID REFERENCES follower_promotions(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'disabled', 'completed'
    commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a seller can only be assigned to one active event at a time
    UNIQUE(seller_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create partial unique index to enforce one active assignment per seller
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_event_assignments_unique_active 
ON seller_event_assignments(seller_id) 
WHERE status = 'active';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_seller_event_assignments_seller_id ON seller_event_assignments(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_event_assignments_event_id ON seller_event_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_seller_event_assignments_organizer_id ON seller_event_assignments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_seller_event_assignments_status ON seller_event_assignments(status);

-- Enable RLS on seller_event_assignments if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'seller_event_assignments' 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE seller_event_assignments ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Organizers can manage seller assignments for their events" ON seller_event_assignments;
DROP POLICY IF EXISTS "Sellers can view their own assignments" ON seller_event_assignments;

-- Create RLS Policies
CREATE POLICY "Organizers can manage seller assignments for their events" 
ON seller_event_assignments
FOR ALL USING (
    organizer_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = seller_event_assignments.event_id 
        AND events.owner_id = auth.uid()
    )
);

CREATE POLICY "Sellers can view their own assignments" 
ON seller_event_assignments
FOR SELECT USING (seller_id = auth.uid());

-- Add trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS handle_seller_event_assignments_updated_at ON seller_event_assignments;
CREATE TRIGGER handle_seller_event_assignments_updated_at
    BEFORE UPDATE ON seller_event_assignments
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Ensure can_sell_tickets column exists in follower_promotions table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'follower_promotions' 
        AND column_name = 'can_sell_tickets'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN can_sell_tickets BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Ensure get_admin_permissions function exists and is properly implemented
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

-- Create assign_seller_to_event function
CREATE OR REPLACE FUNCTION assign_seller_to_event(
    seller_user_id UUID,
    event_id_param UUID,
    organizer_user_id UUID,
    commission_rate_param DECIMAL(5,4) DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    assignment_id UUID
) AS $$
DECLARE
    promotion_record RECORD;
    existing_assignment_record RECORD;
    event_record RECORD;
    new_assignment_id UUID;
    final_commission_rate DECIMAL(5,4);
BEGIN
    -- Check if event exists and belongs to organizer
    SELECT * INTO event_record 
    FROM events 
    WHERE id = event_id_param AND owner_id = organizer_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Event not found or you do not have permission', NULL::UUID;
        RETURN;
    END IF;
    
    -- Check if seller has can_sell_tickets permission from organizer
    SELECT fp.*, uf.id as follow_id
    INTO promotion_record
    FROM follower_promotions fp
    JOIN user_follows uf ON uf.id = fp.follow_id
    WHERE fp.follower_id = seller_user_id 
    AND fp.organizer_id = organizer_user_id 
    AND fp.can_sell_tickets = TRUE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Seller does not have permission to sell tickets for this organizer', NULL::UUID;
        RETURN;
    END IF;
    
    -- Check if seller already has an active assignment
    SELECT * INTO existing_assignment_record
    FROM seller_event_assignments
    WHERE seller_id = seller_user_id AND status = 'active';
    
    IF FOUND THEN
        -- Get event title for better error message
        SELECT title INTO event_record FROM events WHERE id = existing_assignment_record.event_id;
        RETURN QUERY SELECT FALSE, 
            'Seller is already assigned to event: ' || COALESCE(event_record.title, 'Unknown'), 
            NULL::UUID;
        RETURN;
    END IF;
    
    -- Determine commission rate (parameter overrides promotion default)
    final_commission_rate := COALESCE(commission_rate_param, promotion_record.commission_rate, 0.0000);
    
    -- Create new assignment
    INSERT INTO seller_event_assignments (
        seller_id,
        organizer_id,
        event_id,
        promotion_id,
        commission_rate,
        status
    ) VALUES (
        seller_user_id,
        organizer_user_id,
        event_id_param,
        promotion_record.id,
        final_commission_rate,
        'active'
    ) RETURNING id INTO new_assignment_id;
    
    RETURN QUERY SELECT TRUE, 'Seller successfully assigned to event', new_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_seller_current_assignment function
CREATE OR REPLACE FUNCTION get_seller_current_assignment(seller_user_id UUID)
RETURNS TABLE (
    assignment_id UUID,
    event_id UUID,
    event_title TEXT,
    organizer_id UUID,
    organizer_name TEXT,
    commission_rate DECIMAL(5,4),
    assigned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sea.id,
        sea.event_id,
        e.title,
        sea.organizer_id,
        COALESCE(p.full_name, p.organization, 'Unknown Organizer'),
        sea.commission_rate,
        sea.assigned_at
    FROM seller_event_assignments sea
    JOIN events e ON e.id = sea.event_id
    JOIN profiles p ON p.id = sea.organizer_id
    WHERE sea.seller_id = seller_user_id 
    AND sea.status = 'active'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Add comments for documentation
COMMENT ON TABLE seller_event_assignments IS 'Enforces single event limitation for sellers - only one active assignment per seller';
COMMENT ON FUNCTION assign_seller_to_event IS 'Assigns seller to specific event with single event limitation enforcement';
COMMENT ON FUNCTION get_seller_current_assignment IS 'Gets the current active event assignment for a seller';