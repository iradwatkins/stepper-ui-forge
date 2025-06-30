import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';
import { TicketType, Event } from '@/types/database';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as Storage;

// Test component to access cart context
const TestComponent = () => {
  const cart = useCart();
  
  return (
    <div>
      <div data-testid="total-items">{cart.totalItems}</div>
      <div data-testid="subtotal">{cart.subtotal}</div>
      <div data-testid="fees">{cart.fees}</div>
      <div data-testid="total">{cart.total}</div>
      <div data-testid="items-count">{cart.items.length}</div>
      <button 
        data-testid="add-item" 
        onClick={() => cart.addItem(mockTicketType, mockEvent, 2)}
      >
        Add Item
      </button>
      <button 
        data-testid="remove-item" 
        onClick={() => cart.items.length > 0 && cart.removeItem(cart.items[0].id)}
      >
        Remove Item
      </button>
      <button 
        data-testid="update-quantity" 
        onClick={() => cart.items.length > 0 && cart.updateQuantity(cart.items[0].id, 3)}
      >
        Update Quantity
      </button>
      <button data-testid="clear-cart" onClick={() => cart.clearCart()}>
        Clear Cart
      </button>
      <div data-testid="is-in-cart">{cart.isInCart('ticket-1').toString()}</div>
      <div data-testid="item-quantity">{cart.getItemQuantity('ticket-1')}</div>
    </div>
  );
};

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

describe('CartContext', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  it('should provide initial empty cart state', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('total-items')).toHaveTextContent('0');
    expect(screen.getByTestId('subtotal')).toHaveTextContent('0');
    expect(screen.getByTestId('fees')).toHaveTextContent('0');
    expect(screen.getByTestId('total')).toHaveTextContent('0');
    expect(screen.getByTestId('items-count')).toHaveTextContent('0');
  });

  it('should add items to cart correctly', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByTestId('add-item'));

    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('2');
      expect(screen.getByTestId('items-count')).toHaveTextContent('1');
      expect(screen.getByTestId('is-in-cart')).toHaveTextContent('true');
      expect(screen.getByTestId('item-quantity')).toHaveTextContent('2');
    });

    // Check if early bird price is used (20.00 instead of 25.00)
    const expectedSubtotal = 20.00 * 2; // 40.00
    const expectedFees = expectedSubtotal * 0.03; // 1.20
    const expectedTotal = expectedSubtotal + expectedFees; // 41.20

    expect(screen.getByTestId('subtotal')).toHaveTextContent(expectedSubtotal.toString());
    expect(screen.getByTestId('fees')).toHaveTextContent(expectedFees.toString());
    expect(screen.getByTestId('total')).toHaveTextContent(expectedTotal.toString());
  });

  it('should update existing item quantity when adding same ticket type', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    // Add item twice
    fireEvent.click(screen.getByTestId('add-item'));
    fireEvent.click(screen.getByTestId('add-item'));

    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('4');
      expect(screen.getByTestId('items-count')).toHaveTextContent('1'); // Still one unique item
      expect(screen.getByTestId('item-quantity')).toHaveTextContent('4');
    });
  });

  it('should respect max_per_person limit', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    // Add item multiple times (should cap at max_per_person = 4)
    fireEvent.click(screen.getByTestId('add-item')); // 2 tickets
    fireEvent.click(screen.getByTestId('add-item')); // 4 tickets (capped)
    fireEvent.click(screen.getByTestId('add-item')); // Still 4 tickets

    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('4');
      expect(screen.getByTestId('item-quantity')).toHaveTextContent('4');
    });
  });

  it('should remove items from cart correctly', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    // Add then remove item
    fireEvent.click(screen.getByTestId('add-item'));
    
    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('2');
    });

    fireEvent.click(screen.getByTestId('remove-item'));

    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('0');
      expect(screen.getByTestId('items-count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-in-cart')).toHaveTextContent('false');
    });
  });

  it('should update item quantity correctly', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    // Add item then update quantity
    fireEvent.click(screen.getByTestId('add-item'));
    
    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('2');
    });

    fireEvent.click(screen.getByTestId('update-quantity'));

    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('3');
      expect(screen.getByTestId('item-quantity')).toHaveTextContent('3');
    });
  });

  it('should clear cart correctly', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    // Add item then clear cart
    fireEvent.click(screen.getByTestId('add-item'));
    
    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('2');
    });

    fireEvent.click(screen.getByTestId('clear-cart'));

    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('0');
      expect(screen.getByTestId('items-count')).toHaveTextContent('0');
    });
  });

  it('should persist cart to localStorage', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByTestId('add-item'));

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stepper-cart-items',
        expect.stringContaining('ticket-1')
      );
    });
  });

  it('should hydrate cart from localStorage on mount', () => {
    const savedCart = JSON.stringify([{
      id: 'cart-item-1',
      ticketTypeId: 'ticket-1',
      eventId: 'event-1',
      quantity: 1,
      price: 25.00,
      title: 'General Admission',
      eventTitle: 'Test Event',
      eventDate: '2024-12-15',
      eventTime: '19:00',
      maxPerPerson: 4
    }]);
    
    localStorageMock.getItem.mockReturnValue(savedCart);
    
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('total-items')).toHaveTextContent('1');
    expect(screen.getByTestId('items-count')).toHaveTextContent('1');
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    // Should not throw error
    expect(() => {
      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );
    }).not.toThrow();

    expect(screen.getByTestId('total-items')).toHaveTextContent('0');
  });

  it('should throw error when useCart is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useCart must be used within a CartProvider');

    console.error = originalError;
  });
});