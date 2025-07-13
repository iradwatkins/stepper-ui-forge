-- Create functions for business statistics

-- Function to increment business view count
CREATE OR REPLACE FUNCTION increment_business_views(business_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE community_businesses
  SET view_count = view_count + 1,
      last_active_at = now()
  WHERE id = business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment business contact count
CREATE OR REPLACE FUNCTION increment_business_contacts(business_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE community_businesses
  SET contact_count = contact_count + 1,
      last_active_at = now()
  WHERE id = business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_business_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_business_contacts(uuid) TO authenticated;