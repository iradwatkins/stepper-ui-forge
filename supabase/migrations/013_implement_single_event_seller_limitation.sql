-- Migration: Implement single event limitation for sellers
-- This migration adds event-specific seller assignments to enforce one event per seller limitation

-- Create seller_event_assignments table for tracking which event a seller is currently working
CREATE TABLE seller_event_assignments (
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
CREATE UNIQUE INDEX idx_seller_event_assignments_unique_active 
ON seller_event_assignments(seller_id) 
WHERE status = 'active';

-- Add indexes for performance
CREATE INDEX idx_seller_event_assignments_seller_id ON seller_event_assignments(seller_id);
CREATE INDEX idx_seller_event_assignments_event_id ON seller_event_assignments(event_id);
CREATE INDEX idx_seller_event_assignments_organizer_id ON seller_event_assignments(organizer_id);
CREATE INDEX idx_seller_event_assignments_status ON seller_event_assignments(status);

-- Enable RLS
ALTER TABLE seller_event_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Add trigger for updated_at
CREATE TRIGGER handle_seller_event_assignments_updated_at
    BEFORE UPDATE ON seller_event_assignments
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to assign seller to specific event (enforcing single event limitation)
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

-- Function to complete seller assignment (when event ends)
CREATE OR REPLACE FUNCTION complete_seller_assignment(
    assignment_id_param UUID,
    organizer_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    assignment_record RECORD;
BEGIN
    -- Get assignment and verify organizer permission
    SELECT * INTO assignment_record
    FROM seller_event_assignments
    WHERE id = assignment_id_param 
    AND organizer_id = organizer_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Assignment not found or you do not have permission';
        RETURN;
    END IF;
    
    -- Update assignment status to completed
    UPDATE seller_event_assignments
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = assignment_id_param;
    
    RETURN QUERY SELECT TRUE, 'Seller assignment completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable seller assignment (remove from event)
CREATE OR REPLACE FUNCTION disable_seller_assignment(
    assignment_id_param UUID,
    organizer_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    assignment_record RECORD;
BEGIN
    -- Get assignment and verify organizer permission
    SELECT * INTO assignment_record
    FROM seller_event_assignments
    WHERE id = assignment_id_param 
    AND organizer_id = organizer_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Assignment not found or you do not have permission';
        RETURN;
    END IF;
    
    -- Update assignment status to disabled
    UPDATE seller_event_assignments
    SET status = 'disabled',
        updated_at = NOW()
    WHERE id = assignment_id_param;
    
    RETURN QUERY SELECT TRUE, 'Seller assignment disabled successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get seller's current event assignment
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

-- Function to get all seller assignments for an event
CREATE OR REPLACE FUNCTION get_event_seller_assignments(
    event_id_param UUID,
    organizer_user_id UUID
)
RETURNS TABLE (
    assignment_id UUID,
    seller_id UUID,
    seller_name TEXT,
    seller_email TEXT,
    commission_rate DECIMAL(5,4),
    status TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE,
    tickets_sold INTEGER,
    total_earnings DECIMAL(10,2)
) AS $$
BEGIN
    -- Verify organizer owns the event
    IF NOT EXISTS (
        SELECT 1 FROM events 
        WHERE id = event_id_param AND owner_id = organizer_user_id
    ) THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        sea.id,
        sea.seller_id,
        COALESCE(p.full_name, 'Unknown'),
        p.email,
        sea.commission_rate,
        sea.status,
        sea.assigned_at,
        COALESCE(seller_stats.tickets_sold, 0)::INTEGER,
        COALESCE(seller_stats.total_earnings, 0.00)
    FROM seller_event_assignments sea
    JOIN profiles p ON p.id = sea.seller_id
    LEFT JOIN (
        -- Get seller stats for this event
        SELECT 
            sp.seller_id,
            COUNT(sp.id) as tickets_sold,
            SUM(sp.commission_amount) as total_earnings
        FROM seller_payouts sp
        WHERE sp.event_id = event_id_param
        GROUP BY sp.seller_id
    ) seller_stats ON seller_stats.seller_id = sea.seller_id
    WHERE sea.event_id = event_id_param
    ORDER BY sea.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the referral_codes table to reference seller assignments instead of promotions
-- This ensures referral codes are event-specific
ALTER TABLE referral_codes 
ADD COLUMN seller_assignment_id UUID REFERENCES seller_event_assignments(id) ON DELETE CASCADE;

-- Create index for the new column
CREATE INDEX idx_referral_codes_seller_assignment_id ON referral_codes(seller_assignment_id);

-- Comment for documentation
COMMENT ON TABLE seller_event_assignments IS 'Enforces single event limitation for sellers - only one active assignment per seller';
COMMENT ON FUNCTION assign_seller_to_event IS 'Assigns seller to specific event with single event limitation enforcement';