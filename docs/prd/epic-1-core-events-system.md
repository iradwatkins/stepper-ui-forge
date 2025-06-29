# Epic 1.0: Core Events System

**Goal:** Implement the foundational 3-tier events management system (Simple, Ticketed, Premium).

**Key Feature:** A guided, multi-step **Event Creation Wizard** for organizers.

## Epic Overview

This epic establishes the core foundation of the steppers.com platform by implementing a comprehensive 3-tier event management system. The system will support three distinct event types, each with different capabilities and complexity levels.

## Event Tiers

### 1. Simple Events
- Basic event information (title, description, date, location)
- No ticketing required
- Free to attend
- Basic registration/RSVP functionality

### 2. Ticketed Events  
- All Simple Event features
- Paid ticketing system
- Multiple ticket types
- Payment processing integration
- Ticket validation

### 3. Premium Events
- All Ticketed Event features
- Custom seating charts
- Advanced team management
- QR code check-in system
- Detailed analytics and reporting

## Key Components

### Event Creation Wizard
A multi-step guided process that helps organizers create events efficiently:

1. **Event Type Selection** - Choose between Simple, Ticketed, or Premium
2. **Basic Information** - Event details, date, time, location
3. **Ticketing Setup** (if applicable) - Ticket types, pricing, availability
4. **Seating Configuration** (Premium only) - Upload/create seating charts
5. **Team Setup** (Premium only) - Assign team members and roles
6. **Review & Publish** - Final review before making event live

## User Stories (Draft)

### Story 1.1: Event Type Selection
- As an event organizer, I want to choose between Simple, Ticketed, and Premium event types so that I can select the right tier for my event needs.

### Story 1.2: Basic Event Creation
- As an event organizer, I want to create a basic event with essential information so that attendees can discover and learn about my event.

### Story 1.3: Event Wizard Navigation
- As an event organizer, I want to navigate through the event creation wizard with clear progress indicators so that I understand what steps remain.

### Story 1.4: Event Draft & Save
- As an event organizer, I want to save my event as a draft so that I can return to complete it later.

### Story 1.5: Event Publishing
- As an event organizer, I want to publish my completed event so that it becomes visible to potential attendees.

## Technical Requirements

### Database Schema
- `events` table with tier-specific fields
- `event_types` lookup table
- `venues` table for location management
- `organizers` table for event ownership

### API Endpoints
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Retrieve event details  
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/events` - List events with filtering

### Frontend Components
- `EventCreationWizard` - Main wizard container
- `EventTypeSelector` - Tier selection component
- `BasicEventForm` - Core event information form
- `EventPreview` - Preview component for review step
- `ProgressIndicator` - Wizard progress display

## Success Criteria

- [ ] Event organizers can successfully create events of all three tiers
- [ ] Event creation wizard provides clear guidance and validation
- [ ] Events are properly saved and can be retrieved
- [ ] Event data follows the defined schema structure
- [ ] All form validations work correctly
- [ ] Progress is saved between wizard steps

## Dependencies

- Supabase database setup
- Authentication system for organizers
- Basic UI components from shadcn/ui
- Form validation with Zod
- React Hook Form for form management