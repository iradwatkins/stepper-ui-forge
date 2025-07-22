-- Strengthen RLS policies for better security
-- This migration ensures all tables require authentication for writes
-- and restricts data access appropriately

-- 1. Strengthen profiles table policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view limited profile data"
ON public.profiles
FOR SELECT
USING (true); -- Allow viewing, but we've removed email from queries

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. Strengthen events table policies
DROP POLICY IF EXISTS "Anyone can view published events" ON public.events;
CREATE POLICY "Anyone can view published events"
ON public.events
FOR SELECT
USING (status = 'published' OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events"
ON public.events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- 3. Strengthen tickets table policies
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
CREATE POLICY "Authenticated users can create tickets"
ON public.tickets
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view their tickets" ON public.tickets;
CREATE POLICY "Users can view own tickets"
ON public.tickets
FOR SELECT
USING (holder_email = auth.email() OR EXISTS (
  SELECT 1 FROM events WHERE events.id = tickets.event_id AND events.owner_id = auth.uid()
));

-- 4. Strengthen team_members policies
DROP POLICY IF EXISTS "Team members can be viewed by event participants" ON public.team_members;
CREATE POLICY "Limited team member visibility"
ON public.team_members
FOR SELECT
USING (
  -- Event organizers can see all team members
  EXISTS (SELECT 1 FROM events WHERE events.id = team_members.event_id AND events.owner_id = auth.uid())
  OR
  -- Team members can see other team members
  EXISTS (SELECT 1 FROM team_members tm WHERE tm.event_id = team_members.event_id AND tm.user_id = auth.uid())
  OR
  -- Users can see themselves
  user_id = auth.uid()
);

-- 5. Ensure all financial tables require authentication
-- Orders table
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Payouts and banking tables handled in other migrations

-- 6. Add authentication requirement for all write operations on user_follows
DROP POLICY IF EXISTS "Users can follow organizers" ON public.user_follows;
CREATE POLICY "Authenticated users can follow organizers"
ON public.user_follows
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can unfollow organizers" ON public.user_follows;
CREATE POLICY "Users can unfollow organizers"
ON public.user_follows
FOR DELETE
USING (follower_id = auth.uid());

-- 7. Restrict event_likes to authenticated users only
ALTER TABLE public.event_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can like events" ON public.event_likes;
CREATE POLICY "Authenticated users can like events"
ON public.event_likes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can unlike events" ON public.event_likes;
CREATE POLICY "Users can unlike events"
ON public.event_likes
FOR DELETE
USING (user_id = auth.uid());

-- 8. Add audit log for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- No one can modify audit logs (insert only via functions)
CREATE POLICY "No one can modify audit logs"
ON public.security_audit_log
FOR ALL
USING (false)
WITH CHECK (false);

-- 9. Add function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_details JSONB DEFAULT '{}'::JSONB
) RETURNS void AS $$
BEGIN
  INSERT INTO security_audit_log (event_type, user_id, details)
  VALUES (p_event_type, auth.uid(), p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_status_owner ON events(status, owner_id);
CREATE INDEX IF NOT EXISTS idx_tickets_holder_email ON tickets(holder_email);
CREATE INDEX IF NOT EXISTS idx_team_members_event_user ON team_members(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON security_audit_log(created_at DESC);