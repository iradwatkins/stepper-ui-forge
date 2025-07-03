-- Migration: Add Cash Payment Support
-- This migration adds support for physical cash payments with verification codes

-- Create order status enum (separate from payment status for better tracking)
CREATE TYPE order_status AS ENUM (
  'pending',           -- Order created, payment not yet initiated
  'processing',        -- Payment being processed
  'awaiting_cash_payment', -- Cash payment: waiting for physical cash collection
  'cash_confirmed',    -- Cash payment: organizer confirmed cash received
  'completed',         -- Order fully completed (tickets generated)
  'cancelled',         -- Order cancelled
  'refunded'          -- Order refunded
);

-- Add order_status column to orders table (only if it doesn't exist)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_status order_status DEFAULT 'pending';

-- Update existing orders to have appropriate status based on payment_status
UPDATE orders 
SET order_status = CASE 
  WHEN payment_status = 'completed' THEN 'completed'
  WHEN payment_status = 'failed' THEN 'cancelled'
  WHEN payment_status = 'refunded' THEN 'refunded'
  ELSE 'pending'
END;

-- Cash payment verification codes table
CREATE TABLE cash_payment_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  verification_code VARCHAR(12) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES profiles(id), -- organizer who confirmed payment
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fee reconciliation tracking table
CREATE TABLE fee_reconciliation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organizer_id UUID REFERENCES profiles(id) NOT NULL,
  cash_fees_owed DECIMAL(10,2) DEFAULT 0, -- Fees owed from cash transactions
  fees_deducted DECIMAL(10,2) DEFAULT 0,  -- Fees already deducted from online payments
  last_reconciliation_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_cash_payment_codes_verification_code ON cash_payment_codes(verification_code);
CREATE INDEX idx_cash_payment_codes_order_id ON cash_payment_codes(order_id);
CREATE INDEX idx_cash_payment_codes_expires_at ON cash_payment_codes(expires_at);
CREATE INDEX idx_fee_reconciliation_organizer_id ON fee_reconciliation(organizer_id);
CREATE INDEX idx_orders_order_status ON orders(order_status);

-- Enable RLS on new tables
ALTER TABLE cash_payment_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_reconciliation ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_payment_codes
CREATE POLICY "Event owners can view cash payment codes" ON cash_payment_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      JOIN events ON events.id = orders.event_id
      WHERE orders.id = cash_payment_codes.order_id 
      AND events.owner_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can update cash payment codes" ON cash_payment_codes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders 
      JOIN events ON events.id = orders.event_id
      WHERE orders.id = cash_payment_codes.order_id 
      AND events.owner_id = auth.uid()
    )
  );

-- RLS Policies for fee_reconciliation
CREATE POLICY "Organizers can view own fee reconciliation" ON fee_reconciliation
  FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can update own fee reconciliation" ON fee_reconciliation
  FOR UPDATE USING (organizer_id = auth.uid());

-- Add updated_at triggers
CREATE TRIGGER handle_cash_payment_codes_updated_at
  BEFORE UPDATE ON cash_payment_codes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_fee_reconciliation_updated_at
  BEFORE UPDATE ON fee_reconciliation
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to automatically create fee reconciliation record for new organizers
CREATE OR REPLACE FUNCTION create_fee_reconciliation_for_organizer()
RETURNS TRIGGER AS $$
BEGIN
  -- Create fee reconciliation record when someone creates their first event
  INSERT INTO fee_reconciliation (organizer_id)
  VALUES (NEW.owner_id)
  ON CONFLICT (organizer_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create fee reconciliation when first event is created
CREATE TRIGGER create_fee_reconciliation_on_first_event
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION create_fee_reconciliation_for_organizer();

-- Function to handle cash payment confirmation
CREATE OR REPLACE FUNCTION confirm_cash_payment(
  p_verification_code TEXT,
  p_confirmed_by UUID
)
RETURNS JSON AS $$
DECLARE
  v_code_record cash_payment_codes%ROWTYPE;
  v_order_record orders%ROWTYPE;
  v_result JSON;
BEGIN
  -- Get the verification code record
  SELECT * INTO v_code_record
  FROM cash_payment_codes
  WHERE verification_code = p_verification_code
  AND used_at IS NULL
  AND expires_at > NOW();
  
  -- Check if code exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired verification code'
    );
  END IF;
  
  -- Mark code as used
  UPDATE cash_payment_codes
  SET used_at = NOW(),
      confirmed_by = p_confirmed_by,
      updated_at = NOW()
  WHERE id = v_code_record.id;
  
  -- Update order status
  UPDATE orders
  SET order_status = 'cash_confirmed',
      updated_at = NOW()
  WHERE id = v_code_record.order_id
  RETURNING * INTO v_order_record;
  
  -- Add cash fees to reconciliation
  INSERT INTO fee_reconciliation (organizer_id, cash_fees_owed)
  VALUES (
    (SELECT owner_id FROM events WHERE id = v_order_record.event_id),
    v_code_record.total_amount * 0.03 -- 3% service fee
  )
  ON CONFLICT (organizer_id) 
  DO UPDATE SET 
    cash_fees_owed = fee_reconciliation.cash_fees_owed + (v_code_record.total_amount * 0.03),
    updated_at = NOW();
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'order_id', v_order_record.id,
    'order_status', v_order_record.order_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;