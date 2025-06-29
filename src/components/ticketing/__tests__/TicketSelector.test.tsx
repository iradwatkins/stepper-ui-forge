import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketSelector } from '../TicketSelector';
import { TicketType } from '@/types/database';

const mockTicketTypes: TicketType[] = [
  {
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
  },
  {
    id: 'ticket-2',
    event_id: 'event-1',
    name: 'VIP Access',
    description: 'Premium access with special perks',
    price: 75.00,
    early_bird_price: null,
    early_bird_until: null,
    quantity: 50,
    sold_quantity: 48,
    max_per_person: 2,
    sale_start: null,
    sale_end: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'ticket-3',
    event_id: 'event-1',
    name: 'Sold Out',
    description: 'This ticket is sold out',
    price: 50.00,
    early_bird_price: null,
    early_bird_until: null,
    quantity: 10,
    sold_quantity: 10,
    max_per_person: 1,
    sale_start: null,
    sale_end: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const defaultProps = {
  eventId: 'event-1',
  ticketTypes: mockTicketTypes,
  onAddToCart: jest.fn(),
  isLoading: false,
};

describe('TicketSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ticket selector with available tickets', () => {
    render(<TicketSelector {...defaultProps} />);
    
    expect(screen.getByText('Select Tickets')).toBeInTheDocument();
    expect(screen.getByText('Choose your tickets for this event')).toBeInTheDocument();
    expect(screen.getByText('General Admission')).toBeInTheDocument();
    expect(screen.getByText('VIP Access')).toBeInTheDocument();
    expect(screen.queryByText('Sold Out')).not.toBeInTheDocument(); // Should be filtered out
  });

  it('shows loading state', () => {
    render(<TicketSelector {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading tickets...')).toBeInTheDocument();
  });

  it('shows no tickets available message when all sold out', () => {
    const soldOutTickets = mockTicketTypes.map(ticket => ({
      ...ticket,
      sold_quantity: ticket.quantity
    }));
    
    render(<TicketSelector {...defaultProps} ticketTypes={soldOutTickets} />);
    
    expect(screen.getByText('No tickets are currently available for this event.')).toBeInTheDocument();
  });

  it('displays early bird pricing correctly', () => {
    render(<TicketSelector {...defaultProps} />);
    
    expect(screen.getByText('$20.00')).toBeInTheDocument(); // Early bird price
    expect(screen.getByText('Early Bird')).toBeInTheDocument();
  });

  it('shows low stock warning', () => {
    render(<TicketSelector {...defaultProps} />);
    
    expect(screen.getByText('Only 2 left')).toBeInTheDocument(); // VIP has 2 remaining
  });

  it('allows selecting ticket quantities', async () => {
    const user = userEvent.setup();
    render(<TicketSelector {...defaultProps} />);
    
    // Find quantity increment button for General Admission
    const incrementButtons = screen.getAllByLabelText('Increase quantity');
    await user.click(incrementButtons[0]);
    
    // Should show price calculator
    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });
  });

  it('validates maximum quantities', async () => {
    const user = userEvent.setup();
    render(<TicketSelector {...defaultProps} />);
    
    // Try to add more VIP tickets than max per person (2)
    const incrementButtons = screen.getAllByLabelText('Increase quantity');
    const vipIncrement = incrementButtons[1]; // VIP is second ticket
    
    // Add maximum allowed
    await user.click(vipIncrement);
    await user.click(vipIncrement);
    
    // Try to add one more
    await user.click(vipIncrement);
    
    // The quantity should be capped at max_per_person
    const quantityInputs = screen.getAllByLabelText('Quantity');
    expect(quantityInputs[1]).toHaveValue('2');
  });

  it('shows validation errors for invalid selections', async () => {
    const user = userEvent.setup();
    
    // Mock a ticket type with very limited quantity
    const limitedTickets = [
      {
        ...mockTicketTypes[0],
        quantity: 1,
        sold_quantity: 0,
        max_per_person: 5
      }
    ];
    
    render(<TicketSelector {...defaultProps} ticketTypes={limitedTickets} />);
    
    // Try to select more than available
    const quantityInput = screen.getByLabelText('Quantity');
    await user.clear(quantityInput);
    await user.type(quantityInput, '2');
    
    // Click add to cart to trigger validation
    const addToCartButton = screen.getByText(/Add.*to Cart/);
    await user.click(addToCartButton);
    
    expect(screen.getByText(/Only 1.*tickets available/)).toBeInTheDocument();
  });

  it('calls onAddToCart with selected tickets', async () => {
    const user = userEvent.setup();
    const mockOnAddToCart = jest.fn();
    
    render(<TicketSelector {...defaultProps} onAddToCart={mockOnAddToCart} />);
    
    // Select 2 General Admission tickets
    const incrementButtons = screen.getAllByLabelText('Increase quantity');
    await user.click(incrementButtons[0]);
    await user.click(incrementButtons[0]);
    
    // Click add to cart
    const addToCartButton = screen.getByText(/Add.*to Cart/);
    await user.click(addToCartButton);
    
    expect(mockOnAddToCart).toHaveBeenCalledWith([
      {
        ticketTypeId: 'ticket-1',
        quantity: 2,
        ticketType: mockTicketTypes[0]
      }
    ]);
  });

  it('shows price calculation with taxes and fees', async () => {
    const user = userEvent.setup();
    render(<TicketSelector {...defaultProps} />);
    
    // Select 1 General Admission ticket
    const incrementButtons = screen.getAllByLabelText('Increase quantity');
    await user.click(incrementButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText(/Service Fee/)).toBeInTheDocument();
      expect(screen.getByText(/Tax/)).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });

  it('shows early bird savings when applicable', async () => {
    const user = userEvent.setup();
    render(<TicketSelector {...defaultProps} />);
    
    // Select 1 General Admission ticket (has early bird pricing)
    const incrementButtons = screen.getAllByLabelText('Increase quantity');
    await user.click(incrementButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText(/Early Bird Savings/)).toBeInTheDocument();
    });
  });

  it('disables add to cart button when no tickets selected', () => {
    render(<TicketSelector {...defaultProps} />);
    
    expect(screen.queryByText(/Add.*to Cart/)).not.toBeInTheDocument();
  });

  it('updates button text with selected quantity and total', async () => {
    const user = userEvent.setup();
    render(<TicketSelector {...defaultProps} />);
    
    // Select 2 tickets
    const incrementButtons = screen.getAllByLabelText('Increase quantity');
    await user.click(incrementButtons[0]);
    await user.click(incrementButtons[0]);
    
    await waitFor(() => {
      const addToCartButton = screen.getByText(/Add 2 Tickets to Cart/);
      expect(addToCartButton).toBeInTheDocument();
    });
  });
});