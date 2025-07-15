-- Migration: Enhance QR System with 7-digit backup codes and improved validation
-- This migration adds 7-digit backup codes and enhances QR code validation

-- Add 7-digit backup code to tickets table
ALTER TABLE tickets
ADD COLUMN backup_code VARCHAR(7) UNIQUE,
ADD COLUMN scanned_by UUID REFERENCES profiles(id),
ADD COLUMN scanned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN scan_attempts INTEGER DEFAULT 0,
ADD COLUMN is_manual_entry BOOLEAN DEFAULT FALSE;

-- Update QR code format to include both QR and backup code
-- QR code will contain JSON with both codes for validation

-- Create function to generate 7-digit alphanumeric backup code
CREATE OR REPLACE FUNCTION generate_backup_code()
RETURNS VARCHAR(7) AS $$
DECLARE
    chars TEXT = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789'; -- Exclude confusing chars like O, 0, I, 1
    result VARCHAR(7);
    i INTEGER;
    is_unique BOOLEAN = FALSE;
BEGIN
    WHILE NOT is_unique LOOP
        result := '';
        FOR i IN 1..7 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Check uniqueness across all active tickets
        SELECT NOT EXISTS (
            SELECT 1 FROM tickets 
            WHERE backup_code = result 
            AND status = 'active'
        ) INTO is_unique;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate ticket by QR code or backup code
CREATE OR REPLACE FUNCTION validate_ticket_entry(
    event_id_param UUID,
    code_param TEXT,
    scanned_by_param UUID,
    is_manual BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    ticket_id UUID,
    holder_name TEXT,
    ticket_type TEXT,
    already_used BOOLEAN
) AS $$
DECLARE
    ticket_record RECORD;
    event_record RECORD;
    ticket_type_record RECORD;
BEGIN
    -- Get event info
    SELECT * INTO event_record FROM events WHERE id = event_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Event not found', NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE;
        RETURN;
    END IF;
    
    -- Try to find ticket by QR code or backup code
    IF is_manual THEN
        -- Manual entry - check backup code
        SELECT t.*, tt.name as type_name 
        INTO ticket_record, ticket_type_record
        FROM tickets t
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        WHERE t.backup_code = code_param 
        AND t.event_id = event_id_param;
    ELSE
        -- QR scan - parse JSON and check QR code
        BEGIN
            SELECT t.*, tt.name as type_name 
            INTO ticket_record, ticket_type_record
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            WHERE t.qr_code = code_param 
            AND t.event_id = event_id_param;
        EXCEPTION
            WHEN OTHERS THEN
                -- Invalid QR format, try backup code as fallback
                SELECT t.*, tt.name as type_name 
                INTO ticket_record, ticket_type_record
                FROM tickets t
                JOIN ticket_types tt ON t.ticket_type_id = tt.id
                WHERE t.backup_code = code_param 
                AND t.event_id = event_id_param;
        END;
    END IF;
    
    -- Check if ticket found
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Invalid ticket code', NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE;
        RETURN;
    END IF;
    
    -- Check if ticket is active
    IF ticket_record.status != 'active' THEN
        RETURN QUERY SELECT FALSE, 'Ticket is not active', ticket_record.id, ticket_record.holder_name, ticket_type_record.name, FALSE;
        RETURN;
    END IF;
    
    -- Check if ticket is locked (1-year lockout)
    IF ticket_record.locked_until IS NOT NULL AND NOW() < ticket_record.locked_until THEN
        RETURN QUERY SELECT FALSE, 'Ticket is locked', ticket_record.id, ticket_record.holder_name, ticket_type_record.name, FALSE;
        RETURN;
    END IF;
    
    -- Check if already checked in
    IF ticket_record.checked_in_at IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, 'Ticket already used', ticket_record.id, ticket_record.holder_name, ticket_type_record.name, TRUE;
        RETURN;
    END IF;
    
    -- Valid ticket - mark as checked in
    UPDATE tickets
    SET 
        checked_in_at = NOW(),
        checked_in_by = scanned_by_param,
        scanned_by = scanned_by_param,
        scanned_at = NOW(),
        scan_attempts = scan_attempts + 1,
        is_manual_entry = is_manual
    WHERE id = ticket_record.id;
    
    -- Return success
    RETURN QUERY SELECT TRUE, 'Entry granted', ticket_record.id, ticket_record.holder_name, ticket_type_record.name, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to generate backup code when ticket is created
CREATE OR REPLACE FUNCTION generate_ticket_backup_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.backup_code IS NULL THEN
        NEW.backup_code = generate_backup_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to tickets table
DROP TRIGGER IF EXISTS trigger_generate_backup_code ON tickets;
CREATE TRIGGER trigger_generate_backup_code
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_backup_code();

-- Create entry log table for tracking all scan attempts
CREATE TABLE ticket_entry_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    scanned_by UUID REFERENCES profiles(id) NOT NULL,
    scan_method VARCHAR(20) NOT NULL, -- 'qr_code', 'backup_code'
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tickets_backup_code ON tickets(backup_code);
CREATE INDEX idx_tickets_scanned_by ON tickets(scanned_by);
CREATE INDEX idx_ticket_entry_logs_event_id ON ticket_entry_logs(event_id);
CREATE INDEX idx_ticket_entry_logs_scanned_by ON ticket_entry_logs(scanned_by);
CREATE INDEX idx_ticket_entry_logs_scanned_at ON ticket_entry_logs(scanned_at);

-- Enable RLS on new table
ALTER TABLE ticket_entry_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_entry_logs
CREATE POLICY "Team members can view entry logs for their events" ON ticket_entry_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.event_id = ticket_entry_logs.event_id
            AND tm.status = 'active'
        )
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = ticket_entry_logs.event_id
            AND e.owner_id = auth.uid()
        )
    );

CREATE POLICY "Team members can create entry logs" ON ticket_entry_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.event_id = ticket_entry_logs.event_id
            AND tm.status = 'active'
        )
        AND scanned_by = auth.uid()
    );

-- Function to get scan statistics for team members
CREATE OR REPLACE FUNCTION get_team_member_scan_stats(
    team_member_id UUID,
    event_id_param UUID
)
RETURNS TABLE (
    total_scans INTEGER,
    successful_scans INTEGER,
    failed_scans INTEGER,
    last_scan_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_scans,
        COUNT(*) FILTER (WHERE success = TRUE)::INTEGER as successful_scans,
        COUNT(*) FILTER (WHERE success = FALSE)::INTEGER as failed_scans,
        MAX(scanned_at) as last_scan_at
    FROM ticket_entry_logs
    WHERE scanned_by = team_member_id
    AND event_id = event_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing tickets to have backup codes (for existing data)
UPDATE tickets 
SET backup_code = generate_backup_code() 
WHERE backup_code IS NULL;