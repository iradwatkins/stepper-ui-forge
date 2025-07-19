-- Deploy Missing Supabase RPC Functions
-- Run this script in your Supabase SQL Editor to fix 404 errors for event like functions
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

-- Create event_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure users can only like an event once
  UNIQUE(user_id, event_id)
);

-- Add indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_event_likes_user_id ON event_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_event_id ON event_likes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_created_at ON event_likes(created_at);

-- Enable RLS on event_likes table
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view all event likes" ON event_likes;
DROP POLICY IF EXISTS "Users can create their own event likes" ON event_likes;
DROP POLICY IF EXISTS "Users can delete their own event likes" ON event_likes;

-- RLS Policies for event_likes
CREATE POLICY "Users can view all event likes" ON event_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own event likes" ON event_likes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own event likes" ON event_likes
  FOR DELETE USING (user_id = auth.uid());

-- Function to get like count for an event
CREATE OR REPLACE FUNCTION get_event_like_count(event_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
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

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON event_likes TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_like_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_event_liked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_event_like(UUID, UUID) TO authenticated;

-- Test the functions work
SELECT 'Functions deployed successfully!' AS status;