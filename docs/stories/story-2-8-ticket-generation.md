
# Story 2.8: Ticket Generation & QR Codes

## Status: Draft

## Story

- As a customer who completes a ticket purchase
- I want to receive digital tickets with QR codes immediately after payment
- so that I have proof of purchase and can access the event with scannable tickets

## Acceptance Criteria (ACs)

1. Order creation after successful payment creates persistent order and order_items records
2. Ticket generation creates individual ticket records with unique QR codes for each purchased ticket
3. QR codes contain comprehensive event and ticket validation data 
4. Email notification system sends ticket confirmation emails with ticket attachments/links
5. Ticket display interface allows customers to view and manage their purchased tickets
6. QR code validation system supports event check-in workflows
7. Ticket generation integrates seamlessly with existing payment completion flow

## Tasks / Subtasks

- [ ] Task 1: Implement Order Creation Service (AC: 1)
  - [ ] Create OrderService.ts for order persistence after payment
  - [ ] Integrate order creation into payment completion flow
  - [ ] Handle cart-to-order conversion with proper line items
  - [ ] Add order status tracking and error handling
- [ ] Task 2: Build Ticket Generation Service (AC: 2)
  - [ ] Create TicketService.ts for individual ticket creation
  - [ ] Implement ticket generation logic after order creation
  - [ ] Connect to existing QR code database trigger
  - [ ] Add ticket holder information from checkout form
- [ ] Task 3: Enhance QR Code Generation (AC: 3)
  - [ ] Upgrade QR code content to include event, ticket, and validation data
  - [ ] Implement secure QR code format with tamper resistance
  - [ ] Add QR code image generation and storage
  - [ ] Create QR code validation utilities
- [ ] Task 4: Implement Email Notification System (AC: 4)
  - [ ] Set up email service integration (Supabase Edge Functions or external service)
  - [ ] Create ticket confirmation email templates
  - [ ] Implement email delivery after ticket generation
  - [ ] Add email failure handling and retry logic
- [ ] Task 5: Build Ticket Display Interface (AC: 5)
  - [ ] Create TicketView component for individual ticket display
  - [ ] Build MyTickets page for customer ticket management
  - [ ] Add ticket download/print functionality
  - [ ] Implement ticket transfer capabilities (stretch goal)
- [ ] Task 6: QR Code Validation Foundation (AC: 6)
  - [ ] Create QR code scanning utilities for event check-in
  - [ ] Build ticket validation API endpoints
  - [ ] Add ticket status management (active, used, cancelled)
  - [ ] Implement security measures for QR validation
- [ ] Task 7: Integration and Testing (AC: 7)
  - [ ] Integrate ticket generation into CheckoutModal payment completion
  - [ ] Update cart clearing logic to occur after ticket generation
  - [ ] Add error handling for ticket generation failures
  - [ ] Test complete flow from cart to ticket delivery

## Dev Notes

### Story Context

**Existing System Integration:**
- Integrates with: Payment System (Stories 2.4-2.7), Shopping Cart (Story 2.3), User Authentication
- Technology: TypeScript, Supabase (PostgreSQL, Edge Functions), QR code libraries
- Database: Complete schema already exists in `/supabase/schema.sql`
- Libraries: `qrcode` and `qr-scanner` already installed in package.json

**Current State Analysis:**
- Database schema is complete with `orders`, `order_items`, `tickets`, and QR generation triggers
- Payment gateways successfully process payments but don't persist orders
- CheckoutModal shows success but only clears cart - no ticket generation
- Email infrastructure exists in user profiles but no email service implemented
- QR code generation exists but is basic (`QR_` + ticket ID)

**Relevant Source Tree:**
- `/src/components/CheckoutModal.tsx` - Main integration point for post-payment ticket generation
- `/src/lib/payments/PaymentService.ts` - Payment completion hooks
- `/src/contexts/CartContext.tsx` - Cart data for order conversion
- `/supabase/schema.sql` - Complete database schema already implemented
- `/src/integrations/supabase/` - Database client and types

**Key Technical Requirements:**
- Order persistence after payment success using existing database schema
- Enhanced QR code generation with comprehensive event/ticket data
- Email service setup (Supabase Edge Functions or external service integration)
- Ticket display components with download/print capabilities
- QR validation API for future check-in system integration
- Seamless integration with existing payment completion flow
- Error handling for ticket generation failures with user feedback

### Integration Points

**Payment Completion Flow Enhancement:**
```typescript
// Current: CheckoutModal.tsx
Payment Success → Clear Cart → Show Toast → Close Modal

// Required: Enhanced with ticket generation
Payment Success → Create Order → Generate Tickets → Send Email → Clear Cart → Show Success with Tickets
```

**Database Operations:**
1. Create `orders` record with payment details and user information
2. Create `order_items` records for each cart item
3. Create individual `tickets` records (one per ticket quantity)
4. Trigger automatic QR code generation via existing database trigger
5. Update order status to 'completed' after ticket generation

**QR Code Content Structure:**
```json
{
  "ticketId": "uuid",
  "eventId": "uuid", 
  "orderId": "uuid",
  "holderName": "string",
  "ticketType": "string",
  "eventDate": "ISO string",
  "venue": "string",
  "validationHash": "secure hash for tamper detection"
}
```

### Testing

Dev Note: Story Requires the following tests:

- [ ] Jest Unit Tests: OrderService, TicketService, QR code generation, email utilities
- [ ] Jest Integration Tests: Complete payment-to-ticket flow, database operations
- [ ] Cypress E2E Tests: Full user journey from cart checkout to ticket email receipt

Manual Test Steps:
- Complete ticket purchase through CheckoutModal with real payment
- Verify order and tickets created in database with correct QR codes
- Confirm email delivery with ticket attachments/links
- Test ticket display in user interface
- Validate QR codes contain proper event and ticket information
- Test error scenarios (payment success but ticket generation failure)

## Dev Agent Record

### Agent Model Used: {{Agent Model Name/Version}}

### Debug Log References

[[LLM: (Dev Agent) If the debug is logged to during the current story progress, create a table with the debug log and the specific task section in the debug log - do not repeat all the details in the story]]

### Completion Notes List

[[LLM: (Dev Agent) Anything the SM needs to know that deviated from the story that might impact drafting the next story.]]

### File List

[[LLM: (Dev Agent) List every new file created, or existing file modified in a bullet list.]]

### Change Log

[[LLM: (Dev Agent) Track document versions and changes during development that deviate from story dev start]]

| Date | Version | Description | Author |
| :--- | :------ | :---------- | :----- |

## QA Results

[[LLM: QA Agent Results]]