-- Script to fix event likes display issues
-- Run this in Supabase SQL Editor

-- First, check if the display_price column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'events' 
                   AND column_name = 'display_price') THEN
        ALTER TABLE events 
        ADD COLUMN display_price JSONB DEFAULT NULL;
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_events_display_price ON events USING GIN (display_price);
    END IF;
END $$;

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_user_liked_events(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_events_with_likes(UUID, INTEGER);

-- Recreate get_user_liked_events with correct column names
CREATE OR REPLACE FUNCTION get_user_liked_events(user_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE(
  event_id UUID,
  event_title TEXT,
  event_description TEXT,
  event_date DATE,
  event_time TIME,
  event_location TEXT,
  event_image_url TEXT,
  organizer_name TEXT,
  liked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.title as event_title,
    e.description as event_description,
    e.date as event_date,
    e.time as event_time,
    e.location as event_location,
    COALESCE(
      e.images->>'primary',
      e.images->'gallery'->0->>'url',
      NULL
    ) as event_image_url,
    p.full_name as organizer_name,
    el.created_at as liked_at
  FROM event_likes el
  JOIN events e ON el.event_id = e.id
  JOIN profiles p ON e.owner_id = p.id  -- Fixed: was organizer_id
  WHERE el.user_id = user_uuid
  ORDER BY el.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate get_events_with_likes with correct column names
CREATE OR REPLACE FUNCTION get_events_with_likes(user_uuid UUID DEFAULT NULL, limit_count INTEGER DEFAULT 20)
RETURNS TABLE(
  event_id UUID,
  event_title TEXT,
  event_description TEXT,
  event_date DATE,
  event_time TIME,
  event_location TEXT,
  event_image_url TEXT,
  organizer_name TEXT,
  like_count INTEGER,
  is_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.title as event_title,
    e.description as event_description,
    e.date as event_date,
    e.time as event_time,
    e.location as event_location,
    COALESCE(
      e.images->>'primary',
      e.images->'gallery'->0->>'url',
      NULL
    ) as event_image_url,
    p.full_name as organizer_name,
    COALESCE(like_counts.count, 0)::INTEGER as like_count,
    CASE 
      WHEN user_uuid IS NULL THEN false
      ELSE COALESCE(user_likes.is_liked, false)
    END as is_liked
  FROM events e
  JOIN profiles p ON e.owner_id = p.id  -- Fixed: was organizer_id
  LEFT JOIN (
    SELECT event_id, COUNT(*) as count
    FROM event_likes
    GROUP BY event_id
  ) like_counts ON e.id = like_counts.event_id
  LEFT JOIN (
    SELECT event_id, true as is_liked
    FROM event_likes
    WHERE user_id = user_uuid
  ) user_likes ON e.id = user_likes.event_id
  WHERE e.status = 'published'  -- Fixed: was is_published
    AND e.is_public = true
  ORDER BY e.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_liked_events(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_events_with_likes(UUID, INTEGER) TO authenticated;

-- Test the functions (uncomment to test with a real user ID)
-- SELECT * FROM get_user_liked_events('your-user-id-here'::UUID, 10);
-- SELECT * FROM get_events_with_likes('your-user-id-here'::UUID, 10);