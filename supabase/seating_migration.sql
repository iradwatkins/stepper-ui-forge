-- Seating System Migration
-- This migration adds the seating functionality to the existing database schema

-- Create new enum types for seating
CREATE TYPE venue_type AS ENUM ('theater', 'arena', 'stadium', 'conference', 'general');
CREATE TYPE hold_status AS ENUM ('active', 'expired', 'completed', 'cancelled', 'extended');

-- ===============================
-- VENUES TABLE
-- ===============================
CREATE TABLE venues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'US',
    postal_code TEXT,
    description TEXT,
    capacity INTEGER,
    venue_type venue_type NOT NULL DEFAULT 'general',
    layout_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ===============================
-- SEATING CHARTS TABLE
-- ===============================
CREATE TABLE seating_charts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    chart_data JSONB NOT NULL DEFAULT '{}',
    image_url TEXT,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    total_seats INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ===============================
-- SEAT CATEGORIES TABLE
-- ===============================
CREATE TABLE seat_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seating_chart_id UUID REFERENCES seating_charts(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color_code TEXT NOT NULL DEFAULT '#3B82F6',
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_modifier DECIMAL(5,2) DEFAULT 1.0,
    is_accessible BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================
-- SEATS TABLE
-- ===============================
CREATE TABLE seats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seating_chart_id UUID REFERENCES seating_charts(id) ON DELETE CASCADE NOT NULL,
    seat_category_id UUID REFERENCES seat_categories(id) ON DELETE SET NULL,
    section TEXT,
    row_label TEXT,
    seat_number TEXT,
    seat_identifier TEXT NOT NULL,
    x_position DECIMAL(10,2),
    y_position DECIMAL(10,2),
    rotation DECIMAL(5,2) DEFAULT 0,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_price DECIMAL(10,2),
    is_available BOOLEAN DEFAULT true,
    is_accessible BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seating_chart_id, seat_identifier)
);

-- ===============================
-- SEAT HOLDS TABLE
-- ===============================
CREATE TABLE seat_holds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seat_id UUID REFERENCES seats(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL,
    customer_email TEXT,
    held_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hold_duration_minutes INTEGER DEFAULT 15,
    status hold_status DEFAULT 'active',
    hold_reason TEXT DEFAULT 'checkout',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================
-- INDEXES FOR PERFORMANCE
-- ===============================
CREATE INDEX idx_venues_type ON venues(venue_type);
CREATE INDEX idx_venues_created_by ON venues(created_by);

CREATE INDEX idx_seating_charts_venue_id ON seating_charts(venue_id);
CREATE INDEX idx_seating_charts_event_id ON seating_charts(event_id);
CREATE INDEX idx_seating_charts_active ON seating_charts(is_active);

CREATE INDEX idx_seat_categories_chart_id ON seat_categories(seating_chart_id);
CREATE INDEX idx_seat_categories_sort_order ON seat_categories(seating_chart_id, sort_order);

CREATE INDEX idx_seats_chart_id ON seats(seating_chart_id);
CREATE INDEX idx_seats_category_id ON seats(seat_category_id);
CREATE INDEX idx_seats_identifier ON seats(seating_chart_id, seat_identifier);
CREATE INDEX idx_seats_availability ON seats(seating_chart_id, is_available);
CREATE INDEX idx_seats_position ON seats(seating_chart_id, x_position, y_position);

CREATE INDEX idx_seat_holds_seat_id ON seat_holds(seat_id);
CREATE INDEX idx_seat_holds_event_id ON seat_holds(event_id);
CREATE INDEX idx_seat_holds_session_id ON seat_holds(session_id);
CREATE INDEX idx_seat_holds_status ON seat_holds(status);
CREATE INDEX idx_seat_holds_expires_at ON seat_holds(expires_at);

-- ===============================
-- RLS POLICIES
-- ===============================

-- Enable RLS on all seating tables
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_holds ENABLE ROW LEVEL SECURITY;

-- Venues policies
CREATE POLICY "Users can view venues" ON venues
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can create venues" ON venues
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own venues" ON venues
    FOR UPDATE TO authenticated
    USING (auth.uid() = created_by);

-- Seating charts policies
CREATE POLICY "Users can view seating charts" ON seating_charts
    FOR SELECT TO authenticated
    USING (
        is_active = true OR
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = seating_charts.event_id 
            AND events.owner_id = auth.uid()
        )
    );

CREATE POLICY "Event owners can manage seating charts" ON seating_charts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = seating_charts.event_id 
            AND events.owner_id = auth.uid()
        )
    );

-- Seat categories policies
CREATE POLICY "Users can view seat categories" ON seat_categories
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM seating_charts 
            WHERE seating_charts.id = seat_categories.seating_chart_id 
            AND (
                seating_charts.is_active = true OR
                EXISTS (
                    SELECT 1 FROM events 
                    WHERE events.id = seating_charts.event_id 
                    AND events.owner_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Event owners can manage seat categories" ON seat_categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM seating_charts 
            JOIN events ON events.id = seating_charts.event_id
            WHERE seating_charts.id = seat_categories.seating_chart_id 
            AND events.owner_id = auth.uid()
        )
    );

-- Seats policies
CREATE POLICY "Users can view seats" ON seats
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM seating_charts 
            WHERE seating_charts.id = seats.seating_chart_id 
            AND (
                seating_charts.is_active = true OR
                EXISTS (
                    SELECT 1 FROM events 
                    WHERE events.id = seating_charts.event_id 
                    AND events.owner_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Event owners can manage seats" ON seats
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM seating_charts 
            JOIN events ON events.id = seating_charts.event_id
            WHERE seating_charts.id = seats.seating_chart_id 
            AND events.owner_id = auth.uid()
        )
    );

-- Seat holds policies
CREATE POLICY "Users can view own seat holds" ON seat_holds
    FOR SELECT TO authenticated
    USING (
        customer_email = auth.email() OR
        EXISTS (
            SELECT 1 FROM seating_charts 
            JOIN events ON events.id = seating_charts.event_id
            JOIN seats ON seats.seating_chart_id = seating_charts.id
            WHERE seats.id = seat_holds.seat_id 
            AND events.owner_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create seat holds" ON seat_holds
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update own seat holds" ON seat_holds
    FOR UPDATE TO authenticated
    USING (
        customer_email = auth.email() OR
        EXISTS (
            SELECT 1 FROM seating_charts 
            JOIN events ON events.id = seating_charts.event_id
            JOIN seats ON seats.seating_chart_id = seating_charts.id
            WHERE seats.id = seat_holds.seat_id 
            AND events.owner_id = auth.uid()
        )
    );

-- ===============================
-- TRIGGERS
-- ===============================

-- Add updated_at triggers for seating tables
CREATE TRIGGER handle_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_seating_charts_updated_at
    BEFORE UPDATE ON seating_charts
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_seat_holds_updated_at
    BEFORE UPDATE ON seat_holds
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ===============================
-- VIEWS FOR CONVENIENCE
-- ===============================

-- Seat availability summary view
CREATE VIEW seat_availability_summary AS
SELECT 
    sc.id as seating_chart_id,
    sc.name as chart_name,
    sc.event_id,
    COUNT(s.id) as total_seats,
    COUNT(CASE WHEN s.is_available THEN 1 END) as available_seats,
    COUNT(CASE WHEN NOT s.is_available THEN 1 END) as unavailable_seats,
    COUNT(CASE WHEN sh.status = 'active' AND sh.expires_at > NOW() THEN 1 END) as held_seats,
    AVG(s.current_price) as avg_price,
    MIN(s.current_price) as min_price,
    MAX(s.current_price) as max_price
FROM seating_charts sc
LEFT JOIN seats s ON s.seating_chart_id = sc.id
LEFT JOIN seat_holds sh ON sh.seat_id = s.id
WHERE sc.is_active = true
GROUP BY sc.id, sc.name, sc.event_id;

-- Add RLS to the view
ALTER VIEW seat_availability_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view seat availability summary" ON seat_availability_summary
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = seat_availability_summary.event_id 
            AND (events.is_public = true OR events.owner_id = auth.uid())
        )
    );

-- Add comment for documentation
COMMENT ON TABLE venues IS 'Physical venues where events can be held';
COMMENT ON TABLE seating_charts IS 'Layout configurations for venue seating';
COMMENT ON TABLE seat_categories IS 'Pricing and classification categories for seats';
COMMENT ON TABLE seats IS 'Individual seat definitions with positions and pricing';
COMMENT ON TABLE seat_holds IS 'Temporary seat reservations during checkout process';
COMMENT ON VIEW seat_availability_summary IS 'Real-time summary of seat availability per seating chart';