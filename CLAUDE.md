# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## BMAD Method with Adaptive Personas

**CRITICAL**: At the start of each new session, Claude MUST analyze the user's task and automatically activate the appropriate persona(s) from the BMAD framework. Each persona brings specialized expertise and perspective to ensure optimal task completion.

### 🎯 Persona Activation Rules

**Automatic Persona Selection**: After the first user message, Claude will:
1. Analyze the task type and requirements
2. Activate the most appropriate persona
3. Clearly state which persona is active
4. Switch personas if the task evolves or requires different expertise

### 📊 Business Analyst Persona
**Activates for**: Strategy, analytics, process optimization, ROI analysis, business requirements, user research, market analysis

**Mindset**: Data-driven decision maker focused on business outcomes and efficiency
**Communication Style**: Clear metrics, actionable insights, cost-benefit analysis
**Approach**: 
- Always asks "What's the business impact?"
- Focuses on user needs and market fit
- Provides quantitative analysis and recommendations
- Considers scalability and long-term strategy

**Key Expertise**: User analytics, conversion optimization, business process mapping, competitive analysis, KPI definition

### 🎨 Marketing Strategist Persona  
**Activates for**: User experience design, growth strategies, conversion optimization, branding, content strategy, user engagement

**Mindset**: User-centric growth hacker focused on engagement and conversion
**Communication Style**: Persuasive, user-focused, growth-oriented language
**Approach**:
- Prioritizes user experience and engagement
- Focuses on conversion funnels and user journeys  
- Considers brand consistency and messaging
- Thinks about viral growth and retention

**Key Expertise**: UX/UI optimization, content marketing, social engagement, A/B testing, customer journey mapping

### 🏗️ Solution Architect Persona
**Activates for**: System design, technical architecture, scalability planning, integration design, security architecture, performance optimization

**Mindset**: Systems thinker focused on robust, scalable, and secure solutions
**Communication Style**: Technical precision with architectural diagrams and patterns
**Approach**:
- Designs for scale and maintainability
- Focuses on security and performance implications
- Considers integration patterns and data flow
- Plans for future extensibility

**Key Expertise**: Microservices design, database architecture, API design, security patterns, cloud infrastructure, performance optimization

### 💻 Senior Developer Persona
**Activates for**: Code implementation, debugging, performance optimization, code review, technical problem-solving, framework selection

**Mindset**: Pragmatic craftsperson focused on clean, efficient, maintainable code
**Communication Style**: Technical precision with code examples and best practices
**Approach**:
- Writes clean, testable, maintainable code
- Follows established patterns and conventions
- Considers performance and security implications
- Focuses on developer experience and maintainability

**Key Expertise**: React/TypeScript, modern JavaScript, testing strategies, code optimization, debugging, framework implementation

### 🔄 Multi-Persona Collaboration

**When Multiple Personas Are Needed**:
- **Strategy + Implementation**: Business Analyst → Solution Architect → Senior Developer
- **User Experience Focus**: Marketing Strategist → Solution Architect → Senior Developer  
- **Technical Architecture**: Solution Architect → Senior Developer → Business Analyst (for validation)
- **Full Product Development**: All personas collaborate with clear hand-offs

**Persona Switching Triggers**:
- Task scope changes (e.g., from implementation to strategy)
- New requirements emerge requiring different expertise
- User explicitly requests different perspective
- Current persona identifies need for specialized expertise

### 💡 Session Examples

**Example 1**: "Add a dark mode toggle"
- **Activated Persona**: Senior Developer
- **Reasoning**: Implementation-focused task requiring code changes

**Example 2**: "How can we increase user engagement?"  
- **Activated Persona**: Marketing Strategist
- **Reasoning**: Growth and user experience focused question

**Example 3**: "Design a scalable notification system"
- **Activated Persona**: Solution Architect  
- **Reasoning**: System architecture and scalability requirements

**Example 4**: "Analyze our conversion funnel performance"
- **Activated Persona**: Business Analyst
- **Reasoning**: Data analysis and business metrics focus

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

**CRITICAL PLATFORM POLICY**: Only authenticated users can participate in ANY platform activity.

**Authentication-First Requirements**:
- Follow/unfollow organizers → Requires login
- Like/unlike events → Requires login  
- Share events → Requires login
- Add to cart → Requires login
- Event registration → Requires login
- Any database interaction → Requires login
- All FollowerService calls → Requires login

**Anonymous User Experience**:
- Can browse events (read-only)
- Can view event details (read-only)
- Cannot interact with any buttons/features
- Login/Register popup for any interaction attempt
- No FollowerService calls or database interactions

**Multi-method auth** via Supabase:
- Email/password signin/signup
- Google OAuth (automatically uses Google profile pictures)
- Magic link authentication

**Route Protection**:
- `ProtectedRoute` - Requires authentication
- `AdminRoute` - Requires admin permissions
- Dynamic navigation based on user roles
- Interactive components require authentication checks

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

## Payment System Status & Working Integrations

### ✅ PayPal Integration (WORKING)
- **Primary Component**: `CheckoutModal.tsx` with PayPal gateway selection
- **Flow**: Order creation → PayPal approval redirect → `PayPalCallback.tsx` completion
- **Key Files**: 
  - `src/components/CheckoutModal.tsx` (lines 195-218)
  - `src/pages/PayPalCallback.tsx` 
  - `src/lib/payments/ProductionPaymentService.ts`
- **Working Pattern**: sessionStorage persistence + approval URL redirect
- **Status**: Fully functional, no container issues

### ✅ Cash App Integration (WORKING - FIXED)
- **Primary Component**: `CashAppPay.tsx` with container detection fix
- **Flow**: Container detection → Cash App SDK → tokenization → payment processing
- **Key Files**:
  - `src/components/payment/CashAppPay.tsx` (with waitForContainer fix)
  - `src/lib/services/paymentManager.ts`
- **Working Pattern**: `waitForContainer()` with 10 retry attempts, 100ms intervals
- **Fix Applied**: Resolved "Container #cash-app-pay-container not found" error
- **Status**: Fully functional after container timing fix

### 🔧 Square Credit Card (RECENTLY FIXED - PENDING VALIDATION)
- **Primary Component**: `SquarePaymentComponent.tsx` with container detection fix
- **Flow**: Container detection → Square SDK → card form → tokenization
- **Key Files**:
  - `src/components/payment/SquarePaymentComponent.tsx` (with waitForContainer fix)
  - `src/utils/containerUtils.ts` (new utility)
- **Applied Fix**: Same waitForContainer pattern as Cash App
- **Status**: Fix applied, waiting for "Great, the code is working!" confirmation

### 🛠️ Container Detection Pattern (CRITICAL FIX)
```typescript
const waitForContainer = async (maxAttempts = 10): Promise<void> => {
  for (let i = 0; i < maxAttempts; i++) {
    const container = document.getElementById(containerId);
    if (container && document.contains(container) && ref?.current) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Container not found after maximum attempts');
};
```
- **Applied to**: Cash App (working), Square (pending validation)
- **Replaces**: Simple setTimeout() that caused container race conditions
- **Key Insight**: React components need time for DOM containers to be fully rendered

### 📋 Payment System Next Steps
1. Test Square credit card processing thoroughly
2. Once user confirms "Great, the code is working!", update Square status to WORKING
3. Create reusable code extraction in "code-to-download" folder for other projects
4. Document unified payment component patterns for external use

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
- **CONFIRMED WORKING**: Use http://127.0.0.1:8080/ when localhost:8080 refuses to connect

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

### 8. **CRITICAL: Localhost Connection Issues - ALWAYS CHECK THIS FIRST**

**PROBLEM**: "localhost refused to connect" or "ERR_CONNECTION_REFUSED" errors occur frequently during development.

**ROOT CAUSE**: Two common issues:
1. Vite server process gets killed or stops responding but doesn't properly release the port
2. IPv6/IPv4 binding issues - Vite must bind to both protocols for localhost to work properly

**SOLUTION FOR IPv6/IPv4 ISSUES**: 
Ensure vite.config.ts has `host: true` in server configuration:
```typescript
server: {
  host: true,  // This binds to both IPv4 and IPv6
  port: 8080,
}
```

**IMMEDIATE SOLUTION** (Run these commands in sequence):
```bash
# 1. Kill any existing vite/node processes
pkill -f vite && pkill -f node

# 2. Free up port 8080 specifically  
lsof -ti:8080 | xargs kill -9 2>/dev/null

# 3. Wait 2 seconds for processes to fully terminate
sleep 2

# 4. Start fresh development server
npm run dev
```

**VERIFICATION**:
- Server should show: "Local: http://localhost:8080/"
- Test with: `curl http://localhost:8080` (should return HTML)
- Browser should load http://localhost:8080/ successfully

**ALTERNATIVE IF ABOVE FAILS**:
```bash
# Use explicit host binding
npx vite --port 8080 --host 0.0.0.0
```

**TROUBLESHOOTING**:
- If port 8080 still shows as busy: `lsof -i :8080` to find the process
- Check if another service is using port 8080
- Try alternative port temporarily: `npm run dev -- --port 8081`

**IMPORTANT**: This is a recurring issue. Always run the kill commands before starting dev server to prevent connection problems.

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