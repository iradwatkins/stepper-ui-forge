# Testing Guide for Table Seating & Follower System

## Prerequisites
- Development server running at http://localhost:8080
- Access to Supabase database

## Part 1: Testing Table Seating System

### A. Organizer Side - Creating Tables

1. **Navigate to Test Page**
   - Go to http://localhost:8080/test-seating
   - This creates a demo event with premium seating

2. **Create Individual Seats First**
   - Click "Place Seats" tab
   - Select a ticket category (e.g., VIP)
   - Use "Seat" tool to place individual seats on the venue image
   - Place at least 4-8 seats in close proximity

3. **Group Seats into Tables**
   - Click "Group" tool button
   - Click and drag to select multiple seats (you'll see a blue selection rectangle)
   - Selected seats will be highlighted in yellow/orange
   - Click "Create Table (X seats)" button
   - The seats will now be grouped as a table with a white circle drawn around them

4. **Create Multiple Tables**
   - Repeat the process to create tables of different sizes
   - Try creating tables with 4, 6, and 8 seats
   - Mix different ticket categories if desired

### B. Customer Side - Purchasing Tables

1. **View as Customer**
   - Navigate to the event page
   - Look for the seating chart

2. **Test Selection Modes**
   - Find "Selection Mode" dropdown in View Controls
   - **Individual Mode**: Click seats one by one
   - **Table Mode**: Click any seat in a table to select the entire table

3. **Visual Feedback**
   - In table mode, hovering over any seat should highlight the entire table
   - Selected tables should show all seats in blue
   - Price should reflect total for all seats in the table

## Part 2: Testing Follower/Employee System

### A. Database Setup

1. **Run Check Script First**
   ```sql
   -- Run scripts/check_users.sql to see existing users
   ```

2. **Create Test Relationships**
   ```sql
   -- Run scripts/create_test_followers.sql
   -- This automatically creates:
   -- - 3 followers for an organizer
   -- - 1 seller with 15% commission
   -- - 1 team member
   -- - 1 seller + team member with $25 fixed commission
   ```

### B. UI Testing

1. **Login as Organizer**
   - Find organizer email from check_users.sql results
   - Login to the platform
   - Navigate to Dashboard

2. **Check Follower Management**
   - Go to Dashboard → Followers
   - Verify you see:
     - Follower names and emails (email field now fixed!)
     - Permission badges (Seller/Team/Co-Organizer)
     - Commission rates displayed correctly

3. **Test Permission Updates**
   - Click on a follower
   - Try updating their permissions:
     - Toggle "Can sell tickets"
     - Toggle "Can work events"
     - Change commission rate/type
   - Save and verify changes persist

4. **Login as Follower**
   - Logout and login as one of the followers
   - Check Dashboard based on permissions:
     - **Sellers**: Should see "Sales Dashboard", "Referral Codes", "Earnings"
     - **Team Members**: Should see "Event Assignments", "Check-In Tools"
     - **Both**: Should see both sets of options

### C. End-to-End Test Flow

1. **Create Event as Organizer**
   ```
   - Login as organizer
   - Create a premium event with table seating
   - Use the Group tool to create several tables
   ```

2. **Assign Seller to Event**
   ```
   - Go to Team Management
   - Find your seller (follower with can_sell_tickets = true)
   - Assign them to your event
   ```

3. **Test Sales Flow**
   ```
   - Login as the seller
   - Go to their Sales Dashboard
   - Get their referral code
   - Share event with referral code
   - Purchase tickets using their link
   - Verify commission tracking
   ```

4. **Test Team Member Flow**
   ```
   - Login as team member
   - Go to Event Assignments
   - See assigned events
   - Access Check-In Tools
   - Test QR code scanning (if available)
   ```

## Part 3: Verification Checklist

### Table Seating
- [ ] Can create individual seats
- [ ] Can select multiple seats with Group tool
- [ ] Can create tables from selected seats
- [ ] Tables show visual circle/indicator
- [ ] Customer can toggle between individual/table selection
- [ ] Table selection selects all seats at once
- [ ] Pricing reflects total for entire table

### Follower Display
- [ ] Follower emails display correctly
- [ ] Permission badges show appropriately
- [ ] Commission rates display (percentage or fixed)
- [ ] Can update follower permissions
- [ ] Dashboard navigation changes based on permissions

### Integration
- [ ] Sellers can sell table tickets
- [ ] Commission calculated correctly for table sales
- [ ] Team members can check in table guests
- [ ] Event analytics show table vs individual sales

## Troubleshooting

### If follower emails don't show:
- Check browser console for errors
- Verify FollowerService.ts line 289 includes `email` in select
- Hard refresh the page (Cmd+Shift+R)

### If table grouping doesn't work:
- Ensure seats are placed before trying to group
- Check console for JavaScript errors
- Verify PremiumSeatingManager has the Group tool updates

### If selection mode toggle doesn't appear:
- Ensure event has seats with tableId set
- Check CustomerSeatingChart for selectionMode state
- Verify UI updates around line 760-779

## SQL Helper Queries

```sql
-- Check follower relationships
SELECT * FROM user_follows 
JOIN profiles ON profiles.id = user_follows.follower_id
ORDER BY created_at DESC;

-- Check permissions
SELECT * FROM follower_promotions
JOIN profiles ON profiles.id = follower_promotions.follower_id;

-- Check table seats
SELECT * FROM seats 
WHERE table_id IS NOT NULL
ORDER BY table_id, seat_number;
```