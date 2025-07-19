-- Migration: Add referral analytics tracking for UTM parameters
-- This allows tracking of referral link performance across different platforms and campaigns

-- Create referral click analytics table
CREATE TABLE referral_click_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referral_code_id UUID REFERENCES referral_codes(id) ON DELETE CASCADE NOT NULL,
  referral_code VARCHAR(20) NOT NULL,
  
  -- UTM Parameters
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(100),
  utm_content VARCHAR(100),
  
  -- Click metadata
  ip_address INET,
  user_agent TEXT,
  referrer_url TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Conversion tracking
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITH TIME ZONE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Geographic data (if available)
  country_code VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_referral_click_analytics_code_id ON referral_click_analytics(referral_code_id);
CREATE INDEX idx_referral_click_analytics_code ON referral_click_analytics(referral_code);
CREATE INDEX idx_referral_click_analytics_utm_source ON referral_click_analytics(utm_source);
CREATE INDEX idx_referral_click_analytics_utm_campaign ON referral_click_analytics(utm_campaign);
CREATE INDEX idx_referral_click_analytics_clicked_at ON referral_click_analytics(clicked_at);
CREATE INDEX idx_referral_click_analytics_converted ON referral_click_analytics(converted);

-- Enable RLS
ALTER TABLE referral_click_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own referral analytics" ON referral_click_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM referral_codes rc
      JOIN follower_promotions fp ON fp.id = rc.promotion_id
      WHERE rc.id = referral_click_analytics.referral_code_id
      AND (fp.follower_id = auth.uid() OR fp.organizer_id = auth.uid())
    )
  );

CREATE POLICY "System can insert analytics" ON referral_click_analytics
  FOR INSERT WITH CHECK (true); -- Handled by application logic

-- Create view for aggregated analytics by platform
CREATE VIEW referral_platform_analytics AS
SELECT 
  rc.id as referral_code_id,
  rc.code,
  rc.event_id,
  fp.follower_id,
  fp.organizer_id,
  rca.utm_source as platform,
  COUNT(*) as total_clicks,
  COUNT(CASE WHEN rca.converted THEN 1 END) as conversions,
  ROUND(COUNT(CASE WHEN rca.converted THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as conversion_rate,
  MIN(rca.clicked_at) as first_click,
  MAX(rca.clicked_at) as last_click
FROM referral_codes rc
JOIN follower_promotions fp ON fp.id = rc.promotion_id
JOIN referral_click_analytics rca ON rca.referral_code_id = rc.id
WHERE rca.utm_source IS NOT NULL
GROUP BY rc.id, rc.code, rc.event_id, fp.follower_id, fp.organizer_id, rca.utm_source;

-- Create view for campaign performance
CREATE VIEW referral_campaign_analytics AS
SELECT 
  rc.id as referral_code_id,
  rc.code,
  rc.event_id,
  fp.follower_id,
  fp.organizer_id,
  rca.utm_campaign as campaign,
  rca.utm_source as source,
  rca.utm_medium as medium,
  COUNT(*) as total_clicks,
  COUNT(CASE WHEN rca.converted THEN 1 END) as conversions,
  ROUND(COUNT(CASE WHEN rca.converted THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as conversion_rate
FROM referral_codes rc
JOIN follower_promotions fp ON fp.id = rc.promotion_id
JOIN referral_click_analytics rca ON rca.referral_code_id = rc.id
WHERE rca.utm_campaign IS NOT NULL
GROUP BY rc.id, rc.code, rc.event_id, fp.follower_id, fp.organizer_id, 
         rca.utm_campaign, rca.utm_source, rca.utm_medium;

-- Function to track referral click with analytics
CREATE OR REPLACE FUNCTION track_referral_click(
  p_referral_code VARCHAR(20),
  p_utm_source VARCHAR(100) DEFAULT NULL,
  p_utm_medium VARCHAR(100) DEFAULT NULL,
  p_utm_campaign VARCHAR(100) DEFAULT NULL,
  p_utm_term VARCHAR(100) DEFAULT NULL,
  p_utm_content VARCHAR(100) DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_code_id UUID;
  v_analytics_id UUID;
BEGIN
  -- Get referral code ID
  SELECT id INTO v_code_id
  FROM referral_codes
  WHERE code = p_referral_code AND is_active = true;
  
  IF v_code_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update click count on referral_codes
  UPDATE referral_codes
  SET clicks_count = clicks_count + 1,
      updated_at = NOW()
  WHERE id = v_code_id;
  
  -- Insert analytics record
  INSERT INTO referral_click_analytics (
    referral_code_id,
    referral_code,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    ip_address,
    user_agent,
    referrer_url
  ) VALUES (
    v_code_id,
    p_referral_code,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_utm_term,
    p_utm_content,
    p_ip_address,
    p_user_agent,
    p_referrer_url
  ) RETURNING id INTO v_analytics_id;
  
  RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark analytics record as converted
CREATE OR REPLACE FUNCTION mark_referral_conversion(
  p_referral_code VARCHAR(20),
  p_order_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  -- Find the most recent unverted click for this referral code
  SELECT id INTO v_analytics_id
  FROM referral_click_analytics
  WHERE referral_code = p_referral_code
    AND converted = false
  ORDER BY clicked_at DESC
  LIMIT 1;
  
  IF v_analytics_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Mark as converted
  UPDATE referral_click_analytics
  SET converted = true,
      converted_at = NOW(),
      order_id = p_order_id
  WHERE id = v_analytics_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION track_referral_click TO authenticated;
GRANT EXECUTE ON FUNCTION mark_referral_conversion TO authenticated;

-- Add comments
COMMENT ON TABLE referral_click_analytics IS 'Tracks detailed analytics for referral link clicks including UTM parameters and conversions';
COMMENT ON VIEW referral_platform_analytics IS 'Aggregated view of referral performance by platform (utm_source)';
COMMENT ON VIEW referral_campaign_analytics IS 'Aggregated view of referral performance by campaign';