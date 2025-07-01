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