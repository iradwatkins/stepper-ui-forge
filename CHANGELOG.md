# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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