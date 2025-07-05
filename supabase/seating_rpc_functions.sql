-- RPC Functions for Seating System
-- These functions provide the business logic for seat management

-- ===============================
-- GET AVAILABLE SEATS
-- ===============================
CREATE OR REPLACE FUNCTION get_available_seats(
    event_id_param UUID,
    seating_chart_id_param UUID
)
RETURNS TABLE (
    seat_id UUID,
    seat_identifier TEXT,
    section TEXT,
    row_label TEXT,
    seat_number TEXT,
    x_position DECIMAL,
    y_position DECIMAL,
    current_price DECIMAL,
    category_name TEXT,
    category_color TEXT,
    is_accessible BOOLEAN,
    is_premium BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        COALESCE(s.current_price, s.base_price) as current_price,
        sc.name as category_name,
        sc.color_code as category_color,
        s.is_accessible,
        s.is_premium
    FROM seats s
    LEFT JOIN seat_categories sc ON sc.id = s.seat_category_id
    WHERE s.seating_chart_id = seating_chart_id_param
    AND s.is_available = true
    AND NOT EXISTS (
        SELECT 1 FROM seat_holds sh 
        WHERE sh.seat_id = s.id 
        AND sh.event_id = event_id_param
        AND sh.status = 'active' 
        AND sh.expires_at > NOW()
    )
    AND NOT EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.event_id = event_id_param
        AND t.status = 'active'
        AND t.qr_code LIKE '%' || s.seat_identifier || '%'
    )
    ORDER BY s.section, s.row_label, s.seat_number;
END;
$$;

-- ===============================
-- GET BEST AVAILABLE SEATS
-- ===============================
CREATE OR REPLACE FUNCTION get_best_available_seats(
    event_id_param UUID,
    seating_chart_id_param UUID,
    quantity_param INTEGER,
    prefer_together BOOLEAN DEFAULT true,
    max_price DECIMAL DEFAULT NULL,
    section_preference TEXT DEFAULT NULL
)
RETURNS TABLE (
    seat_id UUID,
    seat_identifier TEXT,
    section TEXT,
    row_label TEXT,
    seat_number TEXT,
    x_position DECIMAL,
    y_position DECIMAL,
    current_price DECIMAL,
    category_name TEXT,
    category_color TEXT,
    is_accessible BOOLEAN,
    is_premium BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    available_seats CURSOR FOR
        SELECT 
            s.id as seat_id,
            s.seat_identifier,
            s.section,
            s.row_label,
            s.seat_number,
            s.x_position,
            s.y_position,
            COALESCE(s.current_price, s.base_price) as current_price,
            sc.name as category_name,
            sc.color_code as category_color,
            s.is_accessible,
            s.is_premium
        FROM seats s
        LEFT JOIN seat_categories sc ON sc.id = s.seat_category_id
        WHERE s.seating_chart_id = seating_chart_id_param
        AND s.is_available = true
        AND (max_price IS NULL OR COALESCE(s.current_price, s.base_price) <= max_price)
        AND (section_preference IS NULL OR s.section = section_preference)
        AND NOT EXISTS (
            SELECT 1 FROM seat_holds sh 
            WHERE sh.seat_id = s.id 
            AND sh.event_id = event_id_param
            AND sh.status = 'active' 
            AND sh.expires_at > NOW()
        )
        AND NOT EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.event_id = event_id_param
            AND t.status = 'active'
            AND t.qr_code LIKE '%' || s.seat_identifier || '%'
        )
        ORDER BY 
            CASE WHEN section_preference IS NOT NULL AND s.section = section_preference THEN 0 ELSE 1 END,
            COALESCE(s.current_price, s.base_price),
            s.section,
            s.row_label,
            s.seat_number
        LIMIT quantity_param;
BEGIN
    RETURN QUERY
    SELECT * FROM available_seats;
END;
$$;

-- ===============================
-- HOLD SEATS
-- ===============================
CREATE OR REPLACE FUNCTION hold_seats(
    seat_ids UUID[],
    event_id_param UUID,
    session_id_param TEXT,
    hold_duration_minutes INTEGER DEFAULT 15,
    customer_email_param TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    seat_id UUID;
    expires_at_time TIMESTAMP WITH TIME ZONE;
    hold_id UUID;
    success_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    expires_at_time := NOW() + INTERVAL '1 minute' * hold_duration_minutes;
    
    -- Check if all seats are available
    FOR seat_id IN SELECT unnest(seat_ids) LOOP
        total_count := total_count + 1;
        
        -- Check if seat is available
        IF NOT EXISTS (
            SELECT 1 FROM seats s
            WHERE s.id = seat_id
            AND s.is_available = true
        ) THEN
            RAISE EXCEPTION 'Seat % is not available', seat_id;
        END IF;
        
        -- Check if seat is already held
        IF EXISTS (
            SELECT 1 FROM seat_holds sh
            WHERE sh.seat_id = seat_id
            AND sh.event_id = event_id_param
            AND sh.status = 'active'
            AND sh.expires_at > NOW()
        ) THEN
            RAISE EXCEPTION 'Seat % is already held', seat_id;
        END IF;
        
        -- Check if seat is already sold
        IF EXISTS (
            SELECT 1 FROM tickets t
            JOIN seats s ON t.qr_code LIKE '%' || s.seat_identifier || '%'
            WHERE s.id = seat_id
            AND t.event_id = event_id_param
            AND t.status = 'active'
        ) THEN
            RAISE EXCEPTION 'Seat % is already sold', seat_id;
        END IF;
    END LOOP;
    
    -- Hold all seats
    FOR seat_id IN SELECT unnest(seat_ids) LOOP
        INSERT INTO seat_holds (
            seat_id,
            event_id,
            session_id,
            customer_email,
            expires_at,
            hold_duration_minutes,
            status,
            hold_reason
        ) VALUES (
            seat_id,
            event_id_param,
            session_id_param,
            customer_email_param,
            expires_at_time,
            hold_duration_minutes,
            'active',
            'checkout'
        );
        
        success_count := success_count + 1;
    END LOOP;
    
    RETURN 'Successfully held ' || success_count || ' out of ' || total_count || ' seats';
END;
$$;

-- ===============================
-- RELEASE SEAT HOLDS
-- ===============================
CREATE OR REPLACE FUNCTION release_seat_holds(
    hold_ids UUID[] DEFAULT NULL,
    session_id_param TEXT DEFAULT NULL,
    event_id_param UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    released_count INTEGER := 0;
BEGIN
    -- Release specific holds by ID
    IF hold_ids IS NOT NULL THEN
        UPDATE seat_holds 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = ANY(hold_ids)
        AND status = 'active';
        
        GET DIAGNOSTICS released_count = ROW_COUNT;
    
    -- Release holds by session ID
    ELSIF session_id_param IS NOT NULL THEN
        UPDATE seat_holds 
        SET status = 'cancelled', updated_at = NOW()
        WHERE session_id = session_id_param
        AND status = 'active';
        
        GET DIAGNOSTICS released_count = ROW_COUNT;
    
    -- Release holds by event ID
    ELSIF event_id_param IS NOT NULL THEN
        UPDATE seat_holds 
        SET status = 'cancelled', updated_at = NOW()
        WHERE event_id = event_id_param
        AND status = 'active';
        
        GET DIAGNOSTICS released_count = ROW_COUNT;
    
    ELSE
        RAISE EXCEPTION 'Must provide either hold_ids, session_id_param, or event_id_param';
    END IF;
    
    RETURN released_count;
END;
$$;

-- ===============================
-- COMPLETE SEAT PURCHASE
-- ===============================
CREATE OR REPLACE FUNCTION complete_seat_purchase(
    session_id_param TEXT,
    event_id_param UUID,
    order_id_param UUID,
    customer_email_param TEXT,
    customer_name_param TEXT,
    payment_method_param TEXT
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    hold_record RECORD;
    seat_record RECORD;
    ticket_id UUID;
    ticket_ids TEXT[] := '{}';
    qr_code_text TEXT;
BEGIN
    -- Get all active holds for this session
    FOR hold_record IN 
        SELECT sh.*, s.seat_identifier, s.section, s.row_label, s.seat_number
        FROM seat_holds sh
        JOIN seats s ON s.id = sh.seat_id
        WHERE sh.session_id = session_id_param
        AND sh.event_id = event_id_param
        AND sh.status = 'active'
        AND sh.expires_at > NOW()
    LOOP
        -- Generate QR code for this seat
        qr_code_text := 'SEAT_' || event_id_param || '_' || hold_record.seat_identifier || '_' || uuid_generate_v4();
        
        -- Find the appropriate ticket type (assume general admission for now)
        -- In a real implementation, you'd map seats to specific ticket types
        INSERT INTO tickets (
            event_id,
            ticket_type_id,
            holder_email,
            holder_name,
            qr_code,
            status
        ) 
        SELECT 
            event_id_param,
            tt.id,
            customer_email_param,
            customer_name_param,
            qr_code_text,
            'active'
        FROM ticket_types tt
        WHERE tt.event_id = event_id_param
        AND tt.is_active = true
        ORDER BY tt.price
        LIMIT 1
        RETURNING id INTO ticket_id;
        
        -- Add to result array
        ticket_ids := ticket_ids || ticket_id::TEXT;
        
        -- Mark the hold as completed
        UPDATE seat_holds 
        SET status = 'completed', updated_at = NOW()
        WHERE id = hold_record.id;
        
        -- Update seat availability (optional - depends on business logic)
        -- UPDATE seats SET is_available = false WHERE id = hold_record.seat_id;
    END LOOP;
    
    -- Release any remaining holds for this session
    UPDATE seat_holds 
    SET status = 'cancelled', updated_at = NOW()
    WHERE session_id = session_id_param
    AND event_id = event_id_param
    AND status = 'active';
    
    RETURN ticket_ids;
END;
$$;

-- ===============================
-- CLEANUP EXPIRED HOLDS
-- ===============================
CREATE OR REPLACE FUNCTION cleanup_expired_seat_holds()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    -- Mark expired holds as expired
    UPDATE seat_holds 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
    AND expires_at <= NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$;

-- ===============================
-- EXTEND SEAT HOLD
-- ===============================
CREATE OR REPLACE FUNCTION extend_seat_hold(
    hold_id_param UUID,
    additional_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    hold_exists BOOLEAN := false;
BEGIN
    -- Check if hold exists and is active
    SELECT EXISTS (
        SELECT 1 FROM seat_holds 
        WHERE id = hold_id_param 
        AND status = 'active'
        AND expires_at > NOW()
    ) INTO hold_exists;
    
    IF NOT hold_exists THEN
        RETURN false;
    END IF;
    
    -- Extend the hold
    UPDATE seat_holds 
    SET 
        expires_at = expires_at + INTERVAL '1 minute' * additional_minutes,
        status = 'extended',
        updated_at = NOW()
    WHERE id = hold_id_param;
    
    RETURN true;
END;
$$;

-- ===============================
-- GET SEAT HOLD STATUS
-- ===============================
CREATE OR REPLACE FUNCTION get_seat_hold_status(
    session_id_param TEXT,
    event_id_param UUID
)
RETURNS TABLE (
    hold_id UUID,
    seat_id UUID,
    seat_identifier TEXT,
    section TEXT,
    row_label TEXT,
    seat_number TEXT,
    status hold_status,
    expires_at TIMESTAMP WITH TIME ZONE,
    time_remaining_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sh.id as hold_id,
        sh.seat_id,
        s.seat_identifier,
        s.section,
        s.row_label,
        s.seat_number,
        sh.status,
        sh.expires_at,
        GREATEST(0, EXTRACT(EPOCH FROM (sh.expires_at - NOW())) / 60)::INTEGER as time_remaining_minutes
    FROM seat_holds sh
    JOIN seats s ON s.id = sh.seat_id
    WHERE sh.session_id = session_id_param
    AND sh.event_id = event_id_param
    ORDER BY sh.created_at;
END;
$$;

-- ===============================
-- GRANTS AND PERMISSIONS
-- ===============================
-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_available_seats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_best_available_seats(UUID, UUID, INTEGER, BOOLEAN, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION hold_seats(UUID[], UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION release_seat_holds(UUID[], TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_seat_purchase(TEXT, UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_seat_holds() TO authenticated;
GRANT EXECUTE ON FUNCTION extend_seat_hold(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_seat_hold_status(TEXT, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_available_seats(UUID, UUID) IS 'Returns all available seats for a given event and seating chart';
COMMENT ON FUNCTION get_best_available_seats(UUID, UUID, INTEGER, BOOLEAN, DECIMAL, TEXT) IS 'Returns the best available seats based on preferences';
COMMENT ON FUNCTION hold_seats(UUID[], UUID, TEXT, INTEGER, TEXT) IS 'Temporarily holds seats for a customer during checkout';
COMMENT ON FUNCTION release_seat_holds(UUID[], TEXT, UUID) IS 'Releases seat holds by ID, session, or event';
COMMENT ON FUNCTION complete_seat_purchase(TEXT, UUID, UUID, TEXT, TEXT, TEXT) IS 'Converts held seats to purchased tickets';
COMMENT ON FUNCTION cleanup_expired_seat_holds() IS 'Marks expired seat holds as expired';
COMMENT ON FUNCTION extend_seat_hold(UUID, INTEGER) IS 'Extends a seat hold by additional minutes';
COMMENT ON FUNCTION get_seat_hold_status(TEXT, UUID) IS 'Returns the status of seat holds for a session';