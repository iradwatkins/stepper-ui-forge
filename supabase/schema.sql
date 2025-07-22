-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE event_type AS ENUM ('simple', 'ticketed', 'premium');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE ticket_status AS ENUM ('active', 'used', 'refunded', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- User profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    phone TEXT,
    location TEXT,
    organization TEXT,
    social_links JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{
        "emailMarketing": true,
        "emailUpdates": true,
        "emailTickets": true,
        "pushNotifications": true,
        "smsNotifications": false
    }',
    privacy_settings JSONB DEFAULT '{
        "profileVisible": true,
        "showEmail": false,
        "showPhone": false,
        "showEvents": true
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES profiles(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    organization_name TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location TEXT NOT NULL,
    categories TEXT[] DEFAULT '{}',
    event_type event_type NOT NULL DEFAULT 'simple',
    status event_status NOT NULL DEFAULT 'draft',
    images JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    max_attendees INTEGER,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    display_price JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket types/tiers table
CREATE TABLE ticket_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL,
    sold_quantity INTEGER DEFAULT 0,
    max_per_person INTEGER DEFAULT 10,
    sale_start TIMESTAMP WITH TIME ZONE,
    sale_end TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual tickets table
CREATE TABLE tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    holder_email TEXT NOT NULL,
    holder_name TEXT,
    holder_phone TEXT,
    status ticket_status DEFAULT 'active',
    qr_code TEXT UNIQUE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    checked_in_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table (for payment tracking)
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    payment_intent_id TEXT,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table (for collaborative event management)
CREATE TABLE team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES profiles(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(event_id, user_id)
);

-- Event analytics table
CREATE TABLE event_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    recorded_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Events policies
CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view public events" ON events
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own events" ON events
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own events" ON events
    FOR DELETE USING (auth.uid() = owner_id);

-- Ticket types policies
CREATE POLICY "Users can manage ticket types for own events" ON ticket_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = ticket_types.event_id 
            AND events.owner_id = auth.uid()
        )
    );

CREATE POLICY "Public can view ticket types for public events" ON ticket_types
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = ticket_types.event_id 
            AND events.is_public = true
        )
    );

-- Tickets policies
CREATE POLICY "Event owners can manage tickets" ON tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = tickets.event_id 
            AND events.owner_id = auth.uid()
        )
    );

-- Orders policies
CREATE POLICY "Event owners can view orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = orders.event_id 
            AND events.owner_id = auth.uid()
        )
    );

-- Order items policies
CREATE POLICY "Event owners can view order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            JOIN events ON events.id = orders.event_id
            WHERE orders.id = order_items.order_id 
            AND events.owner_id = auth.uid()
        )
    );

-- Team members policies
CREATE POLICY "Event owners and team members can view team" ON team_members
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = team_members.event_id 
            AND events.owner_id = auth.uid()
        )
    );

CREATE POLICY "Event owners can manage team members" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = team_members.event_id 
            AND events.owner_id = auth.uid()
        )
    );

-- Event analytics policies
CREATE POLICY "Event owners can view analytics" ON event_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_analytics.event_id 
            AND events.owner_id = auth.uid()
        )
    );

-- Functions and Triggers

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_ticket_types_updated_at
    BEFORE UPDATE ON ticket_types
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to create user profile on signup
-- Profile creation trigger with admin fields
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile with admin fields
    INSERT INTO profiles (
        id,
        email,
        full_name,
        is_admin,
        admin_level,
        notification_preferences,
        privacy_settings,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        false,
        0,
        '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}',
        '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate QR code for tickets
CREATE OR REPLACE FUNCTION generate_ticket_qr_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.qr_code = 'QR_' || NEW.id::text;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate QR code on ticket creation
CREATE TRIGGER generate_qr_code_trigger
    BEFORE INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_qr_code();

-- Indexes for performance
CREATE INDEX idx_events_owner_id ON events(owner_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_public ON events(is_public);
CREATE INDEX idx_ticket_types_event_id ON ticket_types(event_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_status ON orders(payment_status);
CREATE INDEX idx_team_members_event_id ON team_members(event_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_event_analytics_event_id ON event_analytics(event_id);

-- Admin permissions indexes
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX idx_profiles_admin_level ON profiles(admin_level);

-- Admin permissions table for granular permissions
CREATE TABLE admin_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    can_manage_users BOOLEAN DEFAULT FALSE,
    can_manage_events BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT FALSE,
    can_manage_system BOOLEAN DEFAULT FALSE,
    can_manage_billing BOOLEAN DEFAULT FALSE,
    granted_by UUID REFERENCES profiles(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Admin permissions indexes
CREATE INDEX idx_admin_permissions_user_id ON admin_permissions(user_id);
CREATE INDEX idx_admin_permissions_is_active ON admin_permissions(is_active);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((
        SELECT is_admin 
        FROM profiles 
        WHERE id = user_uuid
    ), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin permissions
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

-- User follows table for tracking follower relationships
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, organizer_id)
);

-- Follower promotions table for tracking additional permissions granted by organizers
CREATE TABLE IF NOT EXISTS follower_promotions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follow_id UUID REFERENCES user_follows(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  can_sell_tickets BOOLEAN DEFAULT FALSE,
  can_work_events BOOLEAN DEFAULT FALSE,
  is_co_organizer BOOLEAN DEFAULT FALSE,
  commission_rate DECIMAL(5,4) DEFAULT 0.0000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follow_id)
);

-- Referral codes table for tracking unique codes/URLs for promoted followers
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  promotion_id UUID REFERENCES follower_promotions(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  qr_code_url TEXT,
  referral_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  clicks_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission tracking for follower earnings
CREATE TABLE IF NOT EXISTS commission_earnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referral_code_id UUID REFERENCES referral_codes(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  order_total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for follower system
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_organizer_id ON user_follows(organizer_id);
CREATE INDEX IF NOT EXISTS idx_follower_promotions_follow_id ON follower_promotions(follow_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_promotion_id ON referral_codes(promotion_id);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_follower_id ON commission_earnings(follower_id);

-- Function to get follower count
CREATE OR REPLACE FUNCTION get_follower_count(organizer_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM user_follows
    WHERE organizer_id = organizer_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user follows organizer
CREATE OR REPLACE FUNCTION is_following(follower_uuid UUID, organizer_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_follows
    WHERE follower_id = follower_uuid AND organizer_id = organizer_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create seller_event_assignments table for tracking which event a seller is currently working
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

-- Comments for documentation
COMMENT ON TABLE admin_permissions IS 'Granular admin permissions for platform administration';
COMMENT ON COLUMN profiles.is_admin IS 'Boolean flag indicating if user has any admin privileges';
COMMENT ON COLUMN profiles.admin_level IS 'Admin level: 0=regular, 1=moderator, 2=admin, 3=super_admin';
COMMENT ON FUNCTION is_user_admin(UUID) IS 'Check if a user has admin privileges';
COMMENT ON FUNCTION get_admin_permissions(UUID) IS 'Get detailed admin permissions for a user';
COMMENT ON FUNCTION get_follower_count(UUID) IS 'Get follower count for an organizer';
COMMENT ON FUNCTION is_following(UUID, UUID) IS 'Check if a user follows an organizer';
COMMENT ON TABLE seller_event_assignments IS 'Enforces single event limitation for sellers - only one active assignment per seller';
COMMENT ON FUNCTION assign_seller_to_event IS 'Assigns seller to specific event with single event limitation enforcement';