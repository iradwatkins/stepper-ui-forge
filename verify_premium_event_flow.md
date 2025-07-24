# Premium Event Venue Management Flow Verification

## How Premium Events Work with Venue Management

### 1. Event Type Selection
- User selects **"Premium"** event type in the wizard
- This activates additional steps for venue configuration

### 2. Basic Information
- Event title, description, date, time
- Organization name
- **Venue name** (separate field from address)
- Categories selection

### 3. Ticketing Configuration
- Create ticket types with names and prices
- These will automatically map to seating sections
- Each ticket type gets a color assigned

### 4. Venue Selection (Premium Only)
User has two options:

#### Option A: Use Existing Venue Layout
- Select from saved venue layouts
- Pre-configured seats and pricing load automatically
- Can customize prices for this specific event
- Venue layout ID is saved with the event

#### Option B: Create Custom Layout
- Upload venue floor plan image
- Manually place seats on the image
- Configure pricing categories
- Set up sections and amenities

### 5. Seating Configuration
- If existing venue: Review and customize seat pricing
- If custom: Place seats and assign to ticket types
- Seat categories are created from ticket types
- Each seat is assigned to a ticket type/category

### 6. Review & Publish
- Review all settings including venue configuration
- Publish event with complete seating chart

## Database Requirements

The following columns must exist in the `events` table:

1. **venue_name** (VARCHAR 255) - The venue's display name
2. **venue_layout_id** (UUID) - Reference to saved venue layout
3. **seat_overrides** (JSONB) - Event-specific pricing adjustments

## Testing the Flow

1. Navigate to "Create Event"
2. Select "Premium Dining Experience"
3. Fill in basic information
4. Create 2-3 ticket types (e.g., VIP Table, Regular Table)
5. On venue selection:
   - If you have saved venues: Select one
   - If not: Choose "Create Custom Layout"
6. Configure seating with your ticket types
7. Complete and publish the event

## Key Integration Points

1. **EventVenueService** - Loads venue data for events
2. **VenueSelectionStep** - Handles venue choice UI
3. **SeatingChartWizard** - Manages seat configuration
4. **CustomerSeatingChart** - Display seats to customers

## Troubleshooting

If events aren't showing:
1. Check browser console for errors
2. Verify database columns exist (run check_and_fix_venue_columns.sql)
3. Ensure EventVenueService import path is correct
4. Check that FollowerService errors are handled

The venue management system is fully integrated - it just needs the database to have the proper columns!