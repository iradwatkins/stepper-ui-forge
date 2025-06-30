# Story 2.3: Shopping Cart - Brownfield Architecture

## Existing Project Analysis

### Current Architecture Overview
**Project:** Stepper UI Forge - Event Ticketing Platform  
**Architecture Pattern:** BaaS-first with Supabase + React Vite Frontend  
**Repository Structure:** Single monorepo (aligned with current stage)  
**Tech Stack Compliance:** ✅ Fully aligned with technical preferences

### Existing Project Technology Stack
- **Frontend**: React 18 + TypeScript + Vite (SWC compilation)
- **Styling**: Tailwind CSS + shadcn/ui + Lucide React icons
- **State Management**: React Query (server state) + React Hook Form (forms) + Context API (client state)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Utilities**: Zod, clsx, date-fns, CVA (class-variance-authority)

### Current Component Architecture
```
src/
├── components/
│   ├── CheckoutModal.tsx           # Single-item checkout (ENHANCE)
│   ├── Navbar.tsx                  # Navigation (MODIFY for cart icon)
│   ├── ticketing/                  # Epic 2.0 components (LEVERAGE)
│   │   ├── TicketSelector.tsx      # Public ticket selection
│   │   ├── TicketCard.tsx          # Individual ticket display
│   │   ├── QuantitySelector.tsx    # Quantity selection
│   │   └── PriceCalculator.tsx     # Real-time pricing
│   └── create-event/               # Event creation wizard (PRESERVE)
├── hooks/
│   ├── useEventData.ts             # Event data management (LEVERAGE)
│   └── useWizardNavigation.ts      # Wizard state (PRESERVE)
├── contexts/
│   └── AuthContext.tsx             # Authentication (LEVERAGE)
└── pages/
    ├── EventDetail.tsx             # Public event page (ENHANCE)
    └── CreateEvent.tsx             # Event creation (PRESERVE)
```

## Enhancement Scope and Integration Strategy

### Story 2.3 Architecture Objectives
Transform single-item checkout into comprehensive shopping cart system while:
- **Preserving**: All Epic 1.0 simple event functionality
- **Enhancing**: Epic 2.0 ticketing components with cart capabilities
- **Maintaining**: Technical preferences and established patterns
- **Optimizing**: Mobile-first user experience

### Mobile-First Architecture Principles
- **Touch-Optimized Components**: Large interactive areas (44px+ tap targets)
- **Progressive Enhancement**: Basic functionality first, enhanced features for capable devices
- **Responsive State Management**: Efficient re-renders for mobile performance
- **Offline Resilience**: Cart state persistence during network interruption

## Code Integration Strategy

### Phase 1: Cart Foundation Architecture

#### 1.1 Cart Context Implementation
**File**: `/src/contexts/CartContext.tsx`
```typescript
// Leverage existing Context API pattern (technical preference)
interface CartItem {
  ticketTypeId: string;
  eventId: string;
  quantity: number;
  price: number;
  title: string;
  eventTitle: string;
  earlyBirdPrice?: number;
  earlyBirdUntil?: string;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  fees: number;
  total: number;
}

// React Context + useReducer for predictable state updates
// localStorage integration for persistence (technical preference)
```

#### 1.2 Cart Persistence Strategy
**Implementation**: Custom hook leveraging existing patterns
```typescript
// File: /src/hooks/useCartPersistence.ts
// Pattern: Follow useEventData.ts structure
// Storage: localStorage with Zod validation
// Hydration: useEffect with error boundary
```

#### 1.3 Cart State Management Integration
- **Server State**: Extend React Query patterns for inventory validation
- **Client State**: Context API for cart operations (aligned with preferences)
- **Form State**: React Hook Form for checkout (maintain consistency)

### Phase 2: Component Enhancement Architecture

#### 2.1 Navbar Enhancement
**File**: `/src/components/Navbar.tsx` (MODIFY)
```typescript
// Add cart icon with badge (Lucide React - technical preference)
// Maintain existing responsive design patterns
// Integrate with CartContext for item count
```

#### 2.2 Cart Drawer Component
**File**: `/src/components/cart/CartDrawer.tsx` (CREATE)
```typescript
// shadcn/ui Sheet component (technical preference)
// Mobile-first slide-out panel
// Touch-friendly item modification controls
// Real-time price calculations
```

#### 2.3 Enhanced EventDetail Integration
**File**: `/src/pages/EventDetail.tsx` (ENHANCE)
```typescript
// Integrate add-to-cart functionality with existing TicketSelector
// Maintain backward compatibility with single-item flow
// Leverage existing ticketing components
```

#### 2.4 Multi-Item Checkout Enhancement
**File**: `/src/components/CheckoutModal.tsx` (ENHANCE)
```typescript
// Extend existing modal for multiple items
// Preserve single-item fallback functionality
// Maintain existing payment gateway integration
// Follow established form patterns with React Hook Form
```

## Database Integration

### Current Database Schema (PRESERVE)
```sql
-- Existing tables maintained for backward compatibility
events
├── id, title, description, date, time, location
├── event_type (simple, ticketed, premium)
└── created_by (user_id)

ticket_types
├── id, event_id, name, description, price
├── quantity_available, quantity_sold
├── early_bird_price, early_bird_until
└── is_active
```

### No Schema Changes Required
- **Cart State**: Managed client-side with localStorage persistence
- **Order Processing**: Leverage existing ticket purchase flow
- **Inventory Validation**: Use existing ticket_types real-time queries
- **User Sessions**: Utilize Supabase Auth (existing pattern)

### Data Flow Architecture
```
EventDetail → TicketSelector → Add to Cart → CartContext
                    ↓
localStorage ← Cart State → CartDrawer → Checkout
                    ↓
CheckoutModal → Payment Processing → Supabase Orders
```

## API Integration

### Existing API Patterns (LEVERAGE)
- **Supabase Client**: `/src/integrations/supabase/client.ts`
- **React Query**: Server state management for tickets and events
- **Type Safety**: Existing TypeScript interfaces in `/src/types/`

### New API Requirements (MINIMAL)
```typescript
// Extend existing patterns, no new endpoints needed
// Leverage React Query for:
// - Real-time inventory checking
// - Batch ticket validation
// - Order processing with existing payment gateways
```

## UI Integration

### Existing UI Component Library (LEVERAGE)
- **shadcn/ui**: Maintain consistency with existing components
- **Tailwind CSS**: Follow established utility patterns
- **Responsive Design**: Extend existing mobile-first breakpoints
- **Theme Support**: Integrate with existing theme system

### New UI Components Architecture
```
src/components/cart/
├── CartContext.tsx          # State management
├── CartDrawer.tsx           # Main cart interface
├── CartIcon.tsx             # Navbar cart badge
├── CartItem.tsx             # Individual cart item
├── CartSummary.tsx          # Price calculation display
└── AddToCartButton.tsx      # Event detail integration
```

### Mobile-First Component Design
- **Touch Targets**: Minimum 44px (technical preference)
- **Responsive Breakpoints**: Follow existing Tailwind patterns
- **Accessibility**: ARIA compliance with existing patterns
- **Performance**: Optimized re-renders with React.memo

## State Management Architecture

### Client State Strategy (Context API)
```typescript
// Aligned with technical preferences
CartContext
├── State: items[], totals, UI state
├── Actions: add, remove, update, clear
├── Persistence: localStorage integration
└── Validation: Zod schemas
```

### Server State Integration (React Query)
```typescript
// Leverage existing patterns
useTicketInventory()     # Real-time availability
useEventDetails()        # Event information
useProcessPayment()      # Checkout processing
```

### Form State Management (React Hook Form)
```typescript
// Maintain consistency with existing forms
CheckoutForm
├── Multi-item order data
├── Customer information
├── Payment method selection
└── Validation with Zod
```

## Performance Optimization

### Mobile Performance Strategy
- **Lazy Loading**: Cart drawer loaded on first interaction
- **Optimistic Updates**: Immediate UI feedback for cart operations
- **Debounced Operations**: Quantity changes and localStorage updates
- **Efficient Re-renders**: React.memo and useMemo optimization

### Bundle Size Management
```typescript
// Code splitting for cart functionality
const CartDrawer = lazy(() => import('./cart/CartDrawer'));
// Maintain existing Vite code splitting patterns
```

## Security Implementation

### Cart Security Measures
- **Client-Side Validation**: Zod schemas for cart data
- **Server-Side Validation**: Inventory checks before payment
- **XSS Prevention**: Sanitized cart item data
- **localStorage Security**: Encrypted sensitive data if needed

### Payment Security (EXISTING)
- **Supabase Auth**: User session management
- **Payment Gateways**: PayPal, Square, Cash App (already integrated)
- **PCI Compliance**: Handled by payment providers

## Testing Strategy

### Unit Testing (Vitest + React Testing Library)
```typescript
// Follow existing test patterns
CartContext.test.tsx         # State management
CartDrawer.test.tsx          # Component behavior
useCartPersistence.test.tsx  # Hook functionality
```

### Integration Testing
```typescript
// Test cart-to-checkout flow
// Multi-item purchase scenarios
// Mobile interaction patterns
```

### E2E Testing Scenarios
- Add multiple items to cart
- Modify cart contents
- Complete multi-item purchase
- Cart persistence across sessions

## Deployment and CI/CD

### Current Deployment (MAINTAIN)
- **Frontend**: Vite build process
- **Backend**: Supabase managed
- **CI/CD**: GitHub Actions (technical preference)
- **Hosting**: Vercel/Netlify compatible

### No Infrastructure Changes
- Leverage existing deployment pipeline
- Maintain current build optimization
- No additional backend services required

## Risk Mitigation

### Low Risk (Existing Foundation)
- ✅ Established technical stack
- ✅ Proven payment integrations
- ✅ Existing UI component library

### Medium Risk (State Complexity)
- 🔄 Multi-component cart state synchronization
- 🔄 localStorage persistence edge cases
- 🔄 Mobile performance with larger cart state

### Mitigation Strategies
```typescript
// Error Boundaries for cart operations
<CartErrorBoundary>
  <CartDrawer />
</CartErrorBoundary>

// Fallback to single-item checkout
if (cartError) {
  return <SingleItemCheckout />;
}

// Progressive enhancement approach
const hasAdvancedFeatures = () => {
  return 'localStorage' in window && window.innerWidth > 768;
};
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- CartContext implementation
- localStorage persistence
- Basic add-to-cart functionality

### Phase 2: Interface (Week 2)
- CartDrawer component
- Navbar cart icon integration
- Item modification capabilities

### Phase 3: Checkout Enhancement (Week 3)
- Multi-item checkout flow
- Enhanced order processing
- Payment gateway integration

### Phase 4: Polish & Optimization (Week 4)
- Mobile interaction refinements
- Performance optimization
- Comprehensive testing

## Monitoring and Analytics

### Performance Monitoring
```typescript
// Leverage existing monitoring patterns
// Cart operation timing
// localStorage performance
// Checkout completion rates
```

### User Experience Metrics
- Cart abandonment rates
- Mobile vs desktop usage patterns
- Multi-item vs single-item purchases
- Time to checkout completion

## Backward Compatibility Matrix

| Component | Epic 1.0 | Epic 2.0 Stories 2.1-2.2 | Story 2.3 |
|-----------|----------|---------------------------|-----------|
| Simple Events | ✅ Preserved | ✅ Compatible | ✅ No Changes |
| Event Creation | ✅ Preserved | ✅ Enhanced | ✅ No Changes |
| Ticket Config | N/A | ✅ Implemented | ✅ Leveraged |
| Public Selection | N/A | ✅ Implemented | ✅ Enhanced |
| Single Checkout | ✅ Basic | ✅ Enhanced | ✅ Fallback |
| Multi Checkout | N/A | N/A | ✅ New Feature |

---

**Architecture Status**: Ready for PO Validation  
**Next Step**: Product Owner Review and Approval  
**Technical Alignment**: ✅ 100% compliant with technical preferences  
**Epic Context**: Epic 2.0 - Advanced Ticketing & Payment System