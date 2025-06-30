# Story 2.9: Physical Cash Payment & Reconciliation System

## Status: In Progress

## Story

- As an event organizer/reseller accepting physical cash payments
- I want to process ticket sales where customers pay cash in person
- so that I can sell tickets offline while maintaining accurate revenue reconciliation with online processing fees

## Acceptance Criteria (ACs)

1. "Cash (In-Person)" payment option appears in checkout flow alongside digital payment methods
2. Cash orders are created with "awaiting_cash_payment" status and generate verification codes
3. Reseller/organizer dashboard allows marking cash payments as received with verification code entry
4. Service fee reconciliation system tracks fees owed and deducts from future online payments
5. Verification codes are unique, time-limited, and secure against tampering
6. Cash payment confirmation triggers ticket generation and email delivery
7. Revenue reconciliation dashboard shows cash vs. online payment balance for organizers

## Tasks / Subtasks

- [ ] Task 1: Add Physical Cash Payment Option to Checkout (AC: 1)
  - [ ] Add "Cash (In-Person)" to CheckoutModal payment method selection
  - [ ] Create cash payment flow that generates verification codes instead of processing payment
  - [ ] Display verification code to customer for cash collection
  - [ ] Update checkout UI to handle pending cash payment state
- [ ] Task 2: Implement Cash Payment Order States (AC: 2, 6)
  - [ ] Add "awaiting_cash_payment" and "cash_confirmed" to order status enum
  - [ ] Create CashPaymentService for verification code generation and validation
  - [ ] Modify OrderService to handle cash payment order creation
  - [ ] Implement cash payment confirmation workflow that triggers ticket generation
- [ ] Task 3: Build Cash Payment Verification System (AC: 5)
  - [ ] Create verification code generation with time limits (24-48 hours)
  - [ ] Implement secure hashing to prevent code tampering
  - [ ] Add verification code validation and expiration handling
  - [ ] Create API endpoints for code verification and payment confirmation
- [ ] Task 4: Create Reseller/Organizer Dashboard (AC: 3)
  - [ ] Build CashPaymentDashboard component for pending cash orders
  - [ ] Add verification code entry and validation interface
  - [ ] Implement one-click cash payment confirmation
  - [ ] Add order search and filtering by verification code
- [ ] Task 5: Implement Service Fee Reconciliation (AC: 4, 7)
  - [ ] Create FeeReconciliationService to track cash payment fees
  - [ ] Modify PaymentService to deduct accumulated fees from online payments
  - [ ] Add reconciliation dashboard showing fee balance per organizer
  - [ ] Implement automatic fee deduction from future credit card transactions
- [ ] Task 6: Testing and Integration (AC: All)
  - [ ] Write unit tests for CashPaymentService and verification system
  - [ ] Create integration tests for complete cash payment workflow
  - [ ] Test fee reconciliation across multiple payment types
  - [ ] End-to-end test from cash order creation to ticket delivery

## Dev Notes

### Story Context

**Physical Cash Payment Workflow:**
1. Customer clicks organizer's marketing link/QR code
2. Customer selects tickets and chooses "Cash (In-Person)" payment
3. System creates order with "awaiting_cash_payment" status
4. Customer receives verification code (displayed + emailed)
5. Customer pays cash to reseller/organizer and provides verification code
6. Reseller enters verification code in dashboard and confirms cash received
7. System generates tickets and sends confirmation email to customer
8. Service fees from cash sale are tracked for deduction from future online payments

**Key Technical Requirements:**
- Cash orders must integrate with existing ticket generation system
- Verification codes should be unique, secure, and time-limited
- Fee reconciliation must work across multiple payment gateways
- Dashboard must be accessible to organizers with appropriate permissions
- System must handle cash payment refunds and cancellations

**Integration Points:**
- CheckoutModal.tsx - Add cash payment option
- OrderService.ts - Handle cash payment order states
- TicketService.ts - Generate tickets after cash confirmation
- PaymentService.ts - Integrate fee reconciliation

**Database Schema Requirements:**
```sql
-- Add new order statuses
ALTER TYPE order_status ADD VALUE 'awaiting_cash_payment';
ALTER TYPE order_status ADD VALUE 'cash_confirmed';

-- Cash payment verification codes table
CREATE TABLE cash_payment_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  verification_code VARCHAR(12) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fee reconciliation tracking
CREATE TABLE fee_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES profiles(id),
  cash_fees_owed DECIMAL(10,2) DEFAULT 0,
  fees_deducted DECIMAL(10,2) DEFAULT 0,
  last_reconciliation_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Testing

Dev Note: Story Requires the following tests:

- [ ] Jest Unit Tests: CashPaymentService, verification code generation, fee reconciliation
- [ ] Jest Integration Tests: Complete cash payment workflow, cross-gateway fee deduction
- [ ] Cypress E2E Tests: End-to-end cash payment from checkout to ticket delivery

Manual Test Steps:
- Complete cash order through checkout flow
- Verify verification code generation and time limits
- Test organizer dashboard cash confirmation workflow
- Verify ticket generation after cash confirmation
- Test fee reconciliation across multiple payment types

## Dev Agent Record

### Agent Model Used: Claude Sonnet 4 (claude-sonnet-4-20250514)

### Debug Log References

[[LLM: (Dev Agent) If the debug is logged to during the current story progress, create a table with the debug log and the specific task section in the debug log - do not repeat all the details in the story]]

### Completion Notes List

### File List

**Files to be Created:**
- `/src/lib/services/CashPaymentService.ts` - Cash payment verification and reconciliation
- `/src/lib/services/FeeReconciliationService.ts` - Service fee tracking and deduction
- `/src/components/cash/CashPaymentDashboard.tsx` - Organizer dashboard for cash confirmation
- `/src/components/cash/VerificationCodeDisplay.tsx` - Display verification code to customers
- `/src/pages/CashPaymentDashboard.tsx` - Dashboard page for organizers

**Files to be Modified:**
- `/src/components/CheckoutModal.tsx` - Add cash payment option
- `/src/lib/services/OrderService.ts` - Handle cash payment order states
- `/src/lib/services/PaymentService.ts` - Integrate fee reconciliation
- `/supabase/migrations/` - Add database schema for cash payments and fee reconciliation

### Change Log

[[LLM: (Dev Agent) Track document versions and changes during development that deviate from story dev start]]

| Date | Version | Description | Author |
| :--- | :------ | :---------- | :----- |

## QA Results

[[LLM: QA Agent Results]]