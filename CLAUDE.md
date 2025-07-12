# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev           # Start development server on localhost:8080
npm run build         # Production build
npm run build:dev     # Development build 
npm run lint          # ESLint code checking
npm run preview       # Preview production build
npm run test          # Run Jest tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Troubleshooting

**Page Not Loading (ERR_CONNECTION_REFUSED)**:
- Check if development server is running with `npm run dev`
- Ensure `.env` file exists with proper Supabase configuration:
  ```
  VITE_SUPABASE_URL=your_supabase_url
  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
  ```
- Copy `.env.example` to `.env` and update with actual values if missing

## Architecture Overview

This is a **React/TypeScript event management platform** with Supabase backend, built using modern patterns:

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + PWA
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **UI**: Radix UI + shadcn/ui + Tailwind CSS
- **Payments**: PayPal, Square, Cash App integration
- **State**: React Context + TanStack Query

### Key Architectural Patterns

**Unified Dashboard System**: Single dashboard at `/dashboard` with role-based navigation that adapts based on user permissions (regular user → seller → team member → organizer → admin).

**Follower-Based Permission System**: Users follow organizers and can be promoted to sellers/team members. This creates a scalable team management system where:
- Regular users can follow organizers
- Organizers can promote followers to sellers (with commission rates)  
- Team members get event management permissions
- Admins get platform-wide access

**Service Layer Pattern**: Business logic separated into services:
- `ProfileService` - User profile management
- `EventService` - Event CRUD operations  
- `TicketService` - Ticket purchasing/management
- `PaymentService` - Multi-gateway payment processing
- `FollowerService` - Permission management system

**Component-Driven UI**: shadcn/ui components with consistent design system, mobile-first responsive design.

### Authentication Flow

**Multi-method auth** via Supabase:
- Email/password signin/signup
- Google OAuth (automatically uses Google profile pictures)
- Magic link authentication

**Route Protection**:
- `ProtectedRoute` - Requires authentication
- `AdminRoute` - Requires admin permissions
- Dynamic navigation based on user roles

### Database Architecture

**Core Tables**:
- `profiles` - Extended user data with permissions
- `events` - Event management with team collaboration
- `ticket_types` - Multiple ticket tiers per event
- `user_follows` - Follower relationships for permissions
- `team_members` - Event-specific team permissions
- `referral_codes` - Commission-based selling system

**Permission Hierarchy**: `regular_user` → `seller` → `team_member` → `co_organizer` → `admin`

### Payment System

**Multi-gateway architecture** with failover:
- PayPal integration with client tokens
- Square payment processing  
- Cash App payments
- Commission tracking for referral sales

### Dashboard Navigation Structure

**Mobile-First Design**: 
- Collapsible sidebar with mobile overlay
- User dropdown in header contains Dashboard and My Tickets (moved from sidebar)
- Role-based navigation items that appear as users gain permissions

**Navigation Hierarchy**:
- Profile (all users)
- Browse Events, Following (regular users)
- Sales Dashboard, Referral Codes, Earnings (sellers)  
- Event Assignments, Check-In Tools (team members)
- My Events, Analytics, Team Management (organizers)
- Admin Panel (admins only)

### State Management

**Context Providers**:
- `AuthContext` - Session management with Supabase
- `CartContext` - Shopping cart with localStorage persistence  
- `ThemeProvider` - Dark/light mode support

**Custom Hooks**:
- `useUserPermissions()` - Role-based permission checking
- `useAdminPermissions()` - Admin access verification
- Permission hooks return booleans for conditional rendering

### Development Patterns

**File Structure**:
- `src/pages/` - Route components
- `src/components/ui/` - shadcn/ui base components
- `src/components/dashboard/` - Dashboard-specific components
- `src/lib/` - Services, utilities, hooks
- `src/contexts/` - React context providers
- `src/types/` - TypeScript type definitions

**Component Patterns**:
- Use shadcn/ui components as building blocks
- Implement proper loading states and error handling
- Mobile-first responsive design with Tailwind breakpoints
- Consistent icon usage from Lucide React

**Data Fetching**: Use TanStack Query for server state, React Context for global state, component state for local UI state.

**Testing**: Jest configured for unit tests, focus on business logic and component behavior.

## Important Implementation Notes

**Avatar Handling**: Google OAuth users automatically get their Google profile pictures. Upload functionality falls back to localStorage when Supabase storage unavailable.

**Two-Factor Authentication**: Full 2FA implementation with QR codes, backup codes, and TOTP verification.

**PWA Features**: Configured for offline functionality, installable as app, background sync capabilities.

**Error Handling**: Graceful fallbacks for Supabase unavailability, comprehensive error states with user-friendly messages.

**Responsive Design**: Mobile-first with touch-friendly interactions, proper keyboard navigation for accessibility.

## localhost Connection Issues Troubleshooting

When encountering "localhost refused to connect" errors:

### 1. **Start the server properly**:
```bash
# Kill any existing processes first
pkill -f vite
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Start the dev server
npm run dev
```

### 2. **If localhost doesn't work, use 127.0.0.1**:
- Try: http://127.0.0.1:8080 instead of http://localhost:8080
- The server might bind to 127.0.0.1 specifically

### 3. **Verify server is running**:
```bash
# Check if vite process exists
ps aux | grep vite | grep -v grep

# Test if server responds
curl http://127.0.0.1:8080 2>&1 | head -20
```

### 4. **Alternative start methods if npm run dev fails**:
```bash
# Direct vite command with explicit host
npx vite --port 8080 --host 127.0.0.1

# Or with 0.0.0.0 to bind all interfaces
npx vite --port 8080 --host 0.0.0.0

# Background process
node_modules/.bin/vite --port 8080 --host 127.0.0.1 &
```

### 5. **Browser-specific issues**:
- Clear browser cache (Cmd+Shift+R)
- Try incognito/private mode
- Disable browser extensions
- Check proxy settings
- Try different browsers

### 6. **System-level checks**:
```bash
# Check hosts file
cat /etc/hosts | grep localhost
# Should show: 127.0.0.1 localhost

# Clear DNS cache (Mac)
sudo dscacheutil -flushcache
```

### 7. **Port conflicts**:
```bash
# Check what's using port 8080
lsof -i :8080

# Kill specific process by PID
kill -9 <PID>
```

**NOTE**: The development server uses port 8080 (not the default Vite port 5173) as configured in package.json to maintain consistency.

## Interactive Table Seating System

### Overview
The platform includes a comprehensive event hall table seating system for premium events, allowing attendees to reserve specific seats at dining tables.

### Key Components
- `InteractiveSeatingChart` - Canvas-based table and chair selection with zoom/pan
- `SeatingLayoutManager` - Organizer tool for creating table layouts
- `CustomerSeatingChart` - Customer-facing table reservation interface
- `SeatingService` - Backend integration for table and seat management

### Features
- Visual table and chair selection with real-time availability
- 15-minute hold timers for selected seats
- Multiple table categories with pricing (VIP, Accessible, Regular)
- Wheelchair accessibility support
- Table-based seating with amenities (VIP champagne service, etc.)
- Touch support for mobile devices
- Revenue analytics by table type

### Testing Interactive Table Seating
1. Visit `/test-seating` to create a demo event
2. For new events, select "Premium" type to enable table seating
3. Demo includes 6 tables (24 seats) across 3 pricing tiers:
   - 1 VIP table with 4 seats ($100/seat)
   - 2 accessible tables with 2 seats each ($100/seat)
   - 4 regular tables with 4 seats each ($75/seat)