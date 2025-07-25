-- Create notifications system tables

-- Notification types enum
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error');

-- Notification categories enum
CREATE TYPE notification_category AS ENUM (
  'team',
  'security',
  'payment',
  'event',
  'inventory',
  'follower',
  'ticket',
  'system'
);

-- User notifications table
CREATE TABLE user_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',
  category notification_category NOT NULL DEFAULT 'system',
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  -- Store related IDs for linking
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_read ON user_notifications(read);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX idx_user_notifications_category ON user_notifications(category);

-- Row Level Security
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON user_notifications
  FOR DELETE USING (auth.uid() = user_id);

-- System can insert notifications (via service role)
CREATE POLICY "System can insert notifications" ON user_notifications
  FOR INSERT WITH CHECK (true);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type notification_type DEFAULT 'info',
  p_category notification_category DEFAULT 'system',
  p_metadata JSONB DEFAULT '{}',
  p_event_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_ticket_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO user_notifications (
    user_id,
    title,
    message,
    type,
    category,
    metadata,
    event_id,
    order_id,
    ticket_id
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_category,
    p_metadata,
    p_event_id,
    p_order_id,
    p_ticket_id
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all as read
    UPDATE user_notifications
    SET read = TRUE,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND read = FALSE;
  ELSE
    -- Mark specific notifications as read
    UPDATE user_notifications
    SET read = TRUE,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND id = ANY(p_notification_ids)
      AND read = FALSE;
  END IF;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to create notifications for various events

-- Notify when someone follows an organizer
CREATE OR REPLACE FUNCTION notify_new_follower() RETURNS TRIGGER AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  -- Get follower name
  SELECT COALESCE(full_name, email) INTO v_follower_name
  FROM profiles
  WHERE id = NEW.follower_id;
  
  -- Create notification for organizer
  PERFORM create_notification(
    NEW.organizer_id,
    'New follower',
    v_follower_name || ' started following you',
    'info'::notification_type,
    'follower'::notification_category,
    jsonb_build_object('follower_id', NEW.follower_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_follower
AFTER INSERT ON user_follows
FOR EACH ROW EXECUTE FUNCTION notify_new_follower();

-- Notify when a ticket is purchased
CREATE OR REPLACE FUNCTION notify_ticket_purchase() RETURNS TRIGGER AS $$
DECLARE
  v_event_title TEXT;
  v_organizer_id UUID;
  v_ticket_type TEXT;
BEGIN
  -- Get event details
  SELECT e.title, e.owner_id, tt.name INTO v_event_title, v_organizer_id, v_ticket_type
  FROM events e
  JOIN ticket_types tt ON tt.event_id = e.id
  WHERE tt.id = NEW.ticket_type_id;
  
  -- Create notification for organizer
  PERFORM create_notification(
    v_organizer_id,
    'Ticket sold',
    'New ' || v_ticket_type || ' ticket sold for ' || v_event_title,
    'success'::notification_type,
    'ticket'::notification_category,
    jsonb_build_object(
      'ticket_id', NEW.id,
      'holder_email', NEW.holder_email
    ),
    NEW.event_id,
    NULL,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_ticket_purchase
AFTER INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION notify_ticket_purchase();

-- Notify when team member is added
CREATE OR REPLACE FUNCTION notify_team_member_added() RETURNS TRIGGER AS $$
DECLARE
  v_event_title TEXT;
  v_member_name TEXT;
BEGIN
  -- Get event title
  SELECT title INTO v_event_title
  FROM events
  WHERE id = NEW.event_id;
  
  -- Get member name
  SELECT COALESCE(full_name, email) INTO v_member_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Notify the team member
  PERFORM create_notification(
    NEW.user_id,
    'Added to team',
    'You were added as team member for ' || v_event_title,
    'success'::notification_type,
    'team'::notification_category,
    jsonb_build_object('role', NEW.role),
    NEW.event_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_team_member_added
AFTER INSERT ON team_members
FOR EACH ROW EXECUTE FUNCTION notify_team_member_added();

-- Update timestamp trigger
CREATE TRIGGER update_user_notifications_updated_at
  BEFORE UPDATE ON user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();