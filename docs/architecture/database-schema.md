# Database Schema Design

## Core Tables Overview

The database schema is implemented in Supabase (PostgreSQL) with the following core entities:

### Event Management Tables
- `events` - Main event information and configuration
- `venues` - Physical location and layout data
- `organizers` - Event organizer profiles and permissions

### Ticketing System Tables  
- `ticket_types` - Different ticket categories and pricing
- `tickets` - Individual ticket instances
- `orders` - Purchase transactions and customer data
- `payments` - Payment processing records and status

### Seating Management Tables
- `seating_charts` - Venue layout configurations
- `seats` - Individual seat definitions and pricing
- `seat_holds` - Temporary seat reservations during checkout

### Team & Access Control Tables
- `team_members` - Event staff and role assignments
- `roles` - Permission definitions and capabilities
- `team_permissions` - Role-based access control mappings

### Check-in System Tables
- `check_ins` - Ticket validation records
- `qr_codes` - Secure QR code data and metadata

## Detailed Schema Definitions

### Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES organizers(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(20) CHECK (event_type IN ('simple', 'ticketed', 'premium')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  venue_id UUID REFERENCES venues(id),
  max_capacity INTEGER,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Ticket Types Table
```sql
CREATE TABLE ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity_available INTEGER,
  quantity_sold INTEGER DEFAULT 0,
  sale_start TIMESTAMP WITH TIME ZONE,
  sale_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Venues Table
```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(50),
  total_capacity INTEGER,
  seating_chart_url TEXT,
  accessibility_features TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Orders Table  
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  total_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  fees_amount DECIMAL(10,2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_gateway VARCHAR(50),
  confirmation_code VARCHAR(50) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS)

### Security Policies
All tables implement Row Level Security to ensure data isolation:

```sql
-- Events: Organizers can only access their own events
CREATE POLICY "Organizers can view own events" 
ON events FOR SELECT 
USING (organizer_id = auth.uid());

-- Tickets: Customers can only view their own tickets
CREATE POLICY "Customers can view own tickets"
ON tickets FOR SELECT
USING (order_id IN (
  SELECT id FROM orders WHERE customer_email = auth.email()
));

-- Team Members: Access based on team membership
CREATE POLICY "Team members can view event data"
ON events FOR SELECT
USING (id IN (
  SELECT event_id FROM team_members WHERE user_id = auth.uid()
));
```

## Indexes for Performance

### Primary Indexes
```sql
-- Event queries
CREATE INDEX idx_events_organizer_date ON events(organizer_id, start_date);
CREATE INDEX idx_events_status_date ON events(status, start_date);

-- Ticket queries  
CREATE INDEX idx_tickets_event_type ON tickets(event_id, ticket_type_id);
CREATE INDEX idx_tickets_order ON tickets(order_id);

-- Order queries
CREATE INDEX idx_orders_event_customer ON orders(event_id, customer_email);
CREATE INDEX idx_orders_confirmation ON orders(confirmation_code);

-- Check-in performance
CREATE INDEX idx_checkins_event_time ON check_ins(event_id, check_in_time);
CREATE INDEX idx_qr_codes_lookup ON qr_codes(code_hash);
```

## Data Relationships

### Foreign Key Relationships
- Events belong to Organizers (1:N)
- Ticket Types belong to Events (1:N) 
- Tickets belong to Orders and Ticket Types (N:1, N:1)
- Seats belong to Seating Charts (N:1)
- Team Members link Users to Events with Roles (N:N:N)

### Referential Integrity
- Cascade deletes for dependent records
- Constraint checks for data validity
- Trigger functions for computed fields

## Backup & Recovery Strategy

### Automated Backups
- Daily full database backups via Supabase
- Point-in-time recovery capability
- Cross-region backup replication
- Backup verification and testing

### Data Retention
- Event data retained for 7 years for tax purposes
- Customer data follows GDPR requirements
- Audit logs retained for 1 year
- Automated data purging for compliance