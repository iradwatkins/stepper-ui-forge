-- Migration: Add Seller Payouts System
-- This migration creates the payout tracking system for organizers to pay sellers

-- Create payout method enum
CREATE TYPE payout_method AS ENUM (
    'zelle',
    'cashapp', 
    'venmo',
    'paypal',
    'check',
    'cash',
    'other'
);

-- Create seller payouts table to track when organizers pay sellers
CREATE TABLE seller_payouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Payout details
    amount DECIMAL(10,2) NOT NULL,
    payout_method payout_method NOT NULL,
    payout_reference TEXT, -- Transaction ID, check number, etc
    payout_notes TEXT, -- Optional notes from organizer
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'paid', -- 'paid', 'pending', 'cancelled'
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Related earnings
    commission_earnings_ids UUID[] DEFAULT '{}', -- Array of commission_earnings IDs this payout covers
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add commission amount per ticket to ticket_types table
ALTER TABLE ticket_types
ADD COLUMN commission_amount DECIMAL(10,2) DEFAULT 0.00;

-- Add status field to team_members for disable/enable functionality
ALTER TABLE team_members
ADD COLUMN status VARCHAR(20) DEFAULT 'active', -- 'active', 'disabled'
ADD COLUMN disabled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN disabled_by UUID REFERENCES profiles(id),
ADD COLUMN disable_reason TEXT;

-- Update commission_earnings to track payout status
ALTER TABLE commission_earnings
ADD COLUMN payout_id UUID REFERENCES seller_payouts(id),
ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;

-- Create event_likes table for users to like/favorite events
CREATE TABLE event_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Add QR code lockout tracking to tickets table
ALTER TABLE tickets
ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_used_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX idx_seller_payouts_event_id ON seller_payouts(event_id);
CREATE INDEX idx_seller_payouts_organizer_id ON seller_payouts(organizer_id);
CREATE INDEX idx_seller_payouts_seller_id ON seller_payouts(seller_id);
CREATE INDEX idx_seller_payouts_status ON seller_payouts(status);
CREATE INDEX idx_event_likes_user_id ON event_likes(user_id);
CREATE INDEX idx_event_likes_event_id ON event_likes(event_id);
CREATE INDEX idx_commission_earnings_payout_id ON commission_earnings(payout_id);
CREATE INDEX idx_team_members_status ON team_members(status);

-- Enable RLS on new tables
ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_payouts
CREATE POLICY "Organizers can manage their payouts" ON seller_payouts
    FOR ALL USING (organizer_id = auth.uid());

CREATE POLICY "Sellers can view their payouts" ON seller_payouts
    FOR SELECT USING (seller_id = auth.uid());

-- RLS Policies for event_likes
CREATE POLICY "Users can manage their own likes" ON event_likes
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Anyone can view event likes count" ON event_likes
    FOR SELECT USING (true);

-- Add updated_at trigger for seller_payouts
CREATE TRIGGER handle_seller_payouts_updated_at
    BEFORE UPDATE ON seller_payouts
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to calculate total unpaid commissions for a seller
CREATE OR REPLACE FUNCTION get_unpaid_commissions(seller_uuid UUID, event_uuid UUID)
RETURNS TABLE (
    total_unpaid DECIMAL(10,2),
    unpaid_count INTEGER,
    commission_ids UUID[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(commission_amount), 0.00) as total_unpaid,
        COUNT(*)::INTEGER as unpaid_count,
        ARRAY_AGG(id) as commission_ids
    FROM commission_earnings
    WHERE follower_id = seller_uuid 
    AND event_id = event_uuid
    AND status = 'confirmed'
    AND payout_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark commissions as paid
CREATE OR REPLACE FUNCTION mark_commissions_paid(payout_uuid UUID, commission_ids UUID[])
RETURNS VOID AS $$
BEGIN
    UPDATE commission_earnings
    SET 
        payout_id = payout_uuid,
        paid_at = NOW(),
        status = 'paid'
    WHERE id = ANY(commission_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lock QR code after event
CREATE OR REPLACE FUNCTION lock_event_qr_codes()
RETURNS TRIGGER AS $$
BEGIN
    -- Lock all QR codes for the event for 1 year after the event date
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE tickets
        SET 
            locked_until = (NEW.date + INTERVAL '1 year')::TIMESTAMP WITH TIME ZONE,
            last_used_at = NOW()
        WHERE event_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically lock QR codes when event is marked as completed
CREATE TRIGGER lock_qr_codes_on_event_complete
    AFTER UPDATE ON events
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION lock_event_qr_codes();

-- Function to validate QR code is not locked
CREATE OR REPLACE FUNCTION validate_qr_code_not_locked(ticket_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    ticket_record RECORD;
BEGIN
    SELECT locked_until INTO ticket_record
    FROM tickets
    WHERE id = ticket_uuid;
    
    IF ticket_record.locked_until IS NULL THEN
        RETURN TRUE;
    END IF;
    
    RETURN NOW() > ticket_record.locked_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unpaid commissions by seller for organizer payout UI
CREATE OR REPLACE FUNCTION get_unpaid_commissions_by_seller(
    event_id_param UUID,
    organizer_id_param UUID
)
RETURNS TABLE (
    seller_id UUID,
    seller_name TEXT,
    seller_email TEXT,
    total_unpaid DECIMAL(10,2),
    unpaid_count INTEGER,
    commission_ids UUID[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.follower_id as seller_id,
        p.full_name as seller_name,
        p.email as seller_email,
        SUM(ce.commission_amount) as total_unpaid,
        COUNT(ce.id)::INTEGER as unpaid_count,
        ARRAY_AGG(ce.id) as commission_ids
    FROM commission_earnings ce
    JOIN profiles p ON p.id = ce.follower_id
    WHERE ce.event_id = event_id_param
    AND ce.organizer_id = organizer_id_param
    AND ce.status = 'confirmed'
    AND ce.payout_id IS NULL
    GROUP BY ce.follower_id, p.full_name, p.email
    HAVING SUM(ce.commission_amount) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;