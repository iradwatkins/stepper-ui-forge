-- Epic 4.0: Team Management & QR Check-in System Database Enhancements
-- Migration to add team role types, check-in tables, and permission system

-- Create team role enum
CREATE TYPE team_role AS ENUM (
    'event_manager',    -- Full event control
    'check_in_staff',   -- Ticket validation only  
    'customer_service', -- Attendee assistance
    'security',         -- Security-related functions
    'vendor_coordinator' -- Vendor management
);

-- Create check-in session tracking table
CREATE TABLE check_in_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    staff_member_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    device_info JSONB DEFAULT '{}', -- Store device/browser info for tracking
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    offline_sync_pending BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create check-in activities table for audit logging
CREATE TABLE check_in_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES check_in_sessions(id) ON DELETE CASCADE NOT NULL,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL, -- 'validate', 'check_in', 'reject', 'duplicate_attempt'
    result JSONB NOT NULL, -- Store validation/check-in result details
    offline_recorded BOOLEAN DEFAULT false, -- True if recorded while offline
    synced_at TIMESTAMP WITH TIME ZONE, -- When offline data was synced
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team invitations table for invitation workflow
CREATE TABLE team_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    invited_email TEXT NOT NULL,
    invited_by UUID REFERENCES profiles(id) NOT NULL,
    role team_role NOT NULL DEFAULT 'check_in_staff',
    permissions JSONB DEFAULT '{}',
    invitation_token TEXT UNIQUE NOT NULL,
    invitation_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES profiles(id),
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alter existing team_members table to use new role enum and enhance permissions
ALTER TABLE team_members 
    ADD COLUMN role_type team_role DEFAULT 'check_in_staff',
    ADD COLUMN last_active TIMESTAMP WITH TIME ZONE,
    ADD COLUMN device_info JSONB DEFAULT '{}',
    ADD COLUMN notification_preferences JSONB DEFAULT '{
        "email_notifications": true,
        "push_notifications": true,
        "sms_notifications": false
    }';

-- Update existing team_members to use new role system
UPDATE team_members SET role_type = 'event_manager' WHERE role = 'admin' OR role = 'manager';
UPDATE team_members SET role_type = 'check_in_staff' WHERE role = 'member' OR role = 'staff';

-- Create indexes for performance
CREATE INDEX idx_check_in_sessions_event_id ON check_in_sessions(event_id);
CREATE INDEX idx_check_in_sessions_staff_member_id ON check_in_sessions(staff_member_id);
CREATE INDEX idx_check_in_sessions_active ON check_in_sessions(is_active);
CREATE INDEX idx_check_in_activities_session_id ON check_in_activities(session_id);
CREATE INDEX idx_check_in_activities_ticket_id ON check_in_activities(ticket_id);
CREATE INDEX idx_check_in_activities_action_type ON check_in_activities(action_type);
CREATE INDEX idx_team_invitations_event_id ON team_invitations(event_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(invited_email);
CREATE INDEX idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);

-- Add triggers for updated_at timestamps
CREATE TRIGGER handle_check_in_sessions_updated_at
    BEFORE UPDATE ON check_in_sessions
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_team_invitations_updated_at
    BEFORE UPDATE ON team_invitations
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to generate invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invitation_token = encode(gen_random_bytes(32), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate invitation token on creation
CREATE TRIGGER generate_invitation_token_trigger
    BEFORE INSERT ON team_invitations
    FOR EACH ROW EXECUTE FUNCTION generate_invitation_token();

-- Function to automatically expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
    UPDATE team_invitations 
    SET status = 'expired' 
    WHERE expires_at < NOW() 
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for new tables

-- Enable RLS
ALTER TABLE check_in_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Check-in sessions policies
CREATE POLICY "Event owners and team members can view check-in sessions" ON check_in_sessions
    FOR SELECT USING (
        auth.uid() = staff_member_id OR
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = check_in_sessions.event_id 
            AND events.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.event_id = check_in_sessions.event_id 
            AND team_members.user_id = auth.uid()
            AND team_members.accepted_at IS NOT NULL
        )
    );

CREATE POLICY "Team members can create own check-in sessions" ON check_in_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = staff_member_id AND
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.event_id = check_in_sessions.event_id 
            AND team_members.user_id = auth.uid()
            AND team_members.accepted_at IS NOT NULL
        )
    );

CREATE POLICY "Staff can update own check-in sessions" ON check_in_sessions
    FOR UPDATE USING (auth.uid() = staff_member_id);

-- Check-in activities policies
CREATE POLICY "Event owners and team members can view check-in activities" ON check_in_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM check_in_sessions 
            WHERE check_in_sessions.id = check_in_activities.session_id 
            AND (
                check_in_sessions.staff_member_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM events 
                    WHERE events.id = check_in_sessions.event_id 
                    AND events.owner_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Team members can create check-in activities" ON check_in_activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM check_in_sessions 
            WHERE check_in_sessions.id = check_in_activities.session_id 
            AND check_in_sessions.staff_member_id = auth.uid()
            AND check_in_sessions.is_active = true
        )
    );

-- Team invitations policies
CREATE POLICY "Event owners can manage team invitations" ON team_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = team_invitations.event_id 
            AND events.owner_id = auth.uid()
        )
    );

CREATE POLICY "Invited users can view their invitations" ON team_invitations
    FOR SELECT USING (
        invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Function to get team member permissions based on role
CREATE OR REPLACE FUNCTION get_team_member_permissions(member_role team_role)
RETURNS JSONB AS $$
BEGIN
    CASE member_role
        WHEN 'event_manager' THEN
            RETURN '{
                "view_event": true,
                "edit_event": true,
                "manage_team": true,
                "view_analytics": true,
                "check_in_tickets": true,
                "view_attendees": true,
                "manage_seating": true,
                "handle_refunds": true
            }';
        WHEN 'check_in_staff' THEN
            RETURN '{
                "view_event": true,
                "edit_event": false,
                "manage_team": false,
                "view_analytics": false,
                "check_in_tickets": true,
                "view_attendees": true,
                "manage_seating": false,
                "handle_refunds": false
            }';
        WHEN 'customer_service' THEN
            RETURN '{
                "view_event": true,
                "edit_event": false,
                "manage_team": false,
                "view_analytics": false,
                "check_in_tickets": true,
                "view_attendees": true,
                "manage_seating": false,
                "handle_refunds": true
            }';
        WHEN 'security' THEN
            RETURN '{
                "view_event": true,
                "edit_event": false,
                "manage_team": false,
                "view_analytics": true,
                "check_in_tickets": true,
                "view_attendees": true,
                "manage_seating": false,
                "handle_refunds": false
            }';
        WHEN 'vendor_coordinator' THEN
            RETURN '{
                "view_event": true,
                "edit_event": false,
                "manage_team": false,
                "view_analytics": false,
                "check_in_tickets": false,
                "view_attendees": false,
                "manage_seating": true,
                "handle_refunds": false
            }';
        ELSE
            RETURN '{}';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has specific permission for event
CREATE OR REPLACE FUNCTION user_has_event_permission(
    user_id UUID,
    event_id UUID,
    permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    is_owner BOOLEAN;
    member_role team_role;
    permissions JSONB;
BEGIN
    -- Check if user is event owner
    SELECT EXISTS(
        SELECT 1 FROM events 
        WHERE id = event_id AND owner_id = user_id
    ) INTO is_owner;
    
    IF is_owner THEN
        RETURN true;
    END IF;
    
    -- Check team member permissions
    SELECT role_type INTO member_role
    FROM team_members 
    WHERE event_id = user_has_event_permission.event_id 
    AND user_id = user_has_event_permission.user_id
    AND accepted_at IS NOT NULL;
    
    IF member_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get permissions for role
    SELECT get_team_member_permissions(member_role) INTO permissions;
    
    RETURN (permissions->>permission_name)::boolean;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE check_in_sessions IS 'Tracks active check-in sessions for mobile PWA staff devices';
COMMENT ON TABLE check_in_activities IS 'Audit log of all check-in activities including offline actions';
COMMENT ON TABLE team_invitations IS 'Manages team member invitation workflow with email tokens';
COMMENT ON TYPE team_role IS 'Predefined roles for team members with specific permission sets';