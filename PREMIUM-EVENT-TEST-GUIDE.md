# Premium Event Flow Testing Guide

## 🎯 Test Objective
Verify that the Premium event creation flow works correctly with the new order:
1. Venue selection BEFORE ticket configuration
2. Tickets automatically generated from seating configuration
3. All data properly saved to database

## 📋 Prerequisites
1. Development server running at http://localhost:8080
2. User account created and logged in
3. At least one venue created in Dashboard → Venues (optional)

## 🧪 Test Steps

### Step 1: Start Event Creation
1. Navigate to Dashboard → Create Event
2. Select **"Premium"** as event type
3. Click "Next Step"

### Step 2: Fill Basic Information
1. **Event Title**: "Premium Concert Test"
2. **Description**: "Testing premium event with table seating"
3. **Organization**: "Test Organization"
4. **Venue Name**: "Grand Ballroom"
5. **Date & Time**: Any future date
6. **Address**: "123 Test Street, Test City"
7. **Categories**: Select "Music"
8. Click "Next Step"

### Step 3: Venue Selection (NEW POSITION!)
You should now see the Venue Selection step BEFORE tickets:
- **Option A**: Select existing venue (if available)
- **Option B**: Click "Continue Without Venue" for custom setup
- Click "Next Step"

### Step 4: Seating & Tickets Configuration
This is the new combined step:

#### Tab 1: Venue
1. Upload a venue floor plan image
2. Wait for upload confirmation
3. System auto-advances to Seating tab

#### Tab 2: Seating
1. Click "Configure Categories" to set up seat types:
   - VIP Section: $100
   - Regular Section: $50
   - Accessible Section: $75
2. Use the seating tool to place seats on the venue image
3. For table-service venues:
   - Seats with same `tableId` form a table
   - Tables must be booked as complete units

#### Tab 3: Tickets (Auto-Generated!)
You should see:
- Tickets automatically created from your seating configuration
- One ticket type per category with seats
- Correct quantities matching placed seats
- Note for table-service: "Customers must book entire tables"

#### Tab 4: Review
Summary showing:
- Venue layout ✓
- Total seats placed
- Number of categories
- Generated ticket types
- Table count (if applicable)

### Step 5: Final Review & Save
1. Review all event details
2. Click "Save as Draft" or "Publish Event"
3. Verify success message

## 🔍 Verification Steps

### Check Database (Browser Console)
```javascript
// Paste this in browser console to verify data:
(async () => {
  const { data: { user } } = await window.supabase.auth.getUser();
  
  // Get latest event
  const { data: events } = await window.supabase
    .from('events')
    .select('*')
    .eq('owner_id', user.id)
    .eq('event_type', 'premium')
    .order('created_at', { desc: true })
    .limit(1);
  
  if (events?.[0]) {
    console.log('Latest Premium Event:', {
      id: events[0].id,
      title: events[0].title,
      type: events[0].event_type,
      venue_layout_id: events[0].venue_layout_id,
      status: events[0].status
    });
    
    // Check tickets
    const { data: tickets } = await window.supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', events[0].id);
    
    console.log(`Tickets created: ${tickets?.length || 0}`);
    tickets?.forEach(t => {
      console.log(`- ${t.name}: ${t.quantity} @ $${t.price}`);
    });
  }
})();
```

## ✅ Expected Results

1. **Step Order**: Venue Selection appears BEFORE Ticketing
2. **Ticket Generation**: Tickets created automatically from seats
3. **Database Records**:
   - Event created with `event_type: 'premium'`
   - `venue_layout_id` set (if venue selected)
   - Ticket types match seat categories
   - Quantities match placed seats

## 🐛 Common Issues & Solutions

### Issue: "Cannot read properties of undefined"
**Solution**: Ensure all required fields are filled before proceeding

### Issue: Venue image doesn't upload
**Solution**: Check file size (max 10MB) and format (JPG, PNG, SVG)

### Issue: Tickets not generating
**Solution**: Ensure at least one seat is placed in each category

### Issue: Can't proceed past seating
**Solution**: Must have venue image uploaded AND seats placed

## 📊 Test Data Cleanup
To remove test events:
```javascript
// Delete test events (in browser console)
(async () => {
  const { data: { user } } = await window.supabase.auth.getUser();
  const { error } = await window.supabase
    .from('events')
    .delete()
    .eq('owner_id', user.id)
    .eq('title', 'Premium Concert Test');
  
  console.log(error ? 'Cleanup failed' : 'Test events cleaned up');
})();
```

## 🎉 Success Criteria
- [x] Venue selection happens BEFORE ticket configuration
- [x] Tickets are automatically generated from seating
- [x] Table-service venues show appropriate messaging
- [x] All data properly saved to database
- [x] Flow is intuitive and logical

---

**Note**: The old flow (tickets before venue) has been completely replaced. Event organizers now see their venue before creating tickets, which makes much more sense!