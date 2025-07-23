-- Migration: Add order_id to tickets table
-- This migration adds the missing order_id column to link tickets with their orders

-- Add order_id column to tickets table
ALTER TABLE tickets
ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_tickets_order_id ON tickets(order_id);

-- Update RLS policies to include order checking

-- Drop existing policy to recreate with order support
DROP POLICY IF EXISTS "Users can view their own tickets" ON tickets;

-- Recreate policy with order-based access
CREATE POLICY "Users can view their own tickets" ON tickets
    FOR SELECT USING (
        -- User can see tickets if they match the holder email
        holder_email = auth.email() OR
        -- Or if they own the order
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = tickets.order_id 
            AND orders.customer_email = auth.email()
        ) OR
        -- Or if they own the event
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = tickets.event_id 
            AND events.owner_id = auth.uid()
        )
    );

-- Add comment for documentation
COMMENT ON COLUMN tickets.order_id IS 'Reference to the order that created this ticket';