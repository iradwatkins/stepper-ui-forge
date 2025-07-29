# Event Management System - Complete User Journey Walkthrough

## Table of Contents
1. [System Overview](#system-overview)
2. [User Registration & Authentication](#user-registration--authentication)
3. [Becoming an Event Organizer](#becoming-an-event-organizer)
4. [Event Creation Process](#event-creation-process)
5. [The Follower System](#the-follower-system)
6. [Ticket Purchasing Flow](#ticket-purchasing-flow)
7. [Team Management & Check-ins](#team-management--check-ins)
8. [Commission & Payout System](#commission--payout-system)
9. [Admin Capabilities](#admin-capabilities)
10. [Complete User Journey Example](#complete-user-journey-example)

---

## System Overview

The Steppers Life event management platform is a comprehensive system that allows users to discover, create, and manage events. It uses a unique follower-based permission system where users can follow event organizers and be promoted to sellers or team members.

### Key Features:
- **Event Types**: Simple (free), Ticketed, and Premium (with table seating)
- **Role Hierarchy**: Regular User → Seller → Team Member → Co-Organizer → Admin
- **Payment Gateways**: PayPal, Square (Credit Card), Cash App
- **Commission System**: Referral-based ticket sales with customizable rates
- **PWA Support**: Installable mobile app with offline capabilities

---

## User Registration & Authentication

### Registration Methods

Users can register through three methods:

1. **Email/Password Registration**
   - Minimum 6-character password required
   - Email confirmation required
   - Profile automatically created with default settings

2. **Google OAuth**
   - One-click registration/login
   - Automatically imports Google profile picture and name
   - No email confirmation needed

3. **Magic Link**
   - Passwordless authentication
   - Email sent with one-time login link
   - Automatic account creation on first use

### Authentication Flow

```typescript
// Authentication is handled via AuthContext
const { signIn, signUp, signInWithGoogle, signInWithMagicLink } = useAuth();

// All authenticated users are redirected to /events after login
// Sessions last 7 days by default
```

### Critical Platform Policy
**ALL interactions require authentication:**
- Following/unfollowing organizers
- Liking/sharing events
- Adding items to cart
- Event registration
- Any database interactions

Anonymous users can only browse events in read-only mode.

---

## Becoming an Event Organizer

### How Users Become Organizers

Any registered user can become an event organizer simply by creating their first event. There's no special application or approval process.

```
Regular User → Creates First Event → Automatically Becomes Organizer
```

### Organizer Permissions

Once a user creates an event, they gain:
- Access to "My Events" section in dashboard
- Ability to manage team members
- Follower management capabilities
- Analytics and reporting features
- Commission configuration for sellers

---

## Event Creation Process

### Event Creation Wizard Steps

1. **Event Type Selection**
   - Simple Event (Free, no tickets)
   - Ticketed Event (Multiple ticket tiers)
   - Premium Event (Table seating with amenities)

2. **Basic Information**
   - Title, description, date/time
   - Organization name
   - Event categories
   - Images (banner and postcard)

3. **Venue Selection**
   - Search existing venues
   - Create custom venue
   - Address and capacity

4. **Ticket Configuration** (for Ticketed/Premium events)
   - Multiple ticket tiers
   - Pricing and availability
   - Early bird pricing
   - Sales periods

5. **Premium Seating** (for Premium events only)
   - Interactive seating chart
   - Table categories (VIP, Accessible, Regular)
   - Seat pricing by category
   - Table amenities configuration

6. **Review & Publish**
   - Save as draft or publish immediately
   - Preview event page

### Premium Event Table Seating

Premium events feature an interactive seating system:
- **Table Types**: Round or square tables
- **Categories**: VIP ($100+), Accessible, Regular ($75+)
- **Amenities**: VIP champagne service, wheelchair accessibility
- **Visual Selection**: Canvas-based seat selection with zoom/pan
- **Hold System**: 15-minute seat holds during checkout

---

## The Follower System

### Following Organizers

Users can follow event organizers to:
- Get notifications about new events
- Access exclusive pre-sales
- Build relationships with favorite organizers

### Follower Promotions

Organizers can promote followers to different roles:

#### 1. **Ticket Sellers**
- Can sell tickets using referral codes
- Earn commission on sales (percentage or fixed)
- Limited to one event at a time
- Commission rates: 0-50% or fixed amount per ticket

#### 2. **Team Members**
- Can check in attendees at events
- Access to event analytics
- Help manage event operations
- Can be assigned to multiple events

#### 3. **Co-Organizers**
- Full event management permissions
- Can edit event details
- Manage other team members
- Access financial reports

### Promotion Process

```typescript
// Follower Service handles promotions
FollowerService.promoteFollower(
  organizerId,
  followerId,
  {
    can_sell_tickets: true,
    commission_rate: 0.15, // 15% commission
    commission_type: 'percentage'
  }
);
```

---

## Ticket Purchasing Flow

### Shopping Cart System

1. **Adding to Cart**
   - Select ticket type and quantity
   - Cart persists in localStorage
   - Multi-event cart support

2. **Checkout Process**
   - Authentication required
   - Billing information collection
   - Payment method selection

### Payment Gateway Integration

#### **PayPal** (Primary)
- Order creation with items
- Redirect to PayPal approval
- Callback handling for completion

#### **Square Credit Card**
- Embedded card form
- Real-time validation
- PCI-compliant tokenization

#### **Cash App**
- QR code or redirect flow
- Mobile-optimized
- Instant payment confirmation

### Order Completion

After successful payment:
1. Tickets generated with QR codes
2. Email confirmation sent
3. Tickets available in user dashboard
4. Commission recorded for referral sales

---

## Team Management & Check-ins

### Team Member Assignment

Organizers can assign team members through:
1. Dashboard → Team Management
2. Select followers to promote
3. Assign specific event permissions
4. Set check-in capabilities

### Check-in Process

#### For Team Members:
1. **Mobile QR Scanner**
   - PWA-based scanner
   - Real-time validation
   - Offline capability with sync

2. **Check-in Dashboard**
   - View attendee list
   - Manual check-in option
   - Real-time statistics

3. **Validation Process**
   ```typescript
   // QR code contains encrypted ticket data
   QRValidationService.validateTicket(qrData)
   // Returns: valid/invalid/already-used
   ```

### Check-in Statistics

Real-time monitoring includes:
- Active staff count
- Total check-ins
- Check-in percentage
- Duplicate attempt tracking
- Recent activity log

---

## Commission & Payout System

### Commission Structure

#### For Ticket Sellers:
- **Percentage-based**: 0-50% of ticket price
- **Fixed amount**: Set dollar amount per ticket
- **Hybrid**: Combination of both

### Commission Tracking

```typescript
// Commission automatically calculated on sale
CommissionService.createCommissionEarning({
  referralCodeId,
  orderId,
  saleAmount,
  commissionRate: 0.20, // 20%
  ticketQuantity: 2
});
```

### Earnings Dashboard

Sellers can view:
- Total earnings
- Pending vs. confirmed amounts
- Sales performance by event
- Referral code analytics
- Conversion rates

### Payout Process

1. **Request Payout**
   - Minimum $25 threshold
   - Select payout method
   - Submit request

2. **Payout Methods**
   - Zelle
   - Cash App
   - Venmo
   - PayPal
   - Check
   - Cash (in-person)

3. **Processing**
   - Organizer reviews and approves
   - 2-3 business day processing
   - Email confirmation sent

---

## Admin Capabilities

### Admin Dashboard Access

Admins have platform-wide control through dedicated admin panels:

### Content Management
- **Magazine Articles**: Create, edit, publish content
- **Event Oversight**: Monitor all platform events
- **Category Management**: Organize content taxonomy

### User Management
- **Role Assignment**: Promote users to various roles
- **Account Management**: Enable/disable accounts
- **Permission Control**: Fine-grained access control

### System Administration
- **Payment Configuration**: Gateway settings and fees
- **Analytics Dashboard**: Platform-wide metrics
- **Database Access**: Direct query capabilities
- **System Monitoring**: Performance and health checks

### Financial Management
- **Commission Oversight**: Review all platform commissions
- **Payout Management**: Process seller payouts
- **Revenue Reports**: Platform earnings analytics

---

## Complete User Journey Example

### Sarah's Journey: From Attendee to Organizer

1. **Registration**
   - Sarah signs up using Google OAuth
   - Profile automatically created with Google photo

2. **Event Discovery**
   - Browses events in her area
   - Follows "Metro Dance Collective" organizer
   - Purchases VIP table seats for a gala

3. **Becoming a Seller**
   - Metro Dance promotes Sarah to ticket seller
   - She receives 25% commission rate
   - Shares her referral link on social media

4. **First Sales**
   - Friends use her link to buy tickets
   - Earns $150 in commissions
   - Requests payout via Cash App

5. **Creating Her Own Event**
   - Inspired, Sarah creates her own dance workshop
   - Chooses ticketed event with 3 tiers
   - Publishes and shares with followers

6. **Building Her Team**
   - Promotes two followers as sellers (20% commission)
   - Assigns friend as team member for check-ins
   - Event sells out - 200 tickets

7. **Event Day**
   - Team member uses mobile app for check-ins
   - Real-time dashboard shows 95% attendance
   - Post-event analytics available immediately

8. **Growth**
   - Sarah now has 500 followers
   - Running monthly events
   - Promoted to platform featured organizer

---

## Technical Implementation Notes

### Authentication State Management
```typescript
// All authenticated actions wrapped in AuthContext
const { user, loading } = useAuth();

// Anonymous users see login prompt
if (!user) {
  return <LoginDialog />;
}
```

### Permission Checking
```typescript
// Hook-based permission system
const { isSeller, isTeamMember, isOrganizer } = useUserPermissions();

// Component-level gating
<PermissionGate permission="can_sell_tickets">
  <SellerDashboard />
</PermissionGate>
```

### Real-time Updates
- Follower counts update via Supabase subscriptions
- Check-in statistics refresh every 30 seconds
- Commission tracking immediate on sale

### Mobile Optimization
- PWA installable on all devices
- Offline ticket storage
- Touch-optimized interfaces
- Responsive design throughout

---

This walkthrough represents the complete user journey through the Steppers Life event management platform, from initial registration to becoming a successful event organizer with a team of sellers and staff.