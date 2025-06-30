-- Function to safely increment sold quantity for ticket types
CREATE OR REPLACE FUNCTION increment_sold_quantity(
    ticket_type_id UUID,
    quantity_to_add INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE ticket_types 
    SET sold_quantity = sold_quantity + quantity_to_add,
        updated_at = NOW()
    WHERE id = ticket_type_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;