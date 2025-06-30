-- Migration: Add inventory management and reservation system
-- Story 2.10: Inventory Management and Overselling Prevention

-- Add version field to ticket_types for optimistic locking
ALTER TABLE ticket_types ADD COLUMN version INTEGER DEFAULT 0 NOT NULL;

-- Add constraints to prevent overselling
ALTER TABLE ticket_types ADD CONSTRAINT check_sold_quantity_non_negative 
  CHECK (sold_quantity >= 0);
ALTER TABLE ticket_types ADD CONSTRAINT check_sold_quantity_not_exceed_total 
  CHECK (sold_quantity <= quantity);

-- Create ticket reservations table for temporary holds during checkout
CREATE TABLE ticket_reservations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE NOT NULL,
  session_id VARCHAR(255) NOT NULL, -- Browser session or user identifier
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for efficient reservation lookups
CREATE INDEX idx_ticket_reservations_ticket_type_id ON ticket_reservations(ticket_type_id);
CREATE INDEX idx_ticket_reservations_session_id ON ticket_reservations(session_id);
CREATE INDEX idx_ticket_reservations_expires_at ON ticket_reservations(expires_at);
CREATE INDEX idx_ticket_reservations_status ON ticket_reservations(status);

-- Function to get available quantity (total - sold - reserved)
CREATE OR REPLACE FUNCTION get_available_quantity(ticket_type_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  total_quantity INTEGER;
  sold_quantity_val INTEGER;
  reserved_quantity INTEGER;
BEGIN
  -- Get total and sold quantities
  SELECT quantity, sold_quantity INTO total_quantity, sold_quantity_val
  FROM ticket_types WHERE id = ticket_type_id_param;
  
  -- Get active reserved quantities
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_quantity
  FROM ticket_reservations 
  WHERE ticket_type_id = ticket_type_id_param 
    AND status = 'active' 
    AND expires_at > NOW();
  
  -- Return available quantity
  RETURN GREATEST(0, total_quantity - sold_quantity_val - reserved_quantity);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a ticket reservation
CREATE OR REPLACE FUNCTION create_ticket_reservation(
  ticket_type_id_param UUID,
  session_id_param VARCHAR(255),
  quantity_param INTEGER,
  hold_duration_minutes INTEGER DEFAULT 15
) RETURNS UUID AS $$
DECLARE
  reservation_id UUID;
  available_qty INTEGER;
  expires_at_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate expiration time
  expires_at_time := NOW() + (hold_duration_minutes || ' minutes')::INTERVAL;
  
  -- Check if enough tickets are available
  SELECT get_available_quantity(ticket_type_id_param) INTO available_qty;
  
  IF available_qty < quantity_param THEN
    RAISE EXCEPTION 'Not enough tickets available. Available: %, Requested: %', available_qty, quantity_param;
  END IF;
  
  -- Create reservation
  INSERT INTO ticket_reservations (
    ticket_type_id, 
    session_id, 
    quantity, 
    expires_at
  ) VALUES (
    ticket_type_id_param, 
    session_id_param, 
    quantity_param, 
    expires_at_time
  ) RETURNING id INTO reservation_id;
  
  RETURN reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release a ticket reservation
CREATE OR REPLACE FUNCTION release_ticket_reservation(reservation_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ticket_reservations 
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = reservation_id_param AND status = 'active';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a reservation (convert to sale)
CREATE OR REPLACE FUNCTION complete_ticket_reservation(reservation_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  reservation_record RECORD;
BEGIN
  -- Get reservation details
  SELECT * INTO reservation_record 
  FROM ticket_reservations 
  WHERE id = reservation_id_param AND status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found or already completed';
  END IF;
  
  -- Check if reservation is still valid
  IF reservation_record.expires_at <= NOW() THEN
    -- Mark as expired
    UPDATE ticket_reservations 
    SET status = 'expired', updated_at = NOW()
    WHERE id = reservation_id_param;
    
    RAISE EXCEPTION 'Reservation has expired';
  END IF;
  
  -- Update sold quantity atomically with version check
  UPDATE ticket_types 
  SET sold_quantity = sold_quantity + reservation_record.quantity,
      version = version + 1,
      updated_at = NOW()
  WHERE id = reservation_record.ticket_type_id;
  
  -- Mark reservation as completed
  UPDATE ticket_reservations 
  SET status = 'completed', updated_at = NOW()
  WHERE id = reservation_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE ticket_reservations 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expires_at <= NOW();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced increment function with availability check
CREATE OR REPLACE FUNCTION increment_sold_quantity_safe(
  ticket_type_id_param UUID,
  quantity_to_add INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  available_qty INTEGER;
BEGIN
  -- Check availability including reservations
  SELECT get_available_quantity(ticket_type_id_param) INTO available_qty;
  
  IF available_qty < quantity_to_add THEN
    RAISE EXCEPTION 'Not enough tickets available. Available: %, Requested: %', available_qty, quantity_to_add;
  END IF;
  
  -- Update sold quantity with version increment
  UPDATE ticket_types 
  SET sold_quantity = sold_quantity + quantity_to_add,
      version = version + 1,
      updated_at = NOW()
  WHERE id = ticket_type_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get ticket type with availability
CREATE OR REPLACE FUNCTION get_ticket_type_with_availability(ticket_type_id_param UUID)
RETURNS TABLE(
  id UUID,
  event_id UUID,
  name VARCHAR(255),
  description TEXT,
  price DECIMAL(10,2),
  quantity INTEGER,
  sold_quantity INTEGER,
  available_quantity INTEGER,
  version INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tt.id,
    tt.event_id,
    tt.name,
    tt.description,
    tt.price,
    tt.quantity,
    tt.sold_quantity,
    get_available_quantity(tt.id) as available_quantity,
    tt.version,
    tt.created_at,
    tt.updated_at
  FROM ticket_types tt
  WHERE tt.id = ticket_type_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger for ticket_reservations
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_ticket_reservations
  BEFORE UPDATE ON ticket_reservations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Add updated_at trigger for ticket_types if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'set_timestamp_ticket_types'
  ) THEN
    CREATE TRIGGER set_timestamp_ticket_types
      BEFORE UPDATE ON ticket_types
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;

-- Create view for easy reservation monitoring
CREATE OR REPLACE VIEW active_reservations AS
SELECT 
  tr.id,
  tr.ticket_type_id,
  tt.name as ticket_type_name,
  tt.event_id,
  e.title as event_title,
  tr.session_id,
  tr.quantity,
  tr.reserved_at,
  tr.expires_at,
  (tr.expires_at - NOW()) as time_remaining
FROM ticket_reservations tr
JOIN ticket_types tt ON tr.ticket_type_id = tt.id
JOIN events e ON tt.event_id = e.id
WHERE tr.status = 'active' AND tr.expires_at > NOW()
ORDER BY tr.expires_at ASC;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON ticket_reservations TO authenticated;
GRANT SELECT ON active_reservations TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_quantity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_ticket_reservation(UUID, VARCHAR, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION release_ticket_reservation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ticket_reservation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_type_with_availability(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_sold_quantity_safe(UUID, INTEGER) TO authenticated;