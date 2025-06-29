# Services & API Architecture

## Service Architecture Overview

Backend logic is implemented as Supabase Edge Functions and frontend services using the Supabase SDK, following a service-oriented architecture pattern.

## Core Services

### EventService
Manages the 3-tier event system with comprehensive CRUD operations.

**Responsibilities:**
- Event creation, updating, and deletion
- Event type validation and tier-specific logic
- Event publishing and status management
- Event discovery and filtering

**Key Methods:**
```typescript
interface EventService {
  createEvent(eventData: CreateEventRequest): Promise<Event>;
  updateEvent(id: string, updates: UpdateEventRequest): Promise<Event>;
  publishEvent(id: string): Promise<Event>;
  getEvent(id: string): Promise<Event>;
  getEventsByOrganizer(organizerId: string): Promise<Event[]>;
  searchEvents(filters: EventFilters): Promise<Event[]>;
}
```

### PaymentService
Integrates with multiple payment gateways for flexible payment processing.

**Supported Gateways:**
- PayPal (primary)
- Square (backup)
- Stripe (alternative)

**Responsibilities:**
- Payment method management
- Transaction processing
- Webhook handling
- Refund processing
- Payment security and fraud detection

**Key Methods:**
```typescript
interface PaymentService {
  processPayment(order: Order, paymentMethod: PaymentMethod): Promise<PaymentResult>;
  handleWebhook(gateway: string, payload: any): Promise<void>;
  refundPayment(transactionId: string, amount?: number): Promise<RefundResult>;
  validatePaymentMethod(method: PaymentMethod): Promise<boolean>;
}
```

### TicketService
Handles ticket generation, validation, and QR code management.

**Responsibilities:**
- Digital ticket generation
- QR code creation and encryption
- Ticket validation and verification
- Bulk ticket operations
- Ticket transfer and resale

**Key Methods:**
```typescript
interface TicketService {
  generateTickets(orderId: string): Promise<Ticket[]>;
  validateTicket(qrCode: string): Promise<ValidationResult>;
  generateQRCode(ticketId: string): Promise<string>;
  transferTicket(ticketId: string, newOwner: string): Promise<boolean>;
  bulkValidateTickets(qrCodes: string[]): Promise<ValidationResult[]>;
}
```

### SeatingService
Manages interactive seating charts and seat selection.

**Responsibilities:**
- Seating chart upload and processing
- Seat availability management
- Interactive seat selection
- Real-time availability updates
- Best available seat algorithms

**Key Methods:**
```typescript
interface SeatingService {
  uploadSeatingChart(eventId: string, chartData: SeatingChartData): Promise<SeatingChart>;
  getAvailableSeats(eventId: string): Promise<Seat[]>;
  holdSeats(seatIds: string[], holdTime: number): Promise<SeatHold>;
  releaseSeats(holdId: string): Promise<void>;
  getBestAvailableSeats(eventId: string, quantity: number): Promise<Seat[]>;
}
```

### TeamService
Manages team roles, permissions, and collaboration.

**Responsibilities:**
- Team member invitation and onboarding
- Role-based access control
- Permission management
- Team communication
- Activity logging and audit trails

**Key Methods:**
```typescript
interface TeamService {
  inviteTeamMember(eventId: string, email: string, role: Role): Promise<Invitation>;
  assignRole(memberId: string, role: Role): Promise<void>;
  getTeamMembers(eventId: string): Promise<TeamMember[]>;
  checkPermission(userId: string, eventId: string, permission: string): Promise<boolean>;
  logActivity(userId: string, action: string, details: any): Promise<void>;
}
```

### CheckInService
Powers the PWA check-in functionality with offline support.

**Responsibilities:**
- QR code scanning and validation
- Offline check-in capability
- Real-time synchronization
- Check-in statistics and reporting
- Duplicate detection

**Key Methods:**
```typescript
interface CheckInService {
  validateCheckIn(qrCode: string, deviceId: string): Promise<CheckInResult>;
  syncOfflineCheckIns(checkIns: OfflineCheckIn[]): Promise<SyncResult>;
  getCheckInStats(eventId: string): Promise<CheckInStats>;
  exportCheckInData(eventId: string): Promise<CheckInExport>;
}
```

## API Response Format

All API responses follow a consistent structure for predictable client handling:

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}
```

## API Endpoints

### Event Management
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Retrieve event details
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/publish` - Publish event
- `GET /api/events` - List events with filtering

### Ticket Operations
- `POST /api/tickets/types` - Create ticket type
- `GET /api/tickets/types/:eventId` - Get ticket types
- `POST /api/tickets/purchase` - Purchase tickets
- `GET /api/tickets/:orderId` - Get purchased tickets
- `POST /api/tickets/validate` - Validate ticket QR code

### Payment Processing
- `POST /api/payments/process` - Process payment
- `POST /api/payments/webhooks/:gateway` - Payment webhooks
- `POST /api/payments/refund` - Process refund
- `GET /api/payments/:orderId` - Get payment status

### Seating Management
- `POST /api/seating/charts` - Upload seating chart
- `GET /api/seating/seats/:eventId` - Get available seats
- `POST /api/seating/hold` - Hold selected seats
- `DELETE /api/seating/hold/:holdId` - Release held seats

### Team Operations
- `POST /api/team/invite` - Invite team member
- `GET /api/team/:eventId` - Get event team
- `PUT /api/team/:memberId/role` - Update member role
- `DELETE /api/team/:memberId` - Remove team member

### Check-in System
- `POST /api/checkin/validate` - Validate check-in
- `POST /api/checkin/sync` - Sync offline check-ins
- `GET /api/checkin/stats/:eventId` - Get check-in statistics
- `GET /api/checkin/export/:eventId` - Export check-in data

## Real-time Features

### WebSocket Connections
- Seat availability updates
- Check-in status notifications
- Team coordination messages
- Payment confirmation alerts

### Supabase Realtime
```typescript
// Real-time seat availability
supabase
  .channel('seats')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'seats' },
    (payload) => updateSeatAvailability(payload)
  )
  .subscribe();

// Real-time check-ins
supabase
  .channel('checkins')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'check_ins' },
    (payload) => updateCheckInCount(payload)
  )
  .subscribe();
```

## Error Handling Strategy

### Error Types
- `ValidationError` - Input validation failures
- `AuthenticationError` - Authentication required
- `AuthorizationError` - Insufficient permissions
- `NotFoundError` - Resource not found
- `ConflictError` - Resource state conflicts
- `PaymentError` - Payment processing issues
- `ExternalServiceError` - Third-party service failures

### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      validation?: string;
      suggestion?: string;
    };
  };
  timestamp: string;
  requestId: string;
}
```

## Rate Limiting & Security

### Rate Limiting Rules
- Authentication endpoints: 5 requests/minute
- Payment endpoints: 10 requests/minute
- Ticket validation: 100 requests/minute
- General API: 1000 requests/hour

### Security Headers
```typescript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': 'default-src \'self\''
}
```

## Performance Optimization

### Caching Strategy
- API responses cached for 5 minutes
- Static assets cached for 1 year
- Database query results cached in Redis
- CDN caching for global distribution

### Database Optimization
- Connection pooling for concurrent requests
- Query optimization with proper indexing
- Read replicas for high-traffic endpoints
- Automated query performance monitoring