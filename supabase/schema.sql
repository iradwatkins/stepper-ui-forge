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
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
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