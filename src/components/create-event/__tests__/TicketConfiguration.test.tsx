import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketConfiguration } from '../TicketConfiguration';

const mockTickets = [
  {
    name: 'General Admission',
    description: 'Standard event access',
    price: 25.0,
    quantity: 100,
    hasEarlyBird: false,
  },
  {
    name: 'VIP',
    description: 'Premium access with perks',
    price: 75.0,
    earlyBirdPrice: 60.0,
    earlyBirdUntil: '2024-12-01T12:00',
    quantity: 50,
    hasEarlyBird: true,
  },
];

const defaultProps = {
  tickets: mockTickets,
  onAddTicketTier: jest.fn(),
  onRemoveTicketTier: jest.fn(),
  onUpdateTicketTier: jest.fn(),
  onNext: jest.fn(),
  onPrevious: jest.fn(),
};

describe('TicketConfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ticket configuration form', () => {
    render(<TicketConfiguration {...defaultProps} />);
    
    expect(screen.getByText('Ticket Configuration')).toBeInTheDocument();
    expect(screen.getByText('Set up your ticket tiers and pricing')).toBeInTheDocument();
    expect(screen.getByText('Ticket Tiers')).toBeInTheDocument();
  });

  it('displays existing tickets with their details', () => {
    render(<TicketConfiguration {...defaultProps} />);
    
    // Check for ticket names
    expect(screen.getByDisplayValue('General Admission')).toBeInTheDocument();
    expect(screen.getByDisplayValue('VIP')).toBeInTheDocument();
    
    // Check for prices
    expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    expect(screen.getByDisplayValue('75')).toBeInTheDocument();
    
    // Check for quantities
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('shows early bird pricing when enabled', () => {
    render(<TicketConfiguration {...defaultProps} />);
    
    // VIP ticket should have early bird pricing enabled
    const earlyBirdSwitches = screen.getAllByText('Enable Early Bird Pricing');
    expect(earlyBirdSwitches).toHaveLength(2);
    
    // Early bird fields should be visible for VIP ticket
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-12-01T12:00')).toBeInTheDocument();
  });

  it('calls onUpdateTicketTier when ticket name is changed', async () => {
    const user = userEvent.setup();
    render(<TicketConfiguration {...defaultProps} />);
    
    const nameInput = screen.getByDisplayValue('General Admission');
    await user.clear(nameInput);
    await user.type(nameInput, 'Standard Ticket');
    
    expect(defaultProps.onUpdateTicketTier).toHaveBeenCalledWith(0, 'name', 'Standard Ticket');
  });

  it('calls onUpdateTicketTier when price is changed', async () => {
    const user = userEvent.setup();
    render(<TicketConfiguration {...defaultProps} />);
    
    const priceInput = screen.getByDisplayValue('25');
    await user.clear(priceInput);
    await user.type(priceInput, '30');
    
    expect(defaultProps.onUpdateTicketTier).toHaveBeenCalledWith(0, 'price', 30);
  });

  it('calls onUpdateTicketTier when early bird is toggled', async () => {
    const user = userEvent.setup();
    render(<TicketConfiguration {...defaultProps} />);
    
    // Find the first early bird switch (for General Admission)
    const earlyBirdSwitches = screen.getAllByRole('switch');
    await user.click(earlyBirdSwitches[0]);
    
    expect(defaultProps.onUpdateTicketTier).toHaveBeenCalledWith(0, 'hasEarlyBird', true);
  });

  it('calls onAddTicketTier when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<TicketConfiguration {...defaultProps} />);
    
    const addButton = screen.getByText('Add Ticket Tier');
    await user.click(addButton);
    
    expect(defaultProps.onAddTicketTier).toHaveBeenCalled();
  });

  it('calls onRemoveTicketTier when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<TicketConfiguration {...defaultProps} />);
    
    const removeButtons = screen.getAllByText('Remove');
    await user.click(removeButtons[0]);
    
    expect(defaultProps.onRemoveTicketTier).toHaveBeenCalledWith(0);
  });

  it('validates required fields and shows errors', () => {
    const invalidTickets = [
      {
        name: '',
        price: 0,
        quantity: 0,
        hasEarlyBird: false,
      },
    ];

    render(<TicketConfiguration {...defaultProps} tickets={invalidTickets} />);
    
    expect(screen.getByText(/Name is required/)).toBeInTheDocument();
    expect(screen.getByText(/Price must be greater than 0/)).toBeInTheDocument();
    expect(screen.getByText(/Quantity must be greater than 0/)).toBeInTheDocument();
  });

  it('validates early bird pricing when enabled', () => {
    const invalidEarlyBirdTickets = [
      {
        name: 'Test Ticket',
        price: 50,
        quantity: 100,
        hasEarlyBird: true,
        earlyBirdPrice: 0,
        earlyBirdUntil: '',
      },
    ];

    render(<TicketConfiguration {...defaultProps} tickets={invalidEarlyBirdTickets} />);
    
    expect(screen.getByText(/Early bird price is required/)).toBeInTheDocument();
    expect(screen.getByText(/Early bird end date is required/)).toBeInTheDocument();
  });

  it('shows warning when early bird price is not less than regular price', () => {
    const warningTickets = [
      {
        name: 'Test Ticket',
        price: 50,
        quantity: 100,
        hasEarlyBird: true,
        earlyBirdPrice: 60,
        earlyBirdUntil: '2024-12-01T12:00',
      },
    ];

    render(<TicketConfiguration {...defaultProps} tickets={warningTickets} />);
    
    expect(screen.getByText(/Early bird price should be less than regular price/)).toBeInTheDocument();
  });

  it('disables continue button when validation fails', () => {
    const invalidTickets = [
      {
        name: '',
        price: 0,
        quantity: 0,
        hasEarlyBird: false,
      },
    ];

    render(<TicketConfiguration {...defaultProps} tickets={invalidTickets} />);
    
    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeDisabled();
  });

  it('enables continue button when validation passes', () => {
    render(<TicketConfiguration {...defaultProps} />);
    
    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeEnabled();
  });

  it('calls onNext when continue button is clicked with valid data', async () => {
    const user = userEvent.setup();
    render(<TicketConfiguration {...defaultProps} />);
    
    const continueButton = screen.getByText('Continue');
    await user.click(continueButton);
    
    expect(defaultProps.onNext).toHaveBeenCalled();
  });

  it('calls onPrevious when back button is clicked', async () => {
    const user = userEvent.setup();
    render(<TicketConfiguration {...defaultProps} />);
    
    const backButton = screen.getByText('Back');
    await user.click(backButton);
    
    expect(defaultProps.onPrevious).toHaveBeenCalled();
  });

  it('does not show remove button when only one ticket exists', () => {
    const singleTicket = [mockTickets[0]];
    render(<TicketConfiguration {...defaultProps} tickets={singleTicket} />);
    
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('shows remove buttons when multiple tickets exist', () => {
    render(<TicketConfiguration {...defaultProps} />);
    
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons).toHaveLength(2);
  });
});