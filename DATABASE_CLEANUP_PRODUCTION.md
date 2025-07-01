# Database Cleanup for Production

## Current Database Schema Status

Your Supabase database has a comprehensive schema for an event ticketing platform with the following structure:

### Core Tables:
- **`profiles`** - User profile data (extends Supabase auth.users)
- **`events`** - Event information and settings
- **`ticket_types`** - Different ticket tiers/types per event
- **`tickets`** - Individual ticket instances with QR codes
- **`orders`** - Payment transactions and order tracking
- **`order_items`** - Line items for each order
- **`team_members`** - Event collaboration and team management
- **`event_analytics`** - Event metrics and analytics

### Additional Features (from migrations):
- **Cash Payment Support** - Handle offline/cash transactions
- **Inventory Management** - Track ticket availability and sales
- **Seating Management** - Reserved seating with seat mapping
- **Enhanced Team Management** - Advanced permissions and roles

## User Types in the System

Based on the database schema, here are the different user types:

### 1. **Event Organizers** (Primary Users)
- **Role**: Create and manage events
- **Permissions**: 
  - Create/edit/delete their own events
  - Manage ticket types and pricing
  - View sales analytics and reports
  - Invite team members
  - Process cash payments
  - Manage check-ins

### 2. **Team Members** (Collaborative Users)
- **Role**: Help manage events for organizers
- **Permissions** (configurable via `team_members.permissions`):
  - View event details
  - Manage check-ins
  - Process payments
  - View analytics (depending on role)
  - Manage attendees

### 3. **Event Attendees** (Ticket Holders)
- **Role**: Purchase and attend events
- **Permissions**:
  - Browse public events
  - Purchase tickets
  - View their own tickets
  - Update their profile
  - **Note**: Don't need accounts to buy tickets (email-based)

### 4. **Public Users** (Visitors)
- **Role**: Browse events without purchasing
- **Permissions**:
  - View public events
  - Browse event details
  - **No account required**

## Database Cleanup Steps for Production

### Option 1: Clean Slate (Recommended for Fresh Start)
```sql
-- Clear all user data while keeping schema
TRUNCATE TABLE event_analytics CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE tickets CASCADE;
TRUNCATE TABLE ticket_types CASCADE;
TRUNCATE TABLE team_members CASCADE;
TRUNCATE TABLE events CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- Reset sequences if any
-- (UUID-based tables don't need sequence resets)
```

### Option 2: Keep Test Data for Development
- Keep existing data for testing purposes
- Set `events.status` to 'draft' for all test events
- Mark test orders as 'completed' for testing analytics

### Option 3: Selective Cleanup
```sql
-- Remove only test/demo events
DELETE FROM events WHERE title LIKE '%Test%' OR title LIKE '%Demo%';

-- Remove old orders (older than 30 days)
DELETE FROM orders WHERE created_at < NOW() - INTERVAL '30 days';

-- Remove unused profiles
DELETE FROM profiles WHERE id NOT IN (
    SELECT DISTINCT owner_id FROM events
    UNION
    SELECT DISTINCT user_id FROM team_members
);
```

## Production Readiness Checklist

### ✅ Schema Ready
- Core event management tables ✓
- Payment processing support ✓
- Team collaboration features ✓
- Security policies (RLS) ✓
- Performance indexes ✓

### ✅ Features Available
- Event creation and management ✓
- Multiple ticket types ✓
- Payment processing (PayPal, Square, Cash) ✓
- QR code generation ✓
- Team member invitations ✓
- Check-in management ✓
- Analytics and reporting ✓

### 🔄 Next Steps
1. **Clean database** (choose option above)
2. **Test user flows** with fresh data
3. **Verify payment processing** with real gateways
4. **Set up monitoring** for production usage

## User Roles Summary

| User Type | Authentication | Primary Actions | Data Access |
|-----------|---------------|-----------------|-------------|
| **Event Organizers** | Required | Create events, manage sales | Own events + analytics |
| **Team Members** | Required | Assist with events | Assigned events only |
| **Attendees** | Optional | Buy tickets, check-in | Own tickets only |
| **Public** | Not required | Browse events | Public events only |

The database is **production-ready** with a robust multi-user system supporting the full event lifecycle! 🎉