-- Migration: Add seating management system for Epic 3.0
-- Epic 3.0: Custom Seating Management System

-- Create venues table for venue information and layout data
CREATE TABLE venues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(50),
  postal_code VARCHAR(20),
  description TEXT,
  capacity INTEGER,
  venue_type VARCHAR(50) DEFAULT 'general' CHECK (venue_type IN ('theater', 'arena', 'stadium', 'conference', 'general')),
  layout_data JSONB, -- Store custom layout configuration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT venues_capacity_positive CHECK (capacity > 0)
);

-- Create seating charts table for venue layout configurations
CREATE TABLE seating_charts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  chart_data JSONB NOT NULL, -- SVG/JSON layout data
  image_url VARCHAR(500), -- Optional background image
  version INTEGER DEFAULT 1 NOT NULL,
  is_active BOOLEAN DEFAULT true,
  total_seats INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT seating_charts_version_positive CHECK (version > 0),
  CONSTRAINT seating_charts_total_seats_non_negative CHECK (total_seats >= 0)
);

-- Create seat categories table for different seat types
CREATE TABLE seat_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seating_chart_id UUID REFERENCES seating_charts(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color_code VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for visual representation
  base_price DECIMAL(10,2) DEFAULT 0.00,
  price_modifier DECIMAL(5,2) DEFAULT 1.00, -- Multiplier for dynamic pricing
  is_accessible BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT seat_categories_base_price_non_negative CHECK (base_price >= 0),
  CONSTRAINT seat_categories_price_modifier_positive CHECK (price_modifier > 0),
  CONSTRAINT seat_categories_name_chart_unique UNIQUE (seating_chart_id, name)
);

-- Create seats table for individual seat definitions
CREATE TABLE seats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seating_chart_id UUID REFERENCES seating_charts(id) ON DELETE CASCADE NOT NULL,
  seat_category_id UUID REFERENCES seat_categories(id) ON DELETE SET NULL,
  
  -- Seat identification
  section VARCHAR(50),
  row_label VARCHAR(10),
  seat_number VARCHAR(10),
  seat_identifier VARCHAR(100) NOT NULL, -- Unique identifier within chart (e.g., "A-1-5")
  
  -- Position and layout
  x_position DECIMAL(10,2), -- X coordinate for positioning
  y_position DECIMAL(10,2), -- Y coordinate for positioning
  rotation DECIMAL(5,2) DEFAULT 0, -- Rotation angle in degrees
  
  -- Pricing and availability
  base_price DECIMAL(10,2) DEFAULT 0.00,
  current_price DECIMAL(10,2), -- Computed price (base * modifiers)
  is_available BOOLEAN DEFAULT true,
  is_accessible BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  metadata JSONB, -- Additional seat-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT seats_base_price_non_negative CHECK (base_price >= 0),
  CONSTRAINT seats_current_price_non_negative CHECK (current_price >= 0 OR current_price IS NULL),
  CONSTRAINT seats_seat_identifier_chart_unique UNIQUE (seating_chart_id, seat_identifier)
);

-- Create seat holds table for temporary seat reservations during checkout
CREATE TABLE seat_holds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seat_id UUID REFERENCES seats(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  session_id VARCHAR(255) NOT NULL, -- Browser session or user identifier
  customer_email VARCHAR(255), -- Optional customer email
  
  -- Hold timing
  held_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hold_duration_minutes INTEGER DEFAULT 15,
  
  -- Status and metadata
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'cancelled', 'extended')),
  hold_reason VARCHAR(100) DEFAULT 'checkout', -- checkout, admin, maintenance
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT seat_holds_expires_at_future CHECK (expires_at > held_at),
  CONSTRAINT seat_holds_duration_positive CHECK (hold_duration_minutes > 0)
);

-- Create seat purchases table to track sold seats
CREATE TABLE seat_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seat_id UUID REFERENCES seats(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  order_id UUID, -- Reference to orders table (from Epic 2.0)
  ticket_id UUID, -- Reference to tickets table (from Epic 2.0)
  
  -- Purchase details
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  fees DECIMAL(10,2) DEFAULT 0.00,
  total_paid DECIMAL(10,2) NOT NULL,
  
  -- Purchase metadata
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  payment_method VARCHAR(50),
  confirmation_code VARCHAR(50),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT seat_purchases_purchase_price_positive CHECK (purchase_price > 0),
  CONSTRAINT seat_purchases_fees_non_negative CHECK (fees >= 0),
  CONSTRAINT seat_purchases_total_paid_positive CHECK (total_paid > 0),
  CONSTRAINT seat_purchases_seat_event_unique UNIQUE (seat_id, event_id)
);

-- Create indexes for performance
CREATE INDEX idx_venues_name ON venues(name);
CREATE INDEX idx_venues_city_state ON venues(city, state);
CREATE INDEX idx_venues_venue_type ON venues(venue_type);

CREATE INDEX idx_seating_charts_venue_id ON seating_charts(venue_id);
CREATE INDEX idx_seating_charts_event_id ON seating_charts(event_id);
CREATE INDEX idx_seating_charts_active ON seating_charts(is_active);

CREATE INDEX idx_seat_categories_chart_id ON seat_categories(seating_chart_id);
CREATE INDEX idx_seat_categories_sort_order ON seat_categories(seating_chart_id, sort_order);

CREATE INDEX idx_seats_chart_id ON seats(seating_chart_id);
CREATE INDEX idx_seats_category_id ON seats(seat_category_id);
CREATE INDEX idx_seats_section_row ON seats(seating_chart_id, section, row_label);
CREATE INDEX idx_seats_available ON seats(seating_chart_id, is_available);
CREATE INDEX idx_seats_position ON seats(seating_chart_id, x_position, y_position);

CREATE INDEX idx_seat_holds_seat_id ON seat_holds(seat_id);
CREATE INDEX idx_seat_holds_event_id ON seat_holds(event_id);
CREATE INDEX idx_seat_holds_session_id ON seat_holds(session_id);
CREATE INDEX idx_seat_holds_expires_at ON seat_holds(expires_at);
CREATE INDEX idx_seat_holds_status ON seat_holds(status);

CREATE INDEX idx_seat_purchases_seat_id ON seat_purchases(seat_id);
CREATE INDEX idx_seat_purchases_event_id ON seat_purchases(event_id);
CREATE INDEX idx_seat_purchases_order_id ON seat_purchases(order_id);
CREATE INDEX idx_seat_purchases_customer_email ON seat_purchases(customer_email);

-- Function to get available seats for an event
CREATE OR REPLACE FUNCTION get_available_seats(event_id_param UUID, seating_chart_id_param UUID)
RETURNS TABLE(
  seat_id UUID,
  seat_identifier VARCHAR(100),
  section VARCHAR(50),
  row_label VARCHAR(10),
  seat_number VARCHAR(10),
  x_position DECIMAL(10,2),
  y_position DECIMAL(10,2),
  current_price DECIMAL(10,2),
  category_name VARCHAR(100),
  category_color VARCHAR(7),
  is_accessible BOOLEAN,
  is_premium BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as seat_id,
    s.seat_identifier,
    s.section,
    s.row_label,
    s.seat_number,
    s.x_position,
    s.y_position,
    s.current_price,
    sc.name as category_name,
    sc.color_code as category_color,
    s.is_accessible,
    s.is_premium
  FROM seats s
  LEFT JOIN seat_categories sc ON s.seat_category_id = sc.id
  WHERE s.seating_chart_id = seating_chart_id_param
    AND s.is_available = true
    AND s.id NOT IN (
      -- Exclude sold seats
      SELECT sp.seat_id 
      FROM seat_purchases sp 
      WHERE sp.event_id = event_id_param
    )
    AND s.id NOT IN (
      -- Exclude currently held seats
      SELECT sh.seat_id 
      FROM seat_holds sh 
      WHERE sh.event_id = event_id_param 
        AND sh.status = 'active' 
        AND sh.expires_at > NOW()
    )
  ORDER BY s.section, s.row_label, s.seat_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hold seats during checkout
CREATE OR REPLACE FUNCTION hold_seats(
  seat_ids UUID[],
  event_id_param UUID,
  session_id_param VARCHAR(255),
  hold_duration_minutes INTEGER DEFAULT 15,
  customer_email_param VARCHAR(255) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  hold_id UUID;
  seat_id UUID;
  expires_at_time TIMESTAMP WITH TIME ZONE;
  unavailable_seats UUID[] := '{}';
BEGIN
  -- Calculate expiration time
  expires_at_time := NOW() + (hold_duration_minutes || ' minutes')::INTERVAL;
  
  -- Check if all seats are available
  FOR seat_id IN SELECT unnest(seat_ids) LOOP
    -- Check if seat is sold
    IF EXISTS (
      SELECT 1 FROM seat_purchases sp 
      WHERE sp.seat_id = seat_id AND sp.event_id = event_id_param
    ) THEN
      unavailable_seats := array_append(unavailable_seats, seat_id);
    END IF;
    
    -- Check if seat is currently held by another session
    IF EXISTS (
      SELECT 1 FROM seat_holds sh 
      WHERE sh.seat_id = seat_id 
        AND sh.event_id = event_id_param 
        AND sh.session_id != session_id_param
        AND sh.status = 'active' 
        AND sh.expires_at > NOW()
    ) THEN
      unavailable_seats := array_append(unavailable_seats, seat_id);
    END IF;
    
    -- Check if seat is available
    IF NOT EXISTS (
      SELECT 1 FROM seats s 
      WHERE s.id = seat_id AND s.is_available = true
    ) THEN
      unavailable_seats := array_append(unavailable_seats, seat_id);
    END IF;
  END LOOP;
  
  -- If any seats are unavailable, raise an exception
  IF array_length(unavailable_seats, 1) > 0 THEN
    RAISE EXCEPTION 'Seats unavailable: %', array_to_string(unavailable_seats, ', ');
  END IF;
  
  -- Release any existing holds for this session and event
  UPDATE seat_holds 
  SET status = 'cancelled', updated_at = NOW()
  WHERE session_id = session_id_param 
    AND event_id = event_id_param 
    AND status = 'active';
  
  -- Create new holds for all seats
  FOR seat_id IN SELECT unnest(seat_ids) LOOP
    INSERT INTO seat_holds (
      seat_id, 
      event_id, 
      session_id, 
      customer_email,
      expires_at,
      hold_duration_minutes
    ) VALUES (
      seat_id, 
      event_id_param, 
      session_id_param, 
      customer_email_param,
      expires_at_time,
      hold_duration_minutes
    ) RETURNING id INTO hold_id;
  END LOOP;
  
  RETURN hold_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release seat holds
CREATE OR REPLACE FUNCTION release_seat_holds(
  hold_ids UUID[] DEFAULT NULL,
  session_id_param VARCHAR(255) DEFAULT NULL,
  event_id_param UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER := 0;
BEGIN
  -- Release specific holds
  IF hold_ids IS NOT NULL THEN
    UPDATE seat_holds 
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = ANY(hold_ids) AND status = 'active';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Release holds by session
  ELSIF session_id_param IS NOT NULL THEN
    UPDATE seat_holds 
    SET status = 'cancelled', updated_at = NOW()
    WHERE session_id = session_id_param 
      AND (event_id_param IS NULL OR event_id = event_id_param)
      AND status = 'active';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Invalid parameters
  ELSE
    RAISE EXCEPTION 'Must provide either hold_ids or session_id_param';
  END IF;
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete seat purchase (convert holds to purchases)
CREATE OR REPLACE FUNCTION complete_seat_purchase(
  session_id_param VARCHAR(255),
  event_id_param UUID,
  order_id_param UUID,
  customer_email_param VARCHAR(255),
  customer_name_param VARCHAR(255),
  payment_method_param VARCHAR(50)
) RETURNS UUID[] AS $$
DECLARE
  hold_record RECORD;
  purchase_ids UUID[] := '{}';
  purchase_id UUID;
BEGIN
  -- Get all active holds for this session and event
  FOR hold_record IN 
    SELECT sh.*, s.current_price, s.seat_identifier
    FROM seat_holds sh
    JOIN seats s ON sh.seat_id = s.id
    WHERE sh.session_id = session_id_param 
      AND sh.event_id = event_id_param 
      AND sh.status = 'active'
      AND sh.expires_at > NOW()
  LOOP
    -- Create purchase record
    INSERT INTO seat_purchases (
      seat_id,
      event_id,
      order_id,
      customer_email,
      customer_name,
      purchase_price,
      fees,
      total_paid,
      payment_method,
      confirmation_code
    ) VALUES (
      hold_record.seat_id,
      event_id_param,
      order_id_param,
      customer_email_param,
      customer_name_param,
      hold_record.current_price,
      hold_record.current_price * 0.03, -- 3% processing fee
      hold_record.current_price * 1.03,
      payment_method_param,
      'SEAT_' || upper(substr(gen_random_uuid()::text, 1, 8))
    ) RETURNING id INTO purchase_id;
    
    purchase_ids := array_append(purchase_ids, purchase_id);
    
    -- Mark hold as completed
    UPDATE seat_holds 
    SET status = 'completed', updated_at = NOW()
    WHERE id = hold_record.id;
  END LOOP;
  
  -- If no holds were found, raise an exception
  IF array_length(purchase_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No active seat holds found for session % and event %', session_id_param, event_id_param;
  END IF;
  
  RETURN purchase_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired seat holds
CREATE OR REPLACE FUNCTION cleanup_expired_seat_holds()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE seat_holds 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expires_at <= NOW();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get best available seats
CREATE OR REPLACE FUNCTION get_best_available_seats(
  event_id_param UUID,
  seating_chart_id_param UUID,
  quantity_param INTEGER,
  prefer_together BOOLEAN DEFAULT true,
  max_price DECIMAL(10,2) DEFAULT NULL,
  section_preference VARCHAR(50) DEFAULT NULL
) RETURNS TABLE(
  seat_id UUID,
  seat_identifier VARCHAR(100),
  section VARCHAR(50),
  row_label VARCHAR(10),
  seat_number VARCHAR(10),
  current_price DECIMAL(10,2),
  distance_score DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH available_seats AS (
    SELECT * FROM get_available_seats(event_id_param, seating_chart_id_param)
    WHERE (max_price IS NULL OR current_price <= max_price)
      AND (section_preference IS NULL OR section = section_preference)
  ),
  center_point AS (
    -- Calculate center of the venue for distance scoring
    SELECT 
      AVG(x_position) as center_x,
      AVG(y_position) as center_y
    FROM available_seats
  ),
  scored_seats AS (
    SELECT 
      a.*,
      -- Distance from center (lower is better)
      SQRT(POWER(a.x_position - c.center_x, 2) + POWER(a.y_position - c.center_y, 2)) as distance_score
    FROM available_seats a
    CROSS JOIN center_point c
  )
  SELECT 
    s.seat_id,
    s.seat_identifier,
    s.section,
    s.row_label,
    s.seat_number,
    s.current_price,
    s.distance_score
  FROM scored_seats s
  ORDER BY 
    s.distance_score ASC, -- Prefer center seats
    s.current_price ASC,  -- Prefer lower prices
    s.section,
    s.row_label,
    s.seat_number
  LIMIT quantity_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at triggers
CREATE TRIGGER set_timestamp_venues
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_seating_charts
  BEFORE UPDATE ON seating_charts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_seat_categories
  BEFORE UPDATE ON seat_categories
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_seats
  BEFORE UPDATE ON seats
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_seat_holds
  BEFORE UPDATE ON seat_holds
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_seat_purchases
  BEFORE UPDATE ON seat_purchases
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Create views for easier access
CREATE OR REPLACE VIEW seat_availability_summary AS
SELECT 
  sc.id as seating_chart_id,
  sc.name as chart_name,
  e.id as event_id,
  e.title as event_title,
  COUNT(s.id) as total_seats,
  COUNT(CASE WHEN sp.id IS NULL AND NOT EXISTS (
    SELECT 1 FROM seat_holds sh 
    WHERE sh.seat_id = s.id 
      AND sh.event_id = e.id 
      AND sh.status = 'active' 
      AND sh.expires_at > NOW()
  ) THEN 1 END) as available_seats,
  COUNT(sp.id) as sold_seats,
  COUNT(CASE WHEN EXISTS (
    SELECT 1 FROM seat_holds sh 
    WHERE sh.seat_id = s.id 
      AND sh.event_id = e.id 
      AND sh.status = 'active' 
      AND sh.expires_at > NOW()
  ) THEN 1 END) as held_seats,
  SUM(CASE WHEN sp.id IS NOT NULL THEN sp.total_paid ELSE 0 END) as total_revenue
FROM seating_charts sc
JOIN events e ON sc.event_id = e.id
LEFT JOIN seats s ON s.seating_chart_id = sc.id
LEFT JOIN seat_purchases sp ON sp.seat_id = s.id AND sp.event_id = e.id
WHERE sc.is_active = true
GROUP BY sc.id, sc.name, e.id, e.title;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON venues TO authenticated;
GRANT SELECT, INSERT, UPDATE ON seating_charts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON seat_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON seats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON seat_holds TO authenticated;
GRANT SELECT, INSERT ON seat_purchases TO authenticated;

GRANT SELECT ON seat_availability_summary TO authenticated;

GRANT EXECUTE ON FUNCTION get_available_seats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION hold_seats(UUID[], UUID, VARCHAR, INTEGER, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION release_seat_holds(UUID[], VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_seat_purchase(VARCHAR, UUID, UUID, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_seat_holds() TO authenticated;
GRANT EXECUTE ON FUNCTION get_best_available_seats(UUID, UUID, INTEGER, BOOLEAN, DECIMAL, VARCHAR) TO authenticated;