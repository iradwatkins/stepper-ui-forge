-- Payment Configuration Table
-- Stores payment gateway configurations securely in database

CREATE TABLE payment_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_name varchar(50) NOT NULL UNIQUE,
  environment varchar(20) NOT NULL DEFAULT 'sandbox', -- 'sandbox' or 'production'
  is_active boolean NOT NULL DEFAULT false,
  configuration jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE payment_configurations ENABLE ROW LEVEL SECURITY;

-- Only admins can access payment configurations
CREATE POLICY "Admin only access" ON payment_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.permission_level = 'admin'
    )
  );

-- Insert default payment gateway configurations
INSERT INTO payment_configurations (gateway_name, environment, is_active, configuration) VALUES 
(
  'paypal',
  'sandbox',
  true,
  '{
    "client_id": "sandbox_client_id_placeholder",
    "client_secret": "sandbox_client_secret_placeholder",
    "webhook_id": "webhook_id_placeholder"
  }'::jsonb
),
(
  'square',
  'sandbox',
  true,
  '{
    "application_id": "sandbox_app_id_placeholder",
    "access_token": "sandbox_access_token_placeholder",
    "location_id": "sandbox_location_id_placeholder"
  }'::jsonb
),
(
  'cashapp',
  'sandbox',
  true,
  '{
    "client_id": "sandbox_cashapp_client_id_placeholder"
  }'::jsonb
);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_configuration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER payment_configurations_updated_at
  BEFORE UPDATE ON payment_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_configuration_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_payment_configurations_gateway_environment 
ON payment_configurations(gateway_name, environment);

CREATE INDEX idx_payment_configurations_active 
ON payment_configurations(is_active);