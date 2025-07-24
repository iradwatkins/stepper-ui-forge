-- Fix RPC functions for liked events to use correct column names
-- This fixes the error: "column events_1.display_price does not exist"

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_liked_events(UUID);
DROP FUNCTION IF EXISTS get_events_with_likes(UUID);

-- Create get_user_liked_events function with correct column names
CREATE OR REPLACE FUNCTION get_user_liked_events(user_uuid UUID)
RETURNS TABLE (
    event_id UUID,
    event_title TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    event_location TEXT,
    event_image_url TEXT,
    organizer_name TEXT,
    organizer_id UUID,
    like_created_at TIMESTAMP WITH TIME ZONE,
    ticket_min_price DECIMAL,
    ticket_max_price DECIMAL,
    is_upcoming BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as event_id,
        e.title as event_title,
        e.date as event_date,
        e.location as event_location,
        COALESCE(
            CASE 
                WHEN jsonb_array_length(e.images) > 0 
                THEN e.images->0->>'url'
                ELSE NULL
            END,
            ''
        ) as event_image_url,
        p.full_name as organizer_name,
        e.owner_id as organizer_id,
        el.created_at as like_created_at,
        COALESCE(
            (SELECT MIN(tt.price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.available = true),
            0
        ) as ticket_min_price,
        COALESCE(
            (SELECT MAX(tt.price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.available = true),
            0
        ) as ticket_max_price,
        CASE 
            WHEN e.date >= NOW() THEN true
            ELSE false
        END as is_upcoming
    FROM event_likes el
    INNER JOIN events e ON e.id = el.event_id
    INNER JOIN profiles p ON p.id = e.owner_id
    WHERE el.user_id = user_uuid
    AND e.status = 'published'
    ORDER BY el.created_at DESC;
END;
$$;

-- Create get_events_with_likes function with correct column names
CREATE OR REPLACE FUNCTION get_events_with_likes(user_uuid UUID)
RETURNS TABLE (
    event_id UUID,
    event_title TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    event_location TEXT,
    event_image_url TEXT,
    organizer_name TEXT,
    organizer_id UUID,
    ticket_min_price DECIMAL,
    ticket_max_price DECIMAL,
    total_likes BIGINT,
    is_liked BOOLEAN,
    is_upcoming BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as event_id,
        e.title as event_title,
        e.date as event_date,
        e.location as event_location,
        COALESCE(
            CASE 
                WHEN jsonb_array_length(e.images) > 0 
                THEN e.images->0->>'url'
                ELSE NULL
            END,
            ''
        ) as event_image_url,
        p.full_name as organizer_name,
        e.owner_id as organizer_id,
        COALESCE(
            (SELECT MIN(tt.price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.available = true),
            0
        ) as ticket_min_price,
        COALESCE(
            (SELECT MAX(tt.price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.available = true),
            0
        ) as ticket_max_price,
        COUNT(el.id) as total_likes,
        EXISTS(
            SELECT 1 FROM event_likes el2 
            WHERE el2.event_id = e.id 
            AND el2.user_id = user_uuid
        ) as is_liked,
        CASE 
            WHEN e.date >= NOW() THEN true
            ELSE false
        END as is_upcoming
    FROM events e
    INNER JOIN profiles p ON p.id = e.owner_id
    LEFT JOIN event_likes el ON el.event_id = e.id
    WHERE e.status = 'published'
    GROUP BY e.id, e.title, e.date, e.location, e.images, p.full_name, e.owner_id
    ORDER BY e.date DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_liked_events(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_events_with_likes(UUID) TO authenticated;