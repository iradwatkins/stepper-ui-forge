-- Migration: Add Event Likes System
-- This migration adds the ability for users to like individual events

-- Create event_likes table for tracking user likes on events
CREATE TABLE event_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure users can only like an event once
  UNIQUE(user_id, event_id)
);

-- Add indexes for performance
CREATE INDEX idx_event_likes_user_id ON event_likes(user_id);
CREATE INDEX idx_event_likes_event_id ON event_likes(event_id);
CREATE INDEX idx_event_likes_created_at ON event_likes(created_at);

-- Enable RLS on event_likes table
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_likes
CREATE POLICY "Users can view all event likes" ON event_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own event likes" ON event_likes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own event likes" ON event_likes
  FOR DELETE USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER handle_event_likes_updated_at
  BEFORE UPDATE ON event_likes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to get like count for an event
CREATE OR REPLACE FUNCTION get_event_like_count(event_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM event_likes
    WHERE event_id = event_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has liked an event
CREATE OR REPLACE FUNCTION is_event_liked(user_uuid UUID, event_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM event_likes
    WHERE user_id = user_uuid AND event_id = event_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle event like (like/unlike)
CREATE OR REPLACE FUNCTION toggle_event_like(user_uuid UUID, event_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_liked BOOLEAN;
BEGIN
  -- Check if already liked
  SELECT EXISTS (
    SELECT 1 FROM event_likes 
    WHERE user_id = user_uuid AND event_id = event_uuid
  ) INTO is_liked;
  
  IF is_liked THEN
    -- Unlike: remove the like
    DELETE FROM event_likes 
    WHERE user_id = user_uuid AND event_id = event_uuid;
    RETURN false;
  ELSE
    -- Like: add the like
    INSERT INTO event_likes (user_id, event_id) 
    VALUES (user_uuid, event_uuid);
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's liked events
CREATE OR REPLACE FUNCTION get_user_liked_events(user_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE(
  event_id UUID,
  event_title VARCHAR(255),
  event_description TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  event_location VARCHAR(255),
  event_image_url VARCHAR(500),
  organizer_name VARCHAR(255),
  liked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.title as event_title,
    e.description as event_description,
    e.event_date,
    e.location as event_location,
    e.image_url as event_image_url,
    p.full_name as organizer_name,
    el.created_at as liked_at
  FROM event_likes el
  JOIN events e ON el.event_id = e.id
  JOIN profiles p ON e.organizer_id = p.id
  WHERE el.user_id = user_uuid
  ORDER BY el.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get events with like counts and user like status
CREATE OR REPLACE FUNCTION get_events_with_likes(user_uuid UUID DEFAULT NULL, limit_count INTEGER DEFAULT 20)
RETURNS TABLE(
  event_id UUID,
  event_title VARCHAR(255),
  event_description TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  event_location VARCHAR(255),
  event_image_url VARCHAR(500),
  organizer_name VARCHAR(255),
  like_count INTEGER,
  is_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.title as event_title,
    e.description as event_description,
    e.event_date,
    e.location as event_location,
    e.image_url as event_image_url,
    p.full_name as organizer_name,
    COALESCE(like_counts.count, 0)::INTEGER as like_count,
    CASE 
      WHEN user_uuid IS NULL THEN false
      ELSE COALESCE(user_likes.is_liked, false)
    END as is_liked
  FROM events e
  JOIN profiles p ON e.organizer_id = p.id
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
  WHERE e.is_published = true
  ORDER BY e.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON event_likes TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_like_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_event_liked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_event_like(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_liked_events(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_events_with_likes(UUID, INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE event_likes IS 'Tracks user likes on individual events';
COMMENT ON FUNCTION get_event_like_count(UUID) IS 'Get total like count for an event';
COMMENT ON FUNCTION is_event_liked(UUID, UUID) IS 'Check if user has liked a specific event';
COMMENT ON FUNCTION toggle_event_like(UUID, UUID) IS 'Like or unlike an event (returns true if liked, false if unliked)';
COMMENT ON FUNCTION get_user_liked_events(UUID, INTEGER) IS 'Get all events liked by a user';
COMMENT ON FUNCTION get_events_with_likes(UUID, INTEGER) IS 'Get events with like counts and user like status';