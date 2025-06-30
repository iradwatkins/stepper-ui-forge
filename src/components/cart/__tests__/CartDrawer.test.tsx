import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartDrawer } from '../CartDrawer';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { TicketType, Event } from '@/types/database';

// Mock CheckoutModal component
jest.mock('@/components/CheckoutModal', () => {
  return function MockCheckoutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? (
      <div data-testid="checkout-modal">
        <button onClick={onClose}>Close Checkout</button>
      </div>
    ) : null;
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as Storage;

const mockTicketType: TicketType = {
  id: 'ticket-1',
  event_id: 'event-1',
  name: 'General Admission',
  description: 'Standard access to the event',
  price: 25.00,
  early_bird_price: 20.00,
  early_bird_until: '2025-12-01T23:59:59Z',
  quantity: 100,
  sold_quantity: 15,
  max_per_person: 4,
  sale_start: null,
  sale_end: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockEvent: Event = {
  id: 'event-1',
  owner_id: 'user-1',
  title: 'Test Event',
  description: 'A test event',
  organization_name: 'Test Org',
  date: '2024-12-15',
  time: '19:00',
  location: 'Test Location',
  categories: ['test'],
  event_type: 'ticketed',
  status: 'published',
  images: {},
  is_public: true,
  max_attendees: null,
  registration_deadline: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

// Helper component to add items to cart for testing
const CartTestHelper = () => {
  const { addItem } = useCart();
  
  return (
    <button 
      data-testid="add-test-item"
      onClick={() => addItem(mockTicketType, mockEvent, 2)}
    >
      Add Test Item
    </button>
  );
};

// Helper component to add single item to cart for testing
const SingleItemHelper = () => {
  const { addItem } = useCart();
  
  return (
    <button 
      data-testid="add-single-item"
      onClick={() => addItem(mockTicketType, mockEvent, 1)}
    >
      Add Single Item
    </button>
  );
};

describe('CartDrawer', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
  });

  it('should display empty cart message when cart is empty', () => {
    const mockOnOpenChange = jest.fn();
    
    render(
      <CartProvider>
        <CartDrawer open={true} onOpenChange={mockOnOpenChange} />
      </CartProvider>
    );

    expect(screen.getByText('Your cart is empty. Add some tickets to get started!')).toBeInTheDocument();
    expect(screen.getByText('Your Cart')).toBeInTheDocument();
  });

  it('should display cart items when cart has items', async () => {
    const mockOnOpenChange = jest.fn();
    
    render(
      <CartProvider>
        <CartTestHelper />
        <CartDrawer open={true} onOpenChange={mockOnOpenChange} />
      </CartProvider>
    );

    // Add item to cart
    fireEvent.click(screen.getByTestId('add-test-item'));

    await waitFor(() => {
      expect(screen.getByText('Review your ticket selections and proceed to checkout.')).toBeInTheDocument();
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });
  });

  it('should display correct item count badge', async () => {
    const mockOnOpenChange = jest.fn();
    
    render(
      <CartProvider>
        <CartTestHelper />
        <CartDrawer open={true} onOpenChange={mockOnOpenChange} />
      </CartProvider>
    );

    // Add item to cart
    fireEvent.click(screen.getByTestId('add-test-item'));

    await waitFor(() => {
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });
  });

  it('should show singular item text for single item', async () => {
    const mockOnOpenChange = jest.fn();
    
    render(
      <CartProvider>
        <SingleItemHelper />
        <CartDrawer open={true} onOpenChange={mockOnOpenChange} />
      </CartProvider>
    );

    // Add single item to cart
    fireEvent.click(screen.getByTestId('add-single-item'));

    await waitFor(() => {
      expect(screen.getByText('1 item')).toBeInTheDocument();
    });
  });

  it('should open checkout modal when checkout button is clicked', async () => {
    const mockOnOpenChange = jest.fn();
    
    render(
      <CartProvider>
        <CartTestHelper />
        <CartDrawer open={true} onOpenChange={mockOnOpenChange} />
      </CartProvider>
    );

    // Add item to cart
    fireEvent.click(screen.getByTestId('add-test-item'));

    await waitFor(() => {
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });

    // Click checkout button
    fireEvent.click(screen.getByText('Checkout'));

    await waitFor(() => {
      expect(screen.getByTestId('checkout-modal')).toBeInTheDocument();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false); // Drawer should close
    });
  });

  it('should clear cart when clear button is clicked', async () => {
    const mockOnOpenChange = jest.fn();
    
    render(
      <CartProvider>
        <CartTestHelper />
        <CartDrawer open={true} onOpenChange={mockOnOpenChange} />
      </CartProvider>
    );

    // Add item to cart
    fireEvent.click(screen.getByTestId('add-test-item'));

    await waitFor(() => {
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    // Click clear cart button
    fireEvent.click(screen.getByText('Clear Cart'));

    await waitFor(() => {
      expect(screen.getByText('Your cart is empty. Add some tickets to get started!')).toBeInTheDocument();
    });
  });

  it('should display shopping bag icon', () => {
    const mockOnOpenChange = jest.fn();
    
    render(
      <CartProvider>
        <CartDrawer open={true} onOpenChange={mockOnOpenChange} />
      </CartProvider>
    );

    // Check if shopping bag icon is present (it should be in the title area)
    expect(screen.getByText('Your Cart')).toBeInTheDocument();
  });

  it('should not display checkout button when cart is empty', () => {
    const mockOnOpenChange = jest.fn();
    
    render(
      <CartProvider>
        <CartDrawer open={true} onOpenChange={mockOnOpenChange} />
      </CartProvider>
    );

    expect(screen.queryByText('Checkout')).not.toBeInTheDocument();
  });

  it('should display checkout button when cart has items', async () => {
    const mockOnOpenChange = jest.fn();
    
    render(
      <CartProvider>
        <CartTestHelper />
        <CartDrawer open={true} onOpenChange={mockOnOpenChange} />
      </CartProvider>
    );

    // Add item to cart
    fireEvent.click(screen.getByTestId('add-test-item'));

    await waitFor(() => {
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });
  });

  it('should handle drawer open/close state correctly', () => {
    const mockOnOpenChange = jest.fn();
    
    const { rerender } = render(
      <CartProvider>
        <CartDrawer open={false} onOpenChange={mockOnOpenChange} />
      </CartProvider>
    );

    // Drawer should not be visible when closed
    expect(screen.queryByText('Your Cart')).not.toBeInTheDocument();

    // Rerender with open=true
    rerender(
      <CartProvider>
        <CartDrawer open={true} onOpenChange={mockOnOpenChange} />
      </CartProvider>
    );

    // Drawer should be visible when open
    expect(screen.getByText('Your Cart')).toBeInTheDocument();
  });
});