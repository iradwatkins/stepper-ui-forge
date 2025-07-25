# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Latest Changes - July 25, 2025]

## [Unreleased]

### Changed
- **Reverted TBA Location Feature** - Simplified location handling for events
  - Removed addressTBA checkbox from event creation and editing forms
  - Address field is now always required in forms
  - Google Places autocomplete remains fully functional
  - Frontend automatically displays "To Be Announced" when event location is empty
  - Event organizers can update location at any time through edit event page
  - Files modified:
    - `src/types/event-form.ts` - Removed addressTBA field and validation
    - `src/components/create-event/BasicInformation.tsx` - Removed TBA checkbox UI
    - `src/pages/EditEvent.tsx` - Removed TBA checkbox and related logic
    - `src/pages/CreateEventWizard.tsx` - Removed addressTBA from defaults
    - `src/pages/EventDetail.tsx` - Added "To Be Announced" fallback for empty locations
    - `src/components/meta/EventMeta.tsx` - Updated meta tags to handle empty locations
    - `src/components/create-event/ReviewStep.tsx` - Shows "To Be Announced" for empty locations

### Added
- **Dashboard Navigation Updates** - Improved navigation and access control
  - Removed "Browse Events" from dashboard sidebar (users can access via main menu)
  - Venues link now appears for any user who has created at least one event
  - Enhanced admin dashboard with collapsible sections
  - Sections remember expanded/collapsed state using localStorage
  - Auto-expand all sections when searching
  - Clean arrow indicators (▶ collapsed, ▼ expanded) next to section names
  - Files modified:
    - `src/components/dashboard/DashboardSidebar.tsx` - Removed Browse Events, added collapsible sections

- **Simplified Venue Management Integration** - Streamlined venue selection for premium events
  - Replaced complex inline venue creation with simple venue selection
  - "Manage Venues" button opens venue management page in new tab
  - Refresh button to load newly created venues without page reload
  - Search functionality to quickly find venues
  - Auto-selects venue when editing existing events
  - Files created/modified:
    - `src/components/create-event/VenueSelectionStep.tsx` - Simplified to use existing venue management
    - `src/components/create-event/VenueCustomization.tsx` - Created for future event-specific price overrides
    - Integration leverages existing `/dashboard/venues` functionality

- **React Dropzone Dependency** - Fixed production build issue
  - Added missing react-dropzone package required by ImageUpload component
  - Resolved Vercel deployment failures
  - Files modified:
    - `package.json` - Added react-dropzone dependency
    - `package-lock.json` - Updated with react-dropzone

- **To Be Announced (TBA) Location Feature** - Event organizers can now create events without specifying a location upfront
  - Added "Location To Be Announced" checkbox in event creation form
  - Added same functionality to event editing page
  - Location field becomes optional when TBA is selected
  - Organizers can update from TBA to actual address at any time
  - Files modified:
    - `src/types/event-form.ts` - Added addressTBA field and conditional validation
    - `src/components/create-event/BasicInformation.tsx` - Added TBA checkbox UI
    - `src/pages/CreateEventWizard.tsx` - Added addressTBA to form defaults
    - `src/pages/EditEvent.tsx` - Added TBA functionality for editing events

- **Venue Management Integration for Premium Events** - Fully integrated venue management system with premium ticket purchasing
  - Added venue selection step in event creation wizard for premium events
  - Event organizers can now select from saved venue layouts or create custom ones
  - Premium events can reference pre-configured venue layouts via `venue_layout_id`
  - Customers see the venue management seating chart when purchasing premium tickets
  - Real-time seat availability tracking across events with hold status support
  - Event-specific price overrides while maintaining base venue configuration
  - Files created/modified:
    - `supabase/migrations/20250125_venue_layout_integration.sql` - Added venue_layout_id and seat_overrides to events table
    - `src/components/venue/VenueSelector.tsx` - New component for selecting venue layouts
    - `src/components/create-event/VenueSelectionStep.tsx` - New wizard step for venue selection
    - `src/lib/services/EventVenueService.ts` - New service for handling venue-event relationships
    - `src/hooks/useWizardNavigation.ts` - Added venue-selection step to wizard flow
    - `src/pages/CreateEventWizard.tsx` - Integrated venue selection into event creation
    - `src/pages/EventDetail.tsx` - Updated to use EventVenueService for venue-based events
    - `src/types/database.ts` - Added venue_layout_id and seat_overrides fields
    - `src/types/event-form.ts` - Added venueLayoutId to form schema

### Fixed
- **Early Bird Ticket Pricing** - Fixed early bird tickets not displaying correct prices
  - Database queries were missing `early_bird_price` and `early_bird_until` fields
  - Early bird pricing now displays correctly with badges and savings
  - Time-based pricing automatically switches from early bird to regular price
  - Files modified:
    - `src/lib/events-db.ts` - Updated getEvent(), getPublicEvents(), getAllEvents(), and duplicateEvent() queries
    - `src/pages/CreateEventWizard.tsx` - Fixed ticket creation to save early bird fields

### Changed
- Enhanced event editing capabilities to ensure all fields are fully editable
- Improved form validation for conditional requirements

## [Previous Versions]

### Payment System Integration
- ✅ PayPal Integration - Full checkout flow with order creation and callback handling
- ✅ Cash App Integration - Fixed container detection issues with retry mechanism
- ✅ Square Credit Card - Resolved container timing issues with robust detection utility

### Features
- Interactive Table Seating System for premium events
- Follower-based permission system for team management
- Multi-gateway payment architecture with automatic failover
- PWA capabilities with offline support
- Two-factor authentication with QR codes and backup codes

### Architecture
- Unified Dashboard System with role-based navigation
- Service Layer Pattern for business logic separation
- Component-Driven UI with shadcn/ui components
- Mobile-first responsive design